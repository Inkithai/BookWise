<?php

namespace Modules\SuperAdmin\Services;

use Modules\SuperAdmin\Repositories\SuperAdminRepository;
use Carbon\Carbon;

class SuperAdminService
{
    protected $repository;

    public function __construct(SuperAdminRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Get all users with formatted data
     */
    public function getAllUsers(array $filters = [], int $perPage = 20)
    {
        $users = $this->repository->getAllUsers($filters, $perPage);

        return [
            'users' => $users->map(function ($user) {
                return $this->formatUserData($user);
            }),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
            ]
        ];
    }

    /**
     * Format user data for listing
     */
    private function formatUserData($user)
    {
        // Get last activity
        $lastActivity = $user->activityLogs()
            ->latest('created_at')
            ->first();

        return [
            'id' => $user->id,
            'full_name' => trim($user->first_name . ' ' . $user->last_name),
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'user_name' => $user->user_name,
            'phone_number' => $user->phone_number,
            'profile_img' => $user->profile_img,
            'account_type' => $user->account_type,
            'is_active' => $user->is_active,
            'is_active_label' => $user->is_active ? 'Active' : 'Inactive',
            'is_otp_verified' => $user->is_otp_verified,
            'is_otp_verified_label' => $user->is_otp_verified ? 'Verified' : 'Not Verified',
            'last_login' => $user->last_login ? Carbon::parse($user->last_login)->format('Y-m-d H:i:s') : null,
            'last_login_human' => $user->last_login ? Carbon::parse($user->last_login)->diffForHumans() : 'Never',
            'created_at' => $user->created_at ? Carbon::parse($user->created_at)->format('Y-m-d H:i:s') : null,
            'created_at_human' => $user->created_at ? Carbon::parse($user->created_at)->diffForHumans() : null,
            
            // Company/Host information
            'company' => $user->host ? $user->host->name : null,
            'company_id' => $user->host_id,
            
            // Team information
            'team' => $user->team ? $user->team->name : null,
            'team_id' => $user->team_id,
            
            // Plan information
            'plan' => $user->host && $user->host->plan ? [
                'name' => $user->host->plan->name,
                'price' => $user->host->plan->price,
                'currency' => $user->host->plan->currency,
                'formatted_price' => $this->formatPrice($user->host->plan->price, $user->host->plan->currency),
            ] : null,
            
            // Role information
            'role' => $user->roles->first() ? $user->roles->first()->name : 'No Role',
            'roles' => $user->roles->pluck('name')->toArray(),
            
            // Activity tracking
            'activity_count' => $user->activity_logs_count ?? 0,
            'last_activity' => $lastActivity ? Carbon::parse($lastActivity->created_at)->format('Y-m-d H:i:s') : null,
            'last_activity_human' => $lastActivity ? Carbon::parse($lastActivity->created_at)->diffForHumans() : 'No activity',
        ];
    }

    /**
     * Get single user complete details
     */
    public function getUserDetails(int $userId, bool $withDeleted = false)
    {
        $user = $this->repository->getUserById($userId, $withDeleted);
        $activityLogs = $this->repository->getUserActivityLogs($userId, 20);
        $payments = $this->repository->getUserPayments($userId, 10);

        return [
            'user' => $this->formatDetailedUserData($user),
            'activity_logs' => $this->formatActivityLogs($activityLogs),
            'payments' => $this->formatPayments($payments),
        ];
    }

    /**
     * Format detailed user data
     */
    private function formatDetailedUserData($user)
    {
        return [
            'id' => $user->id,
            'full_name' => trim($user->first_name . ' ' . $user->last_name),
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'user_name' => $user->user_name,
            'phone_number' => $user->phone_number,
            'profile_img' => $user->profile_img,
            'account_type' => $user->account_type,
            'is_active' => $user->is_active,
            'is_active_label' => $user->is_active ? 'Active' : 'Inactive',
            'is_otp_verified' => $user->is_otp_verified,
            'is_temp_password' => $user->is_temp_password,
            'real_state_designation' => $user->real_state_designation,
            'company_designation' => $user->company_designation,
            'theme_color' => $user->theme_color,
            'invoice_theme_color' => $user->invoice_theme_color,
            'last_login' => $user->last_login,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'deleted_at' => $user->deleted_at,
            
            // Host/Company details
            'host' => $user->host ? [
                'id' => $user->host->id,
                'name' => $user->host->name,
                'created_at' => $user->host->created_at,
                'plan' => $user->host->plan ? [
                    'id' => $user->host->plan->id,
                    'name' => $user->host->plan->name,
                    'price' => $user->host->plan->price,
                    'currency' => $user->host->plan->currency,
                    'formatted_price' => $this->formatPrice($user->host->plan->price, $user->host->plan->currency),
                    'features' => [
                        'monthly_invoices' => $user->host->plan->monthly_invoices,
                        'saved_clients' => $user->host->plan->saved_clients,
                        'monthly_payment_receipts' => $user->host->plan->monthly_payment_receipts,
                        'team_members' => $user->host->plan->team_members,
                        'bill_any_currency' => $user->host->plan->bill_any_currency,
                        'recurring_statements' => $user->host->plan->recurring_statements,
                        'accept_online_payments' => $user->host->plan->accept_online_payments,
                        'crm' => $user->host->plan->crm,
                    ]
                ] : null
            ] : null,
            
            // Team details
            'team' => $user->team ? [
                'id' => $user->team->id,
                'name' => $user->team->name,
                'created_at' => $user->team->created_at,
            ] : null,
            
            // Roles and Permissions
            'roles' => $user->roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('name')->toArray(),
                ];
            }),
            
            // Host User Details (custom attributes)
            'host_user_details' => $user->HostUserDetails->map(function ($detail) {
                return [
                    'type' => $detail->type,
                    'name' => $detail->name,
                    'values' => $detail->values,
                    'files' => $detail->files,
                    'is_active' => $detail->is_active,
                ];
            }),
            
            // Statistics
            'statistics' => [
                'total_activity_logs' => $user->activity_logs_count ?? 0,
                'total_invoices' => $user->invoices_count ?? 0,
            ]
        ];
    }

    /**
     * Format activity logs
     */
    private function formatActivityLogs($activityLogs)
    {
        return $activityLogs->map(function ($log) {
            return [
                'id' => $log->id,
                'type' => $log->type,
                'action' => $log->action,
                'related_id' => $log->related_id,
                'details' => $log->details,
                'created_at' => Carbon::parse($log->created_at)->format('Y-m-d H:i:s'),
                'created_at_human' => Carbon::parse($log->created_at)->diffForHumans(),
            ];
        });
    }

    /**
     * Format payments
     */
    private function formatPayments($payments)
    {
        return collect($payments)->map(function ($payment) {
            return [
                'id' => $payment->id,
                'payment_intent_id' => $payment->payment_intent_id,
                'amount' => $payment->amount,
                'formatted_amount' => $this->formatPrice($payment->amount / 100, $payment->currency),
                'currency' => $payment->currency,
                'payment_method' => $payment->payment_method,
                'status' => $payment->status,
                'created_at' => Carbon::parse($payment->created_at)->format('Y-m-d H:i:s'),
                'created_at_human' => Carbon::parse($payment->created_at)->diffForHumans(),
            ];
        });
    }

    /**
     * Format price with currency
     */
    private function formatPrice($price, $currency)
    {
        $symbols = [
            'GBP' => '£',
            'USD' => '$',
            'EUR' => '€',
        ];

        $symbol = $symbols[$currency] ?? $currency . ' ';
        return $symbol . number_format($price, 2);
    }

    /**
     * Deactivate user
     */
    public function deactivateUser(int $userId)
    {
        return $this->repository->deactivateUser($userId);
    }

    /**
     * Activate user
     */
    public function activateUser(int $userId)
    {
        return $this->repository->activateUser($userId);
    }

    /**
     * Delete user
     */
    public function deleteUser(int $userId)
    {
        return $this->repository->deleteUser($userId);
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats()
    {
        return $this->repository->getDashboardStats();
    }

    /**
     * Get filter options (hosts, plans, roles)
     */
    public function getFilterOptions()
    {
        return [
            'hosts' => $this->repository->getAllHosts(),
            'plans' => $this->repository->getAllPlans(),
            'roles' => $this->getAvailableRoles(),
        ];
    }

    /**
     * Get available roles
     */
    private function getAvailableRoles()
    {
        return \Spatie\Permission\Models\Role::select('id', 'name')
            ->orderBy('name')
            ->get();
    }
}
