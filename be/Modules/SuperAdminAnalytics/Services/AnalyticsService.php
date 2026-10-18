<?php

namespace Modules\SuperAdminAnalytics\Services;

use App\Support\DbDialect;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AnalyticsService
{
    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function getDashboardData(): array
    {
        // Main users = all users (users table has no sub-user flag)
        $totalUsers = DB::table('users')
            ->whereNull('deleted_at')
            ->count();

        // Sub-users = rows in host_users join table
        $subUsers = DB::table('users')
    ->whereNull('deleted_at')
    ->whereIn('id',
        DB::table('host_users')
            ->whereNull('deleted_at')
            ->pluck('user_id')
    )
    ->count();

        $totalInvoices = DB::table('invoices')
            ->whereNull('deleted_at')
            ->count();

        // Clients live in invoices_clients, keyed by host_id = user id
        $totalClients = DB::table('invoices_clients as c')
    ->join('users as u', 'u.id', '=', 'c.host_id')
    ->whereNull('u.deleted_at')
    ->whereNull('c.deleted_at')
    ->count();

        $avgInvoices = $totalUsers > 0
            ? round($totalInvoices / $totalUsers, 2)
            : 0;

        // Per-user invoice stats  (invoices.created_by = users.id)
        $userInvoiceStats = DB::table('invoices as i')
            ->join('users as u', 'u.id', '=', 'i.created_by')
            ->whereNull('i.deleted_at')
            ->whereNull('u.deleted_at')
            ->selectRaw("u.id as \"userId\",
                CONCAT(u.first_name,' ',u.last_name) as \"userName\",
                COUNT(i.id) as \"invoiceCount\",
                COALESCE(SUM(i.total_amount),0) as \"totalAmount\"")
            ->groupBy('u.id', 'u.first_name', 'u.last_name')
            ->get()
            ->map(fn ($r) => [
                'userId'       => (string) $r->userId,
                'userName'     => $r->userName,
                'invoiceCount' => (int) $r->invoiceCount,
                'totalAmount'  => (float) $r->totalAmount,
            ])
            ->toArray();

        // Per-user client stats  (invoices_clients.host_id = users.id)
        $userClientStats = DB::table('invoices_clients as c')
            ->join('users as u', 'u.id', '=', 'c.host_id')
            ->whereNull('u.deleted_at')
            ->whereNull('c.deleted_at')
            ->selectRaw("u.id as \"userId\",
                CONCAT(u.first_name,' ',u.last_name) as \"userName\",
                COUNT(c.id) as \"clientCount\"")
            ->groupBy('u.id', 'u.first_name', 'u.last_name')
            ->get()
            ->map(fn ($r) => [
                'userId'      => (string) $r->userId,
                'userName'    => $r->userName,
                'clientCount' => (int) $r->clientCount,
            ])
            ->toArray();

        // Sub-user distribution per host user
        $subUserDistribution = DB::table('host_users as hu')
            ->join('users as u', 'u.id', '=', 'hu.host_id')
            ->whereNull('hu.deleted_at')
            ->whereNull('u.deleted_at')
            ->selectRaw("u.id as \"userId\",
                CONCAT(u.first_name,' ',u.last_name) as \"userName\",
                COUNT(hu.id) as \"subUserCount\"")
            ->groupBy('u.id', 'u.first_name', 'u.last_name')
            ->get()
            ->map(fn ($r) => [
                'userId'       => (string) $r->userId,
                'userName'     => $r->userName,
                'subUserCount' => (int) $r->subUserCount,
            ])
            ->toArray();

        return [
            'overview' => [
                'total_users'           => $totalUsers,
                'total_invoices'        => $totalInvoices,
                'total_clients'         => $totalClients,
                'sub_users'             => $subUsers,
                'avg_invoices_per_user' => $avgInvoices,
                 'admin_users'           => DB::table('users')
                                    ->whereNull('deleted_at')
                                    ->whereNotIn('id',
                                        DB::table('host_users')
                                            ->whereNull('deleted_at')
                                            ->pluck('user_id')
                                    )
                                    ->count(),
            ],
            'user_invoice_stats'    => $userInvoiceStats,
            'user_client_stats'     => $userClientStats,
            'sub_user_distribution' => $subUserDistribution,
            'monthly_timeseries'    => $this->buildMonthlyTimeseries(),
        ];
    }

    private function buildMonthlyTimeseries(): array
    {
        $months = [];
        for ($i = 23; $i >= 0; $i--) {
            $months[] = now()->subMonths($i)->format('Y-m');
        }

        $since = now()->subMonths(23)->startOfMonth();

        $invoicesByMonth = DB::table('invoices')
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $since)
            ->selectRaw(DbDialect::monthKey('created_at') . ' as month, COUNT(*) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        // invoices_clients has no timestamps — approximate via distinct clients invoiced per month
        $clientsByMonth = DB::table('invoices as ic')
            ->whereNull('ic.deleted_at')
            ->whereNotNull('ic.client_id')
            ->where('ic.created_at', '>=', $since)
            ->selectRaw(DbDialect::monthKey('ic.created_at') . ' as month, COUNT(DISTINCT ic.client_id) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        $usersByMonth = DB::table('users')
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $since)
            ->selectRaw(DbDialect::monthKey('created_at') . ' as month, COUNT(*) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        $subUsersByMonth = DB::table('host_users')
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $since)
            ->selectRaw(DbDialect::monthKey('created_at') . ' as month, COUNT(*) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        return array_map(fn ($m) => [
            'month'    => $m,
            'invoices' => (int) ($invoicesByMonth[$m]  ?? 0),
            'clients'  => (int) ($clientsByMonth[$m]   ?? 0),
            'users'    => (int) ($usersByMonth[$m]     ?? 0),
            'subUsers' => (int) ($subUsersByMonth[$m]  ?? 0),
        ], $months);
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    public function getUsers(array $filters): array
    {
        $query = DB::table('users as u')
            ->whereNull('u.deleted_at')
            ->selectRaw("
                u.id, u.first_name, u.last_name,
                CONCAT(u.first_name,' ',u.last_name) as full_name,
                u.email, u.phone_number, u.user_name,
                u.is_active, u.account_type,
                u.profile_img, u.is_otp_verified, u.created_at
            ");

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($s) {
                $q->where('u.first_name', 'like', $s)
                  ->orWhere('u.last_name',  'like', $s)
                  ->orWhere('u.email',      'like', $s)
                  ->orWhere('u.user_name',  'like', $s)
                  ->orWhereRaw("CONCAT(u.first_name,' ',u.last_name) like ?", [$s]);
            });
        }

        if (!empty($filters['status'])) {
            $query->where('u.is_active', $filters['status'] === 'active' ? 1 : 0);
        }

        if (!empty($filters['account_type'])) {
            $query->where('u.account_type', $filters['account_type']);
        }

        $perPage = (int) ($filters['per_page'] ?? 10);
        $page    = (int) ($filters['page']     ?? 1);
        $total   = $query->count();

        $users = $query->orderByDesc('u.created_at')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        // Sub-users per host from host_users table
        $userIds    = $users->pluck('id')->toArray();
        $subUserMap = collect();

        if (!empty($userIds)) {
            $subUserMap = DB::table('host_users as hu')
                ->join('users as su', 'su.id', '=', 'hu.user_id')
                ->whereNull('hu.deleted_at')
                ->whereIn('hu.host_id', $userIds)
                ->selectRaw("
                    hu.host_id,
                    su.id,
                    CONCAT(su.first_name,' ',su.last_name) as full_name,
                    su.email,
                    su.is_active
                ")
                ->get()
                ->groupBy('host_id');
        }

        $data = $users->map(function ($u) use ($subUserMap) {
            $subs = $subUserMap->get($u->id, collect());
            // PG returns booleans as 't'/'f' strings through DB::table — normalise.
            $isOtpVerified = DbDialect::toBool($u->is_otp_verified);
            return [
                'id'             => $u->id,
                'full_name'      => $u->full_name,
                'first_name'     => $u->first_name,
                'last_name'      => $u->last_name,
                'email'          => $u->email,
                'phone_number'   => $u->phone_number,
                'user_name'      => $u->user_name,
                'is_active'      => (bool) $u->is_active,
                'is_otp_verified' => $isOtpVerified,
                'is_otp_verified_label' => $isOtpVerified ? 'Verified' : 'Not Verified',
                'account_type'   => $u->account_type,
                'profile_img'    => $u->profile_img,
                'created_at'     => $u->created_at,
                'sub_user_count' => $subs->count(),
                'sub_users'      => $subs->map(fn ($s) => [
                    'id'        => $s->id,
                    'full_name' => $s->full_name,
                    'email'     => $s->email,
                    'is_active' => (bool) $s->is_active,
                ])->values()->toArray(),
            ];
        })->toArray();

        $summary = [
            'total'     => DB::table('users')->whereNull('deleted_at')->count(),
            'active'    => DB::table('users')->whereNull('deleted_at')->where('is_active', 1)->count(),
            'inactive'  => DB::table('users')->whereNull('deleted_at')->where('is_active', 0)->count(),
            'sub_users' => DB::table('users')
        ->whereNull('deleted_at')
        ->whereIn('id',
            DB::table('host_users')
                ->whereNull('deleted_at')
                ->pluck('user_id')
        )
        ->count(),

    'admin_users' => DB::table('users')
        ->whereNull('deleted_at')
        ->whereNotIn('id',
            DB::table('host_users')
                ->whereNull('deleted_at')
                ->pluck('user_id')
        )
        ->count(),
];

        // Expose total_companies only to super-admin users.
        $authUser = auth()->user();
        $isSuperAdmin = $authUser && (
            strtolower((string) ($authUser->account_type ?? '')) === 'super-admin'
            || (method_exists($authUser, 'hasRole') && $authUser->hasRole('super-admin'))
        );
        if ($isSuperAdmin) {
            $summary['total_companies'] = DB::table('companies')
                ->whereNull('deleted_at')
                ->count();
        }

        return [
            'data'       => $data,
            'summary'    => $summary,
            'pagination' => [
                'total'        => $total,
                'per_page'     => $perPage,
                'current_page' => $page,
                'last_page'    => max(1, (int) ceil($total / $perPage)),
            ],
        ];
    }

    public function getUserById(int $id): array
    {
        $hasPackageId = Schema::hasColumn('user_subscriptions', 'package_id');

        $query = DB::table('users as u')
            ->where('u.id', $id)
            ->whereNull('u.deleted_at')
            ->leftJoin('invoices_companies as c', 'c.host_id', '=', 'u.id')
            ->leftJoin('user_subscriptions as us', 'us.user_id', '=', 'u.id');

        if ($hasPackageId) {
            $query->leftJoin('price_packages as p', 'p.id', '=', 'us.package_id')
                ->selectRaw("
                    u.id, u.first_name, u.last_name,
                    CONCAT(u.first_name,' ',u.last_name) as full_name,
                    u.email, u.phone_number, u.user_name,
                    u.is_active, u.account_type,
                    u.profile_img, u.is_otp_verified,
                    u.created_at, u.updated_at,
                    c.name as company_name,
                    p.id as plan_id, p.name as plan_name,
                    p.price as plan_price
                ");
        } else {
            $query->selectRaw("
                    u.id, u.first_name, u.last_name,
                    CONCAT(u.first_name,' ',u.last_name) as full_name,
                    u.email, u.phone_number, u.user_name,
                    u.is_active, u.account_type,
                    u.profile_img, u.is_otp_verified,
                    u.created_at, u.updated_at,
                    c.name as company_name,
                    null as plan_id,
                    us.plan_name as plan_name,
                    us.amount as plan_price
                ");
        }

        $user = $query->first();

        if (!$user) return [];

        $roles = DB::table('model_has_roles as mr')
            ->join('roles as r', 'r.id', '=', 'mr.role_id')
            ->where('mr.model_id', $id)
            ->where('mr.model_type', 'App\\Models\\User')
            ->select('r.id', 'r.name')
            ->get()
            ->toArray();

        $isActive      = (bool) $user->is_active;
        // PG returns booleans as 't'/'f' strings through DB::table — normalise.
        $isOtpVerified = DbDialect::toBool($user->is_otp_verified);

        return [
            'id'                    => $user->id,
            'full_name'             => $user->full_name,
            'first_name'            => $user->first_name,
            'last_name'             => $user->last_name,
            'email'                 => $user->email,
            'phone_number'          => $user->phone_number,
            'phone'                 => $user->phone_number,
            'user_name'             => $user->user_name,
            'is_active'             => $user->is_active,
            'is_active_label'       => $isActive ? 'Active' : 'Inactive',
            'is_otp_verified'       => $isOtpVerified,
            'is_otp_verified_label' => $isOtpVerified ? 'Verified' : 'Not Verified',
            'account_type'          => $user->account_type,
            'profile_img'           => $user->profile_img,
            'company_name'          => $user->company_name,
            'company'               => $user->company_name
                ? ['company_name' => $user->company_name]
                : null,
            'plan' => ($user->plan_id || $user->plan_name || $user->plan_price) ? [
                'id'              => $user->plan_id,
                'name'            => $user->plan_name,
                'formatted_price' => $user->plan_price
                    ? number_format($user->plan_price, 2)
                    : null,
                'currency'        => null,
            ] : null,
            'roles'      => $roles,
            'role'       => collect($roles)->pluck('name')->implode(', ') ?: null,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }

    public function getUsersDropdown(): array
    {
        return DB::table('users')
            ->whereNull('deleted_at')
            ->orderBy('first_name')
            ->selectRaw("id as \"userId\", CONCAT(first_name,' ',last_name) as \"userName\"")
            ->get()
            ->map(fn ($u) => [
                'userId'   => (string) $u->userId,
                'userName' => $u->userName,
            ])
            ->toArray();
    }

    // ── Clients ───────────────────────────────────────────────────────────────

    public function getClients(array $filters): array
{
    // ── Base query — apply ALL filters before any count() or get() ────────
    $query = DB::table('invoices_clients as c')
        ->join('users as u', 'u.id', '=', 'c.host_id')
        ->whereNull('u.deleted_at')
        ->selectRaw("
            c.id,
            c.name,
            c.email,
            c.telephone                                      AS phone,
            c.client_type                                    AS company,
            c.host_id                                        AS user_id,
            CONCAT(u.first_name,' ',u.last_name)             AS \"userName\",
            CASE WHEN c.deleted_at IS NULL THEN 'active' ELSE 'inactive' END AS status,
            (
                SELECT COUNT(*)
                FROM invoices
                WHERE client_id = c.id
                  AND deleted_at IS NULL
            )                                                AS \"totalInvoices\"
        ");
 
    // ── Search filter ─────────────────────────────────────────────────────
    if (!empty($filters['search'])) {
        $s = '%' . $filters['search'] . '%';
        $query->where(function ($q) use ($s) {
            $q->where('c.name',       'like', $s)
              ->orWhere('c.email',    'like', $s)
              ->orWhere('c.client_type', 'like', $s)
              ->orWhere('c.telephone', 'like', $s)
              ->orWhereRaw("CONCAT(u.first_name,' ',u.last_name) LIKE ?", [$s]);
        });
    }
 
    // ── User filter ───────────────────────────────────────────────────────
    // FIX: was applied AFTER count(), so pagination total was always unfiltered.
    // Now applied before everything.
    if (!empty($filters['user_id']) && $filters['user_id'] !== 'all') {
        $query->where('c.host_id', $filters['user_id']);
    }
 
    // ── Status filter ─────────────────────────────────────────────────────
    // FIX: was silently ignored. Now filters on deleted_at presence.
    if (!empty($filters['status']) && $filters['status'] !== 'all') {
        if ($filters['status'] === 'active') {
            $query->whereNull('c.deleted_at');
        } elseif ($filters['status'] === 'inactive') {
            $query->whereNotNull('c.deleted_at');
        }
    }
 
    // ── Pagination ────────────────────────────────────────────────────────
    // FIX: count() now runs AFTER all filters are applied.
    $perPage = (int) ($filters['per_page'] ?? 9);
    $page    = (int) ($filters['page']     ?? 1);
    $total   = (clone $query)->count();   // ← filtered count for pagination
 
    $clients = $query
        ->orderByDesc('c.id')
        ->offset(($page - 1) * $perPage)
        ->limit($perPage)
        ->get()
        ->map(fn ($c) => [
            'id'            => $c->id,
            'name'          => $c->name          ?? '',
            'email'         => $c->email         ?? '',
            'phone'         => $c->phone         ?? '',
            'company'       => $c->company       ?? '',
            'status'        => $c->status,               // real derived status
            'user_id'       => (string) $c->user_id,     // string so frontend === works
            'userId'        => (string) $c->user_id,     // alias frontend also uses
            'userName'      => $c->userName      ?? '',
            'totalInvoices' => (int) $c->totalInvoices,
        ])
        ->toArray();
 
    // ── Summary — global counts (not affected by current filters) ─────────
    $summaryBase = DB::table('invoices_clients as c')
        ->join('users as u', 'u.id', '=', 'c.host_id')
        ->whereNull('u.deleted_at');
 
    $totalCount    = (clone $summaryBase)->count();
    $activeCount   = (clone $summaryBase)->whereNull('c.deleted_at')->count();
    $inactiveCount = (clone $summaryBase)->whereNotNull('c.deleted_at')->count();
 
    // ── Per-user distribution ─────────────────────────────────────────────
    $userDistribution = DB::table('invoices_clients as c')
        ->join('users as u', 'u.id', '=', 'c.host_id')
        ->whereNull('u.deleted_at')
        ->selectRaw("
            u.id                                         AS \"userId\",
            CONCAT(u.first_name,' ',u.last_name)         AS \"userName\",
            COUNT(c.id)                                  AS \"clientCount\",
            SUM(CASE WHEN c.deleted_at IS NULL THEN 1 ELSE 0 END)  AS \"activeCount\",
            SUM(CASE WHEN c.deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS \"inactiveCount\"
        ")
        ->groupBy('u.id', 'u.first_name', 'u.last_name')
        ->orderByDesc('clientCount')
        ->get()
        ->map(fn ($r) => [
            'userId'        => (string) $r->userId,
            'userName'      => $r->userName,
            'clientCount'   => (int) $r->clientCount,
            'activeCount'   => (int) $r->activeCount,
            'inactiveCount' => (int) $r->inactiveCount,
        ])
        ->toArray();
 
    return [
        'clients'           => $clients,
        'summary'           => [
            'total'    => $totalCount,
            'active'   => $activeCount,
            'inactive' => $inactiveCount,
        ],
        'user_distribution' => $userDistribution,
        'pagination'        => [
            'total'        => $total,           // ← filtered total
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
        ],
    ];
}
    // ── Invoices ──────────────────────────────────────────────────────────────

    public function getInvoices(array $filters): array
    {
        // invoices.created_by = user id
        // invoices.client_id  = invoices_clients.id
        $query = DB::table('invoices as i')
            ->whereNull('i.deleted_at')
            ->join('users as u', 'u.id', '=', 'i.created_by')
            ->leftJoin('invoices_clients as c', 'c.id', '=', 'i.client_id')
            ->selectRaw("
                i.id, i.code as number,
                COALESCE(c.name, i.client_name, 'Unknown') as client,
                i.status,
                i.invoice_date as date,
                i.due_date,
                i.created_by as user_id,
                CONCAT(u.first_name,' ',u.last_name) as \"userName\"
            ");

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($s) {
                $q->where('i.code',        'like', $s)
                  ->orWhere('c.name',      'like', $s)
                  ->orWhere('i.client_name','like', $s);
            });
        }

        if (!empty($filters['status'])) {
            $query->where('i.status', $filters['status']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('i.created_by', $filters['user_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('i.invoice_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('i.invoice_date', '<=', $filters['date_to']);
        }

        $perPage = (int) ($filters['per_page'] ?? 8);
        $page    = (int) ($filters['page']     ?? 1);
        $total   = $query->count();

        $allowedSortFields = [
            'date'     => 'i.invoice_date',
            'due_date' => 'i.due_date',
            'status'   => 'i.status',
            'client'   => 'c.name',
            'number'   => 'i.code',
        ];
        $sortBy  = $allowedSortFields[$filters['sort_by'] ?? ''] ?? 'i.created_at';
        $sortDir = strtolower($filters['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $invoices = $query->orderBy($sortBy, $sortDir)
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get()
            ->map(fn ($inv) => [
                'id'       => $inv->id,
                'number'   => $inv->number ?? "INV-{$inv->id}",
                'client'   => $inv->client,
                'status'   => $inv->status ?? 'Draft',
                'date'     => $inv->date
                    ? date('M d, Y', strtotime($inv->date)) : '',
                'dueDate'  => $inv->due_date
                    ? date('M d, Y', strtotime($inv->due_date)) : '',
                'userId'   => (string) $inv->user_id,
                'userName' => $inv->userName,
            ])
            ->toArray();

        // Status counts
        $statusCounts = DB::table('invoices as i')
            ->whereNull('i.deleted_at')
            ->when(!empty($filters['user_id']),
                fn ($q) => $q->where('i.created_by', $filters['user_id']))
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->map(fn ($v) => (int) $v)
            ->toArray();

        $statusBreakdown = DB::table('invoices')
            ->whereNull('deleted_at')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->map(fn ($v) => (int) $v)
            ->toArray();

        // Per-user stats
        $userStats = DB::table('invoices as i')
            ->whereNull('i.deleted_at')
            ->join('users as u', 'u.id', '=', 'i.created_by')
            ->selectRaw("
                u.id as \"userId\",
                CONCAT(u.first_name,' ',u.last_name) as \"userName\",
                COUNT(i.id) as \"invoiceCount\",
                i.status
            ")
            ->groupBy('u.id', 'u.first_name', 'u.last_name', 'i.status')
            ->get();

        $userStatsFormatted = $userStats->groupBy('userId')
            ->map(function ($rows) {
                $first    = $rows->first();
                $statuses = $rows->pluck('invoiceCount', 'status')
                    ->map(fn ($v) => (int) $v)
                    ->toArray();
                return [
                    'userId'       => (string) $first->userId,
                    'userName'     => $first->userName,
                    'invoiceCount' => array_sum($statuses),
                    'statuses'     => $statuses,
                ];
            })
            ->values()
            ->toArray();

        return [
            'invoices'         => $invoices,
            'status_counts'    => $statusCounts,
            'status_breakdown' => $statusBreakdown,
            'user_stats'       => $userStatsFormatted,
            'pagination'       => [
                'total'        => $total,
                'per_page'     => $perPage,
                'current_page' => $page,
                'last_page'    => max(1, (int) ceil($total / $perPage)),
            ],
        ];
    }

    // ── Activity Logs ─────────────────────────────────────────────────────────
    // activity_logs columns: id, type, action, related_id, details, user_id,
    //                        created_at, updated_at
    // No: status, ip_address, error, request_data

    public function getActivityLogs(array $filters): array
{
    // ── 1. Resolved-type expression ───────────────────────────────────────
    // Maps real action strings → frontend type keys.
    // al.type is used when non-empty; otherwise action keywords decide.
    $typeExpr = "
        CASE
            WHEN al.type IS NOT NULL AND TRIM(al.type) != ''
                THEN TRIM(al.type)
            WHEN al.action LIKE '%Login%'
                THEN 'login'
            WHEN al.action LIKE '%Register%' OR al.action LIKE '%Registr%'
                THEN 'register'
            WHEN al.action LIKE '%OTP%' OR al.action LIKE '%Verif%'
                THEN 'verify_otp'
            WHEN al.action LIKE '%Password%' OR al.action LIKE '%Forgot%'
                THEN 'forget_password'
            WHEN al.action LIKE '%Updat%'
                THEN 'update_info'
            ELSE 'activity'
        END
    ";
 
    // ── 2. Resolved-status expression ─────────────────────────────────────
    // Priority 1: $.status inside the JSON details blob.
    // Priority 2: action keyword matching against real data.
    // Driver-aware: MySQL uses JSON_VALID/JSON_EXTRACT, PostgreSQL uses ->>.
    $jsonValid  = DbDialect::jsonValid('al.details');
    $jsonStatus = DbDialect::jsonValueLower('al.details', 'status');

    $statusExpr = "
        CASE
            WHEN {$jsonValid}
             AND {$jsonStatus} = 'failed'
                THEN 'failed'
            WHEN {$jsonValid}
             AND {$jsonStatus} = 'pending'
                THEN 'pending'
            WHEN {$jsonValid}
             AND {$jsonStatus} = 'success'
                THEN 'success'
            WHEN al.action LIKE '%Failed%'
              OR al.action LIKE '%Exception%'
              OR al.action LIKE '%Error%'
              OR al.action LIKE '%Denied%'
                THEN 'failed'
            WHEN al.action LIKE '%Email Sent%'
              OR al.action LIKE '%OTP Sent%'
              OR al.action LIKE '%Pending%'
                THEN 'pending'
            ELSE 'success'
        END
    ";
 
    // ── 3. Resolved-account-type expression ───────────────────────────────
    // u.account_type is NULL for regular users in the DB.
    // NULL → 'user', everything else passes through.
    $accountTypeExpr = "COALESCE(NULLIF(TRIM(u.account_type), ''), 'user')";
 
    // ── 4. Build the base query ────────────────────────────────────────────
    // Driver-aware date helpers (MySQL INTERVAL/TIMESTAMPDIFF/DATE_FORMAT vs
    // PostgreSQL INTERVAL/EXTRACT(EPOCH)/to_char).
    $oneMinuteAgo = DbDialect::nowMinusInterval(1, 'MINUTE');
    $oneHourAgo   = DbDialect::nowMinusInterval(1, 'HOUR');
    $oneDayAgo    = DbDialect::nowMinusInterval(24, 'HOUR');
    $oneWeekAgo   = DbDialect::nowMinusInterval(7, 'DAY');
    $diffMinutes  = DbDialect::timestampDiff('MINUTE', 'al.created_at', 'NOW()');
    $diffHours    = DbDialect::timestampDiff('HOUR', 'al.created_at', 'NOW()');
    $diffDays     = DbDialect::timestampDiff('DAY', 'al.created_at', 'NOW()');
    $prettyDate   = DbDialect::dateFormat('al.created_at', '%b %d, %Y', 'Mon DD, YYYY');

    $query = DB::table('activity_logs as al')
        ->join('users as u', 'u.id', '=', 'al.user_id')
        ->whereNull('u.deleted_at')
        ->selectRaw("
            al.id,
            al.user_id,
            CONCAT(u.first_name, ' ', u.last_name)  AS user_name,
            ($accountTypeExpr)                       AS resolved_account_type,
            ($typeExpr)                              AS resolved_type,
            al.action,
            al.details,
            ($statusExpr)                            AS derived_status,
            CASE
                WHEN al.created_at >= {$oneMinuteAgo}
                    THEN 'Just now'
                WHEN al.created_at >= {$oneHourAgo}
                    THEN CONCAT({$diffMinutes}, ' minutes ago')
                WHEN al.created_at >= {$oneDayAgo}
                    THEN CONCAT({$diffHours}, ' hours ago')
                WHEN al.created_at >= {$oneWeekAgo}
                    THEN CONCAT({$diffDays}, ' days ago')
                ELSE {$prettyDate}
            END AS time_ago
        ");
 
    // ── 5. Search filter ──────────────────────────────────────────────────
    if (!empty($filters['search'])) {
        $s = '%' . $filters['search'] . '%';
        // details is a JSON column — PostgreSQL needs a ::text cast for LIKE.
        $detailsLike = DbDialect::likeableText('al.details') . ' LIKE ?';
        $query->where(function ($q) use ($s, $detailsLike) {
            $q->where('u.first_name', 'like', $s)
              ->orWhere('u.last_name',  'like', $s)
              ->orWhere('u.email',      'like', $s)
              ->orWhere('al.action',    'like', $s)
              ->orWhereRaw($detailsLike, [$s])
              ->orWhereRaw("CONCAT(u.first_name, ' ', u.last_name) LIKE ?", [$s]);
        });
    }
 
    // ── 6. Type filter ────────────────────────────────────────────────────
    // FIX: Use whereRaw with the full CASE expression so the resolved value
    // is compared correctly — no closure scoping bugs possible.
    if (!empty($filters['type'])) {
        $query->whereRaw("($typeExpr) = ?", [$filters['type']]);
    }
 
    // ── 7. Status filter ──────────────────────────────────────────────────
    // FIX: Use whereRaw with the full CASE expression instead of HAVING.
    // HAVING on a SELECT alias is fragile in MariaDB — whereRaw is reliable.
    if (!empty($filters['status']) && in_array($filters['status'], ['success', 'failed', 'pending'], true)) {
        $query->whereRaw("($statusExpr) = ?", [$filters['status']]);
    }
 
    // ── 8. Account type filter ────────────────────────────────────────────
    // FIX: Use whereRaw with COALESCE so NULL rows match 'user' correctly.
    if (!empty($filters['account_type'])) {
        $query->whereRaw("($accountTypeExpr) = ?", [$filters['account_type']]);
    }
 
    // ── 9. Pagination ─────────────────────────────────────────────────────
    $perPage = (int) ($filters['per_page'] ?? 8);
    $page    = (int) ($filters['page']     ?? 1);
    $total   = (clone $query)->count();   // count AFTER all filters applied
 
    // ── 10. Fetch rows ────────────────────────────────────────────────────
    $logs = $query
        ->orderByDesc('al.created_at')
        ->offset(($page - 1) * $perPage)
        ->limit($perPage)
        ->get()
        ->map(function ($l) {
            // Pull error message out of JSON details for failed logs
            $errorMsg = null;
            if ($l->derived_status === 'failed' && !empty($l->details)) {
                $parsed = json_decode($l->details, true);
                if (is_array($parsed) && !empty($parsed['message'])) {
                    $errorMsg = $parsed['message'];
                }
            }
 
            return [
                'id'           => $l->id,
                'user_id'      => $l->user_id,
                'user_name'    => $l->user_name,
                'account_type' => $l->resolved_account_type,
                'type'         => $l->resolved_type,
                'status'       => $l->derived_status,
                'action'       => $l->action    ?? '',
                'details'      => $l->details   ?? '',
                'error'        => $errorMsg,
                'ip_address'   => null,
                'request_data' => null,
                'time_ago'     => $l->time_ago,
            ];
        })
        ->toArray();
 
    // ── 11. Summary — global counts, ignoring current filters ─────────────
    $summary = DB::table('activity_logs as al')
        ->join('users as u', 'u.id', '=', 'al.user_id')
        ->whereNull('u.deleted_at')
        ->selectRaw("
            COUNT(*)                                                          AS total_count,
            SUM(CASE WHEN ($statusExpr) = 'success' THEN 1 ELSE 0 END)      AS success_count,
            SUM(CASE WHEN ($statusExpr) = 'failed'  THEN 1 ELSE 0 END)      AS failed_count,
            SUM(CASE WHEN ($statusExpr) = 'pending' THEN 1 ELSE 0 END)      AS pending_count
        ")
        ->first();
 
    return [
        'data'    => $logs,
        'summary' => [
            'total'   => (int) ($summary->total_count   ?? 0),
            'success' => (int) ($summary->success_count ?? 0),
            'failed'  => (int) ($summary->failed_count  ?? 0),
            'pending' => (int) ($summary->pending_count ?? 0),
        ],
        'pagination' => [
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
        ],
    ];
}
}