<?php

namespace Modules\AdminAnalytics\app\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\DbDialect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Throwable;

class AnalyticsActivityLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Handle authentication failure for API
     */
    protected function unauthenticated($request, array $guards)
    {
        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated'
        ], 401);
    }

    /**
     * Determine status based on activity data
     */
    private function determineStatus($log): string
    {
        // Keywords that indicate failure
        $failureKeywords = [
            'error', 'failed', 'exception', 'invalid', 'unauthorized',
            'incorrect', 'wrong', 'not found', 'expired', 'locked',
            'blocked', 'rejected', 'denied', 'forbidden', 'bad request',
            'validation failed', 'credentials', 'authenticat', 'unauthorised'
        ];

        // Keywords that indicate pending/in-progress state
        $pendingKeywords = [
            'pending', 'processing', 'waiting', 'verification sent',
            'email sent', 'otp sent', 'check your email'
        ];

        // Check details field
        if ($log->details) {
            $detailsLower = strtolower($log->details);
            
            // Check for failure keywords
            foreach ($failureKeywords as $keyword) {
                if (str_contains($detailsLower, $keyword)) {
                    return 'failed';
                }
            }
            
            // Check for pending keywords
            foreach ($pendingKeywords as $keyword) {
                if (str_contains($detailsLower, $keyword)) {
                    return 'pending';
                }
            }
            
            // Check for JSON details that might contain status
            if (str_starts_with($detailsLower, '{') || str_starts_with($detailsLower, '[')) {
                try {
                    $detailsData = json_decode($log->details, true);
                    if (is_array($detailsData)) {
                        // Check for status field in JSON
                        if (isset($detailsData['status'])) {
                            $status = strtolower($detailsData['status']);
                            if (in_array($status, ['success', 'failed', 'pending'])) {
                                return $status;
                            }
                        }
                        // Check for error field
                        if (isset($detailsData['error']) || isset($detailsData['errors'])) {
                            return 'failed';
                        }
                        // Check for message field
                        if (isset($detailsData['message'])) {
                            $message = strtolower($detailsData['message']);
                            foreach ($failureKeywords as $keyword) {
                                if (str_contains($message, $keyword)) {
                                    return 'failed';
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // Not valid JSON, continue with string checking
                }
            }
        }

        // Check action field
        if ($log->action) {
            $actionLower = strtolower($log->action);
            
            foreach ($failureKeywords as $keyword) {
                if (str_contains($actionLower, $keyword)) {
                    return 'failed';
                }
            }
            
            foreach ($pendingKeywords as $keyword) {
                if (str_contains($actionLower, $keyword)) {
                    return 'pending';
                }
            }
        }

        // Specific logic for login attempts
        if ($log->type === 'login') {
            // Check if this is a failed login
            if ($log->details) {
                $detailsLower = strtolower($log->details);
                if (str_contains($detailsLower, 'invalid credentials') ||
                    str_contains($detailsLower, 'incorrect password') ||
                    str_contains($detailsLower, 'user not found') ||
                    str_contains($detailsLower, 'account locked') ||
                    str_contains($detailsLower, 'too many attempts') ||
                    str_contains($detailsLower, 'unauthorized')) {
                    return 'failed';
                }
            }
            
            if ($log->action) {
                $actionLower = strtolower($log->action);
                if (str_contains($actionLower, 'failed') || 
                    str_contains($actionLower, 'invalid')) {
                    return 'failed';
                }
            }
        }

        // Specific logic for registration
        if ($log->type === 'register') {
            // Check if registration needs verification
            if ($log->details) {
                $detailsLower = strtolower($log->details);
                if (str_contains($detailsLower, 'verification email sent') ||
                    str_contains($detailsLower, 'verify your email') ||
                    str_contains($detailsLower, 'pending verification')) {
                    return 'pending';
                }
                
                if (str_contains($detailsLower, 'failed') ||
                    str_contains($detailsLower, 'already exists') ||
                    str_contains($detailsLower, 'validation error')) {
                    return 'failed';
                }
            }
        }

        // Specific logic for OTP verification
        if ($log->type === 'verify_otp') {
            if ($log->details) {
                $detailsLower = strtolower($log->details);
                if (str_contains($detailsLower, 'invalid otp') ||
                    str_contains($detailsLower, 'expired otp') ||
                    str_contains($detailsLower, 'wrong code')) {
                    return 'failed';
                }
                
                if (str_contains($detailsLower, 'verified') ||
                    str_contains($detailsLower, 'success')) {
                    return 'success';
                }
            }
        }

        // Check for password-related activities
        if ($log->type === 'forget_password') {
            if ($log->details) {
                $detailsLower = strtolower($log->details);
                if (str_contains($detailsLower, 'email sent') ||
                    str_contains($detailsLower, 'reset link sent')) {
                    return 'pending';
                }
                
                if (str_contains($detailsLower, 'failed') ||
                    str_contains($detailsLower, 'not found') ||
                    str_contains($detailsLower, 'invalid email')) {
                    return 'failed';
                }
            }
        }

        // Default to success for most activities
        return 'success';
    }

    /**
     * GET /api/v1/admin/analytics/activity-logs
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $search  = $request->input('search');
            $type    = $request->input('type', 'all');
            $status  = $request->input('status'); // Status filter
            $page    = max(1, (int) $request->input('page', 1));
            $perPage = min(200, max(1, (int) $request->input('per_page', 8)));

            $query = ActivityLog::query();

            if ($search) {
                // details is a JSON column — PostgreSQL needs a ::text cast for LIKE.
                $detailsLike = DbDialect::likeableText('activity_logs.details') . ' LIKE ?';
                $query->where(function ($q) use ($search, $detailsLike) {
                    $q->where('type', 'like', "%{$search}%")
                      ->orWhere('action', 'like', "%{$search}%")
                      ->orWhereRaw($detailsLike, ["%{$search}%"]);
                });
            }

            if ($type !== 'all') {
                $query->where('type', $type);
            }

            $total = $query->count();

            // Get logs with user data
            $logs = $query
                ->leftJoin('users', 'activity_logs.user_id', '=', 'users.id')
                ->select(
                    'activity_logs.id',
                    'activity_logs.type',
                    'activity_logs.action',
                    'activity_logs.related_id',
                    'activity_logs.details',
                    'activity_logs.user_id',
                    'activity_logs.created_at',
                    DB::raw("TRIM(CONCAT(COALESCE(users.first_name,''), ' ', COALESCE(users.last_name,''))) as full_name"),
                    'users.user_name',
                    'users.email',
                    'users.account_type'
                )
                ->orderByDesc('activity_logs.id')
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            // Calculate status for each log and build summary
            $statusCounts = [
                'success' => 0,
                'failed' => 0,
                'pending' => 0
            ];

            $allItems = [];
            foreach ($logs as $log) {
                $status = $this->determineStatus($log);
                $statusCounts[$status]++;

                $allItems[] = [
                    'id'           => $log->id,
                    'user_name'    => trim($log->full_name ?? '') ?: ($log->user_name ?? '—'),
                    'user_id'      => $log->user_id,
                    'email'        => $log->email,
                    'type'         => $log->type,
                    'action'       => $log->action,
                    'related_id'   => $log->related_id,
                    'details'      => $log->details,
                    'description'  => ($log->action ?? '') . ($log->details ? ': ' . $log->details : ''),
                    'time_ago'     => $log->created_at
                        ? Carbon::parse($log->created_at)->diffForHumans()
                        : '—',
                    'account_type' => $log->account_type ?? 'guest',
                    'status'       => $status,
                    'ip_address'   => null,
                ];
            }

            // Apply status filter if provided
            if ($status && $status !== 'all') {
                $filteredItems = array_filter($allItems, fn($item) => $item['status'] === $status);
                $total = count($filteredItems);
                $filteredItems = array_values($filteredItems);
                $paginatedItems = array_slice($filteredItems, 0, $perPage); // Already paginated from DB
            } else {
                $paginatedItems = $allItems;
            }

            // Get total counts for summary (without pagination)
            $totalSuccess = ActivityLog::all()->filter(fn($log) => $this->determineStatus($log) === 'success')->count();
            $totalFailed = ActivityLog::all()->filter(fn($log) => $this->determineStatus($log) === 'failed')->count();
            $totalPending = ActivityLog::all()->filter(fn($log) => $this->determineStatus($log) === 'pending')->count();

            return response()->json([
                'success' => true,
                'data'    => $paginatedItems,
                'pagination' => [
                    'total'        => $total,
                    'per_page'     => $perPage,
                    'current_page' => $page,
                    'last_page'    => max(1, (int) ceil($total / $perPage)),
                ],
                'summary' => [
                    'total'   => ActivityLog::count(),
                    'success' => $totalSuccess,
                    'failed'  => $totalFailed,
                    'pending' => $totalPending,
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsActivityLogController@index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load activity logs.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}