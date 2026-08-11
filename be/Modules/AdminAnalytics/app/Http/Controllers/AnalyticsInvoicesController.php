<?php

namespace Modules\AdminAnalytics\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Invoice\Models\Invoice;
use Carbon\Carbon;
use Throwable;

class AnalyticsInvoicesController extends Controller
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

    private function getHostId(): ?int
    {
        $user = auth()->user();
        if (!$user) {
            return null;
        }
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && !empty($user->active_company_id)
        ) {
            $company = \App\Models\Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        return $user->host_id > 0 ? (int) $user->host_id : null;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $hostId  = $this->getHostId();
            $search  = $request->input('search');
            $status  = $request->input('status');
            $userId  = $request->input('user_id');
            $page    = max(1, (int) $request->input('page', 1));
            $perPage = min(100, max(1, (int) $request->input('per_page', 8)));

            $query = Invoice::with(['client', 'user'])->whereNull('invoices.deleted_at');
            if ($hostId !== null) {
                $query->where('invoices.host_id', $hostId);
            }

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('invoices.code', 'like', "%{$search}%")
                      ->orWhereHas('client', fn($c) => $c->where('name', 'like', "%{$search}%"));
                });
            }
            if ($status && $status !== 'all') {
                $query->where('invoices.status', $status);
            }
            if ($userId && $userId !== 'all') {
                $query->where('invoices.created_by', $userId);
            }

            $total    = $query->count();
            $invoices = $query->orderByDesc('invoices.created_at')
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            $items = $invoices->map(function($inv) {
                // Safely format dates
                $invoiceDate = null;
                if ($inv->invoice_date) {
                    $invoiceDate = $inv->invoice_date instanceof Carbon 
                        ? $inv->invoice_date->format('Y-m-d')
                        : Carbon::parse($inv->invoice_date)->format('Y-m-d');
                } elseif ($inv->created_at) {
                    $invoiceDate = $inv->created_at instanceof Carbon
                        ? $inv->created_at->format('Y-m-d')
                        : Carbon::parse($inv->created_at)->format('Y-m-d');
                }

                $dueDate = null;
                if ($inv->due_date) {
                    $dueDate = $inv->due_date instanceof Carbon
                        ? $inv->due_date->format('Y-m-d')
                        : Carbon::parse($inv->due_date)->format('Y-m-d');
                }

                return [
                    'id'       => (string) $inv->id,
                    'number'   => $inv->code,
                    'client'   => $inv->client?->name ?? '—',
                    'amount'   => (float) $inv->final_amount,
                    'status'   => $inv->status?->value ?? (string) $inv->status,
                    'date'     => $invoiceDate,
                    'dueDate'  => $dueDate,
                    'userId'   => (string) $inv->created_by,
                    'userName' => $inv->user
                        ? trim("{$inv->user->first_name} {$inv->user->last_name}") ?: $inv->user->user_name
                        : '—',
                ];
            });

            $breakdownQ = Invoice::whereNull('deleted_at');
            if ($hostId !== null) {
                $breakdownQ->where('host_id', $hostId);
            }
            if ($userId && $userId !== 'all') {
                $breakdownQ->where('created_by', $userId);
            }
            
            // Fix: Convert status to string for array keys
            $statusBreakdown = [];
            $breakdownResults = $breakdownQ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get();
            
            foreach ($breakdownResults as $row) {
                $status = $row->status?->value ?? (string) $row->status;
                $statusBreakdown[$status] = (int) $row->count;
            }

            $allStatusQ = Invoice::whereNull('deleted_at');
            if ($hostId !== null) {
                $allStatusQ->where('host_id', $hostId);
            }
            
            $allStatuses = [];
            $allStatusResults = $allStatusQ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get();
            
            foreach ($allStatusResults as $row) {
                $status = $row->status?->value ?? (string) $row->status;
                $allStatuses[$status] = (int) $row->count;
            }

            $userStatsQ = Invoice::whereNull('invoices.deleted_at')
                ->join('users', 'invoices.created_by', '=', 'users.id')
                ->selectRaw('
                    users.id as userId,
                    TRIM(CONCAT(COALESCE(users.first_name,"")," ",COALESCE(users.last_name,""))) as userName,
                    users.user_name,
                    COUNT(invoices.id) as invoiceCount,
                    GROUP_CONCAT(invoices.status) as statuses_raw
                ')
                ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.user_name')
                ->orderByDesc('invoiceCount');
            
            if ($hostId !== null) {
                $userStatsQ->where('invoices.host_id', $hostId);
            }

            $userStats = $userStatsQ->get()->map(function ($r) {
                $counts = [];
                if ($r->statuses_raw) {
                    foreach (explode(',', $r->statuses_raw) as $s) {
                        if ($s) {
                            $status = is_object($s) && method_exists($s, 'value') ? $s->value : (string) $s;
                            $counts[$status] = ($counts[$status] ?? 0) + 1;
                        }
                    }
                }
                return [
                    'userId'       => (string) $r->userId,
                    'userName'     => trim($r->userName) ?: $r->user_name,
                    'invoiceCount' => (int) $r->invoiceCount,
                    'statuses'     => $counts,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'invoices'         => $items,
                    'pagination'       => [
                        'total' => $total, 
                        'per_page' => $perPage, 
                        'current_page' => $page, 
                        'last_page' => max(1, (int) ceil($total / $perPage))
                    ],
                    'status_counts'    => $allStatuses,
                    'status_breakdown' => $statusBreakdown,
                    'user_stats'       => $userStats,
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsInvoicesController@index: ' . $e->getMessage());
            return response()->json([
                'success' => false, 
                'message' => 'Failed to load invoices.', 
                'error'   => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}