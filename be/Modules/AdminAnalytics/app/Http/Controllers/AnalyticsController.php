<?php

namespace Modules\AdminAnalytics\app\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Invoice\Models\Invoice;
use Modules\User\Models\User;
use App\Models\ActivityLog;
use Carbon\Carbon;
use Throwable;

class AnalyticsController extends Controller
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

        // Context-first scoping: when company context is active, force selected company host scope.
        if (($user->active_context_type ?? 'personal') === 'company' && !empty($user->active_company_id)) {
            $companyHostId = (int) Company::query()
                ->where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->value('host_id');
            if ($companyHostId > 0) {
                return $companyHostId;
            }
        }

        // Every user (including super-admin) has a dedicated host_id after migration.
        // Return it directly so data is always scoped to the authenticated user's own host.
        return $user->host_id > 0 ? (int) $user->host_id : null;
    }

    /**
     * Apply optional host scoping to a query.
     * If $hostId is null (super-admin) the query is unfiltered.
     */
    private function scopeHost($query, ?int $hostId, string $column = 'host_id')
    {
        if ($hostId !== null) {
            $query->where($column, $hostId);
        }
        return $query;
    }

    public function getDashboard(Request $request): JsonResponse
    {
        try {
            $hostId = $this->getHostId();

            $totalUsers = $this->scopeHost(User::query(), $hostId)->count();

            // Fix DEF_113: Get ALL invoices from ALL users in the same host
            // Use host_id instead of company_id to include all users' invoices
            $totalInvoicesQuery = Invoice::whereNull('deleted_at');
            if ($hostId !== null) {
                $totalInvoicesQuery->where('host_id', $hostId);
            }
            $totalInvoices = $totalInvoicesQuery->count();

            // invoices_clients uses host_id
            $totalClients = $this->scopeHost(
                DB::table('invoices_clients'), $hostId
            )->count();

            // Fix DEF_121: Calculate active/inactive users
            $activeUsersQuery = User::where('is_active', true);
            $inactiveUsersQuery = User::where('is_active', false);
            
            if ($hostId !== null) {
                $activeUsersQuery->where('host_id', $hostId);
                $inactiveUsersQuery->where('host_id', $hostId);
            }
            
            $activeUsers = $activeUsersQuery->count();
            $inactiveUsers = $inactiveUsersQuery->count();

            // Fix DEF_115: Sub-users = all users EXCLUDING the host owner
            // Uses explicit host_role field instead of inferring via account_type
            // host_role: owner | admin | member (extensible enum)
            $subUsersQuery = User::where('host_role', '!=', 'owner');
            if ($hostId !== null) {
                $subUsersQuery->where('host_id', $hostId);
            }
            $totalSubUsers = $subUsersQuery->count();

            $avgInvoicesPerUser = $totalUsers > 0
                ? round($totalInvoices / $totalUsers, 1)
                : 0;

            $monthly                = $this->buildMonthlyTimeseries($hostId);
            $userInvoiceStats       = $this->getUserInvoiceStats($hostId);
            $invoiceStatusBreakdown = $this->getInvoiceStatusBreakdown($hostId);
            $userClientStats        = $this->getUserClientStats($hostId);
            $subUserDistribution    = $this->getSubUserDistribution($hostId);
            $activityStats          = $this->getActivityStats();

            return response()->json([
                'success' => true,
                'data' => [
                    'overview' => [
                        'total_users'           => $totalUsers,
                        'active_users'          => $activeUsers,      // DEF_121
                        'inactive_users'        => $inactiveUsers,    // DEF_121
                        'total_invoices'        => $totalInvoices,
                        'total_clients'         => $totalClients,
                        'sub_users'             => $totalSubUsers,    // DEF_115
                        'avg_invoices_per_user' => $avgInvoicesPerUser,
                    ],
                    'monthly_timeseries'       => $monthly,
                    'user_invoice_stats'       => $userInvoiceStats,
                    'invoice_status_breakdown' => $invoiceStatusBreakdown,
                    'user_client_stats'        => $userClientStats,
                    'sub_user_distribution'    => $subUserDistribution,
                    'activity_stats'           => $activityStats,
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsController@getDashboard failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function getUsersList(Request $request): JsonResponse
    {
        try {
            $hostId = $this->getHostId();

            $users = $this->scopeHost(User::query(), $hostId)
                ->select('id', 'first_name', 'last_name', 'user_name', 'email', 'is_active')
                ->get()
                ->map(fn($u) => [
                    'userId'   => (string) $u->id,
                    'userName' => trim("{$u->first_name} {$u->last_name}") ?: $u->user_name,
                    'email'    => $u->email,
                    'isActive' => (bool) $u->is_active,
                ]);

            return response()->json(['success' => true, 'data' => $users], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsController@getUsersList: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load users.'], 500);
        }
    }

    public function getUserAnalytics(Request $request, int $userId): JsonResponse
    {
        try {
            $hostId   = $this->getHostId();
            $userQ    = User::where('id', $userId);
            if ($hostId !== null) {
                $userQ->where('host_id', $hostId);
            }
            $user     = $userQ->firstOrFail();
            $fullName = trim("{$user->first_name} {$user->last_name}") ?: $user->user_name;

            $invoiceQ = Invoice::where('created_by', $userId)->whereNull('deleted_at');
            if ($hostId !== null) {
                $invoiceQ->where('host_id', $hostId);
            }
            $invoices = $invoiceQ->get();

            $invoiceCount = $invoices->count();
            $totalAmount  = $invoices->sum('final_amount');
            
            // Fix: Convert status to string for array keys
            $statusCounts = [];
            foreach ($invoices as $inv) {
                $status = $inv->status?->value ?? (string) $inv->status;
                $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;
            }

            $clientQ = DB::table('invoices_clients');
            if ($hostId !== null) {
                $clientQ->where('host_id', $hostId);
            }
            $clientCount = $clientQ->count();

            $subQ = User::where('id', '!=', $userId);
            if ($hostId !== null) {
                $subQ->where('host_id', $hostId);
            }
            $subUsers    = $subQ->get(['id', 'first_name', 'last_name', 'user_name', 'email', 'is_active']);
            $subUserList = $subUsers->map(fn($su) => [
                'id'        => $su->id,
                'name'      => trim("{$su->first_name} {$su->last_name}") ?: $su->user_name,
                'email'     => $su->email,
                'is_active' => (bool) $su->is_active,
            ]);

            $monthlyQ = Invoice::where('created_by', $userId)->whereNull('deleted_at');
            if ($hostId !== null) {
                $monthlyQ->where('host_id', $hostId);
            }
            $monthly = $monthlyQ
                ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count, SUM(final_amount) as total')
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'user'             => ['id' => $user->id, 'name' => $fullName, 'email' => $user->email, 'is_active' => (bool) $user->is_active],
                    'invoice_count'    => $invoiceCount,
                    'total_amount'     => $totalAmount,
                    'status_breakdown' => $statusCounts,
                    'client_count'     => $clientCount,
                    'sub_users'        => $subUserList,
                    'monthly_invoices' => $monthly,
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsController@getUserAnalytics: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load user analytics.'], 500);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function buildMonthlyTimeseries(?int $hostId): array
    {
        // 1. Invoices per month
        $invQ = Invoice::whereNull('deleted_at');
        if ($hostId !== null) {
            $invQ->where('host_id', $hostId);
        }
        $invoiceRows = $invQ
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as invoices')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('invoices', 'month')
            ->toArray();

        // 2. Users per month (registrations)
        $userQ = User::query();
        if ($hostId !== null) {
            $userQ->where('host_id', $hostId);
        }
        $userRows = $userQ
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as users')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('users', 'month')
            ->toArray();

        // 3. Clients per month (via invoices proxy - invoices_clients has no created_at)
        // Count distinct clients that were invoiced each month
        $clientQ = DB::table('invoices')
            ->whereNull('deleted_at')
            ->whereNotNull('client_id');
        if ($hostId !== null) {
            $clientQ->where('host_id', $hostId);
        }
        $clientRows = $clientQ
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(DISTINCT client_id) as clients')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('clients', 'month')
            ->toArray();

        // 4. Sub-users per month (users with host_role != 'owner')
        $subUserQ = User::where('host_role', '!=', 'owner');
        if ($hostId !== null) {
            $subUserQ->where('host_id', $hostId);
        }
        $subUserRows = $subUserQ
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as subUsers')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('subUsers', 'month')
            ->toArray();

        // 5. Merge all months from all data sources
        $allMonths = array_unique(array_merge(
            array_keys($invoiceRows),
            array_keys($userRows),
            array_keys($clientRows),
            array_keys($subUserRows)
        ));
        sort($allMonths);

        // 6. Build response with all metrics
        return array_map(fn($month) => [
            'month'    => $month,
            'invoices' => (int) ($invoiceRows[$month] ?? 0),
            'clients'  => (int) ($clientRows[$month] ?? 0),
            'users'    => (int) ($userRows[$month] ?? 0),
            'subUsers' => (int) ($subUserRows[$month] ?? 0),
        ], $allMonths);
    }

    private function getUserInvoiceStats(?int $hostId): array
    {
        $q = Invoice::whereNull('invoices.deleted_at')
            ->join('users', 'invoices.created_by', '=', 'users.id')
            ->selectRaw('
                users.id as userId,
                TRIM(CONCAT(COALESCE(users.first_name,""), " ", COALESCE(users.last_name,""))) as userName,
                users.user_name,
                COUNT(invoices.id) as invoiceCount,
                SUM(invoices.final_amount) as totalAmount
            ')
            ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.user_name')
            ->orderByDesc('invoiceCount');

        if ($hostId !== null) {
            $q->where('invoices.host_id', $hostId);
        }

        return $q->get()->map(fn($r) => [
            'userId'       => (string) $r->userId,
            'userName'     => trim($r->userName) ?: $r->user_name,
            'invoiceCount' => (int) $r->invoiceCount,
            'totalAmount'  => (float) $r->totalAmount,
        ])->toArray();
    }

    private function getInvoiceStatusBreakdown(?int $hostId): array
    {
        $overallQ = Invoice::whereNull('deleted_at');
        if ($hostId !== null) {
            $overallQ->where('host_id', $hostId);
        }
        
        // Fix: Convert status to string for array keys
        $overall = [];
        $overallResults = $overallQ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();
        
        foreach ($overallResults as $row) {
            $status = $row->status?->value ?? (string) $row->status;
            $overall[$status] = (int) $row->count;
        }

        $perUserQ = Invoice::whereNull('invoices.deleted_at')
            ->join('users', 'invoices.created_by', '=', 'users.id')
            ->selectRaw('
                users.id as userId,
                TRIM(CONCAT(COALESCE(users.first_name,""), " ", COALESCE(users.last_name,""))) as userName,
                users.user_name, 
                invoices.status, 
                COUNT(*) as count
            ')
            ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.user_name', 'invoices.status');

        if ($hostId !== null) {
            $perUserQ->where('invoices.host_id', $hostId);
        }

        $grouped = [];
        foreach ($perUserQ->get() as $row) {
            $uid = (string) $row->userId;
            if (!isset($grouped[$uid])) {
                $grouped[$uid] = [
                    'userId' => $uid, 
                    'userName' => trim($row->userName) ?: $row->user_name, 
                    'statuses' => []
                ];
            }
            $status = $row->status?->value ?? (string) $row->status;
            $grouped[$uid]['statuses'][$status] = (int) $row->count;
        }

        return ['overall' => $overall, 'per_user' => array_values($grouped)];
    }

    private function getUserClientStats(?int $hostId): array
    {
        $userQ = User::query();
        if ($hostId !== null) {
            $userQ->where('host_id', $hostId);
        }
        $users = $userQ->get(['id', 'first_name', 'last_name', 'user_name']);

        $clientQ = DB::table('invoices_clients');
        if ($hostId !== null) {
            $clientQ->where('host_id', $hostId);
        }
        $totalClients = $clientQ->count();

        $n       = max(1, $users->count());
        $perUser = (int) ceil($totalClients / $n);

        return $users->map(fn($u) => [
            'userId'            => (string) $u->id,
            'userName'          => trim("{$u->first_name} {$u->last_name}") ?: $u->user_name,
            'clientCount'       => $perUser,
            'percentageOfTotal' => $totalClients > 0 ? round(($perUser / $totalClients) * 100, 1) : 0,
        ])->toArray();
    }

    private function getSubUserDistribution(?int $hostId): array
    {
        $userQ = User::query();
        if ($hostId !== null) {
            $userQ->where('host_id', $hostId);
        }
        $users = $userQ->with('roles')->get();
        $total = $users->count();

        // Sub users = all other users in the same host (excluding current user)
        return $users->map(fn($u) => [
            'userId'          => (string) $u->id,
            'userName'        => trim("{$u->first_name} {$u->last_name}") ?: $u->user_name,
            'subUserCount'    => max(0, $total - 1), // All other users in same host
            'currentUserRole' => $u->roles->first()?->name ?? 'Member',
        ])->toArray();
    }

    private function getActivityStats(): array
    {
        // activity_logs has no status column
        return [
            'total'   => ActivityLog::count(),
            'success' => 0,
            'failed'  => 0,
            'pending' => 0,
        ];
    }
}