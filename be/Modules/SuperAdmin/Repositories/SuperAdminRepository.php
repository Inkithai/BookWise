<?php

namespace Modules\SuperAdmin\Repositories;

use App\Models\User;
use App\Models\ActivityLog;
use App\Models\Host;
use App\Models\HostUser;
use App\Models\HostUserDetail;
use App\Models\HostUserStripe;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Receipt;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;
use Throwable;

class SuperAdminRepository
{
    /**
     * Get all users with relationships and filters
     */
    public function getAllUsers(array $filters = [], int $perPage = 20)
    {
        $query = User::query()
            ->with([
                'host:id,name,plan_id',
                'host.plan:id,name,price,currency',
                'roles:id,name',
                'team:id,name'
            ])
            ->withCount('activityLogs')
            ->select(
                'id',
                'first_name',
                'last_name',
                'email',
                'user_name',
                'phone_number',
                'account_type',
                'is_active',
                'is_otp_verified',
                'last_login',
                'created_at',
                'host_id',
                'team_id',
                'profile_img'
            );

        // Apply search filter
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        // Filter by status (active/inactive)
        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        // Filter by account type
        if (!empty($filters['account_type'])) {
            $query->where('account_type', $filters['account_type']);
        }

        // Filter by OTP verification status
        if (isset($filters['is_otp_verified'])) {
            $query->where('is_otp_verified', $filters['is_otp_verified']);
        }

        // Filter by role
        if (!empty($filters['role'])) {
            $query->whereHas('roles', function ($q) use ($filters) {
                $q->where('name', $filters['role']);
            });
        }

        // Filter by host/company
        if (!empty($filters['host_id'])) {
            $query->where('host_id', $filters['host_id']);
        }

        // Filter by date range
        if (!empty($filters['created_from'])) {
            $query->whereDate('created_at', '>=', $filters['created_from']);
        }

        if (!empty($filters['created_to'])) {
            $query->whereDate('created_at', '<=', $filters['created_to']);
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        
        $allowedSortFields = ['created_at', 'last_login', 'first_name', 'email', 'is_active'];
        if (in_array($sortBy, $allowedSortFields)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Include soft deleted users if requested
        if (!empty($filters['include_deleted'])) {
            $query->withTrashed();
        }

        return $query->paginate($perPage);
    }

    /**
     * Get single user with complete details
     */
    public function getUserById(int $userId, bool $withDeleted = false)
    {
        $query = User::query()
            ->with([
                'host:id,name,plan_id,created_at',
                'host.plan:id,name,price,currency,monthly_invoices,saved_clients,monthly_payment_receipts,team_members,bill_any_currency,recurring_statements,accept_online_payments,crm',
                'team:id,name,host_id,created_at',
                'roles:id,name',
                'roles.permissions:id,name',
                'HostUser:id,host_id,user_id,created_at',
                'HostUserDetails:id,host_id,user_id,type,name,values,files,is_active',
            ])
            ->withCount([
                'activityLogs',
                'invoices'
            ])
            ->select('*');

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->findOrFail($userId);
    }

    /**
     * Get user's recent activity logs
     */
    public function getUserActivityLogs(int $userId, int $limit = 10)
    {
        return ActivityLog::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get user's payment history
     */
    public function getUserPayments(int $userId, int $limit = 5)
    {
        return DB::table('payments')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Deactivate user
     */
    public function deactivateUser(int $userId): bool
    {
        $user = User::findOrFail($userId);
        
        // Prevent deactivating super-admin
        if ($user->hasRole('super-admin')) {
            throw new \Exception('Cannot deactivate a super admin user.');
        }

        return $user->update(['is_active' => 0]);
    }

    /**
     * Activate user
     */
    public function activateUser(int $userId): bool
    {
        $user = User::findOrFail($userId);
        return $user->update(['is_active' => 1]);
    }

    /**
     * Permanently delete user and all related data
     */
    public function deleteUser(int $userId): bool
    {
        $user = User::findOrFail($userId);

        // Prevent deleting super-admin
        if ($user->hasRole('super-admin')) {
            throw new \Exception('Cannot delete a super admin user.');
        }

        DB::beginTransaction();
        try {
            // 1. Delete activity logs
            ActivityLog::where('user_id', $userId)->delete();

            // 2. Delete invoices and their child records
            $invoiceIds = Invoice::where('created_by', $userId)->pluck('id');
            if ($invoiceIds->isNotEmpty()) {
                InvoiceItem::whereIn('invoice_id', $invoiceIds)->delete();
                Receipt::whereIn('invoice_id', $invoiceIds)->delete();
                Invoice::whereIn('id', $invoiceIds)->delete();
            }

            // 3. Delete Stripe details
            HostUserStripe::where('host_user_id', $userId)->delete();

            // 4. Delete host user detail records
            HostUserDetail::where('user_id', $userId)->delete();

            // 5. Delete host user record
            HostUser::where('user_id', $userId)->delete();

            // 6. Revoke all Spatie roles
            $user->roles()->detach();

            // 7. Permanently delete the user
            $user->forceDelete();

            DB::commit();
            return true;
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats(): array
    {
        return [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', 1)->count(),
            'inactive_users' => User::where('is_active', 0)->count(),
            'deleted_users' => User::onlyTrashed()->count(),
            'total_hosts' => Host::count(),
            'total_plans' => Plan::count(),
            'users_by_role' => $this->getUsersByRole(),
            'users_by_account_type' => $this->getUsersByAccountType(),
            'recent_registrations' => $this->getRecentRegistrations(),
            'total_activity_logs' => ActivityLog::count(),
        ];
    }

    /**
     * Get users grouped by role
     */
    private function getUsersByRole(): array
    {
        return DB::table('model_has_roles')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->select('roles.name', DB::raw('count(*) as count'))
            ->where('model_has_roles.model_type', User::class)
            ->groupBy('roles.name')
            ->pluck('count', 'name')
            ->toArray();
    }

    /**
     * Get users grouped by account type
     */
    private function getUsersByAccountType(): array
    {
        return User::select('account_type', DB::raw('count(*) as count'))
            ->groupBy('account_type')
            ->pluck('count', 'account_type')
            ->toArray();
    }

    /**
     * Get recent user registrations
     */
    private function getRecentRegistrations(): int
    {
        return User::where('created_at', '>=', now()->subDays(30))
            ->count();
    }

    /**
     * Get all hosts for filter dropdown
     */
    public function getAllHosts()
    {
        return Host::select('id', 'name')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get all plans for filter dropdown
     */
    public function getAllPlans()
    {
        return Plan::select('id', 'name', 'price', 'currency')
            ->orderBy('name')
            ->get();
    }
}
