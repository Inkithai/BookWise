<?php

namespace Modules\Analytics\Services;

use Modules\User\Models\User;
use Modules\Invoice\Models\Invoice;
use App\Models\InvoiceClient;
use App\Models\Team;
use App\Enums\InvoiceStatus;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    private function resolveActiveHostId(): ?int
    {
        $user = auth()->user();
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
        return $user->host_id;
    }

    /**
     * Get overall dashboard statistics
     */
    public function getDashboardOverview()
    {
        $totalUsers = User::where('is_active', 1)->count();
        $totalInvoices = Invoice::count();
        $totalClients = InvoiceClient::count();
        
        // Sub users are users with the 'team-member' role (consistent with getSubUsers logic)
        $subUsers = User::where('is_active', 1)
            ->whereHas('roles', function ($query) {
                $query->where('name', 'team-member');
            })
            ->count();
        
        // Calculate average invoices per user
        $avgInvoicesPerUser = $totalUsers > 0 
            ? round($totalInvoices / $totalUsers, 1) 
            : 0;

        return [
            'total_users' => $totalUsers,
            'total_invoices' => $totalInvoices,
            'total_clients' => $totalClients,
            'sub_users' => $subUsers,
            'avg_invoices_per_user' => $avgInvoicesPerUser,
        ];
    }

    /**
     * Get list of all active users for dropdown and users list page
     */
    public function getUsersList()
    {
        $authUser = auth()->user();
        $isSuperAdmin = is_null($authUser->host_id);
        $hostId = $this->resolveActiveHostId();

        $query = User::with(['roles', 'host'])
            ->select(
                'id',
                'first_name',
                'last_name',
                'email',
                'user_name',
                'phone_number',
                'account_type',
                'is_active',
                'host_id',
                'team_id',
                'created_at'
            );

        // Regular admins only see users under their own host
        if (!$isSuperAdmin && $hostId) {
            $query->where('host_id', $hostId);
        }

        return $query->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($user) {
                return [
                    'id'           => $user->id,
                    'name'         => trim($user->first_name . ' ' . $user->last_name) ?: $user->user_name,
                    'full_name'    => trim($user->first_name . ' ' . $user->last_name),
                    'first_name'   => $user->first_name,
                    'last_name'    => $user->last_name,
                    'user_name'    => $user->user_name,
                    'email'        => $user->email,
                    'phone_number' => $user->phone_number,
                    'account_type' => $user->account_type,
                    'is_active'    => $user->is_active,
                    'company_id'   => $user->host_id,
                    'company_name' => $user->host ? $user->host->name : null,
                    'team_id'      => $user->team_id,
                    'role'         => $user->roles->first() ? $user->roles->first()->name : 'No Role',
                    'created_at'   => $user->created_at ? $user->created_at->format('M d, Y') : null,
                ];
            });
    }

    /**
     * Get analytics for a specific user
     */
    public function getUserAnalytics($userId)
    {
        $user = User::findOrFail($userId);

        return [
            'user_info' => $this->getUserInfo($user),
            'invoice_statistics' => $this->getInvoiceStatistics($userId),
            'invoice_status_distribution' => $this->getInvoiceStatusDistribution($userId),
            'client_distribution' => $this->getClientDistribution($userId),
            'sub_users' => $this->getSubUsers($userId),
        ];
    }

    /**
     * Get basic user information
     */
    private function getUserInfo($user)
    {
        return [
            'id' => $user->id,
            'name' => trim($user->first_name . ' ' . $user->last_name) ?: $user->user_name,
            'email' => $user->email,
        ];
    }

    /**
     * Get invoice statistics for a user
     */
    private function getInvoiceStatistics($userId)
    {
        // Get user's invoices
        $userInvoices = Invoice::where('created_by', $userId)
            ->get();

        $invoiceCount = $userInvoices->count();
        $totalAmount = $userInvoices->sum('final_amount');

        // Get max invoice count and amount across all users for percentage calculation
        $maxInvoiceData = Invoice::select('created_by', DB::raw('COUNT(*) as count'), DB::raw('SUM(final_amount) as total'))
            ->whereNotNull('created_by')
            ->groupBy('created_by')
            ->orderByDesc('count')
            ->first();

        $maxInvoiceCount = $maxInvoiceData->count ?? 1;
        $maxInvoiceAmount = $maxInvoiceData->total ?? 1;

        $percentageOfMax = $maxInvoiceCount > 0 
            ? round(($invoiceCount / $maxInvoiceCount) * 100, 1) 
            : 0;

        return [
            'invoice_count' => $invoiceCount,
            'total_amount' => round($totalAmount, 2),
            'formatted_amount' => '£' . number_format($totalAmount, 0),
            'percentage_of_max' => $percentageOfMax,
        ];
    }

    /**
     * Get invoice status distribution for a user
     */
    private function getInvoiceStatusDistribution($userId)
    {
        $totalInvoices = Invoice::where('created_by', $userId)
            ->count();

        // Build distribution for all statuses
        $allStatuses = [
            InvoiceStatus::Paid->value => 'Paid',
            InvoiceStatus::MailSent->value => 'Mail Sent',
            InvoiceStatus::Created->value => 'Created',
            InvoiceStatus::Rejected->value => 'Rejected',
            InvoiceStatus::NotPaid->value => 'Not Paid',
            InvoiceStatus::InstallmentPayment->value => 'Installment Payment',
            InvoiceStatus::ReceiptSent->value => 'Receipt Sent',
            InvoiceStatus::Draft->value => 'Draft',
        ];

        $distribution = [];

        if ($totalInvoices === 0) {
            // Return empty distribution with all statuses at 0
            foreach ($allStatuses as $statusValue => $statusLabel) {
                $distribution[] = [
                    'status' => $statusValue,
                    'status_label' => $statusLabel,
                    'count' => 0,
                    'percentage' => 0,
                ];
            }
        } else {
            // Get status counts
            $statusCounts = Invoice::where('created_by', $userId)
                ->select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->get()
                ->mapWithKeys(function ($item) {
                    // Convert enum to string value for keying
                    $statusValue = $item->status instanceof InvoiceStatus 
                        ? $item->status->value 
                        : $item->status;
                    return [$statusValue => $item];
                });

            foreach ($allStatuses as $statusValue => $statusLabel) {
                $statusData = $statusCounts->get($statusValue);
                $count = $statusData ? $statusData->count : 0;
                $percentage = round(($count / $totalInvoices) * 100, 1);

                $distribution[] = [
                    'status' => $statusValue,
                    'status_label' => $statusLabel,
                    'count' => $count,
                    'percentage' => $percentage,
                ];
            }
        }

        return [
            'total_invoices' => $totalInvoices,
            'distribution' => $distribution,
        ];
    }

    /**
     * Get client distribution for a user
     */
    private function getClientDistribution($userId)
    {
        $user = User::find($userId);
        
        if (!$user || !$user->host_id) {
            return [
                'clients_count' => 0,
                'percentage_of_total' => 0,
                'avg_clients_per_user' => 0,
            ];
        }

        // Get clients for this user's host
        $clientsCount = InvoiceClient::where('host_id', $user->host_id)->count();

        // Get total clients across all hosts
        $totalClients = InvoiceClient::count();

        $percentageOfTotal = $totalClients > 0 
            ? round(($clientsCount / $totalClients) * 100, 1) 
            : 0;

        // Average clients per user in the system
        $totalUsers = User::where('is_active', 1)->count();
        $avgClientsPerUser = $totalUsers > 0 
            ? round($totalClients / $totalUsers, 1) 
            : 0;

        return [
            'clients_count' => $clientsCount,
            'percentage_of_total' => $percentageOfTotal,
            'avg_clients_per_user' => $avgClientsPerUser,
        ];
    }

    /**
     * Get sub-users for a user.
     * - Super Admin (host_id = null): shows ALL active admins + team-members system-wide.
     * - Regular admin: shows team-members sharing the same host_id.
     */
    private function getSubUsers($userId)
    {
        $user = User::with('roles')->find($userId);

        if (!$user) {
            return [
                'total' => 0,
                'team_info' => null,
                'current_user_role' => 'Member',
                'sub_users_list' => [],
            ];
        }

        $currentUserRole = $user->roles->first()->name ?? 'Member';
        $isSuperAdmin = $currentUserRole === 'super-admin' || is_null($user->host_id);

        if ($isSuperAdmin) {
            // Super Admin: show all active admins and team-members across the system
            $subUsers = User::with('roles')
                ->where('is_active', 1)
                ->where('id', '!=', $userId)
                ->select('id', 'first_name', 'last_name', 'email', 'user_name', 'team_id')
                ->get()
                ->filter(function ($member) {
                    $role = $member->roles->first();
                    return $role && in_array($role->name, ['admin', 'team-member']);
                })
                ->map(function ($member) {
                    $team = $member->team_id ? Team::find($member->team_id) : null;
                    return [
                        'id' => $member->id,
                        'name' => trim($member->first_name . ' ' . $member->last_name) ?: $member->user_name,
                        'email' => $member->email,
                        'role' => $member->roles->first()->name ?? 'Member',
                        'team' => $team ? ($team->name ?? 'Team #' . $team->id) : null,
                    ];
                })
                ->values();
        } else {
            // Regular admin: show team-members under the same host
            if (!$user->host_id) {
                return [
                    'total' => 0,
                    'team_info' => null,
                    'current_user_role' => $currentUserRole,
                    'sub_users_list' => [],
                ];
            }

            $subUsers = User::with('roles')
                ->where('host_id', $user->host_id)
                ->where('is_active', 1)
                ->where('id', '!=', $userId)
                ->select('id', 'first_name', 'last_name', 'email', 'user_name', 'team_id')
                ->get()
                ->filter(function ($member) {
                    $role = $member->roles->first();
                    return $role && $role->name === 'team-member';
                })
                ->map(function ($member) {
                    $team = $member->team_id ? Team::find($member->team_id) : null;
                    return [
                        'id' => $member->id,
                        'name' => trim($member->first_name . ' ' . $member->last_name) ?: $member->user_name,
                        'email' => $member->email,
                        'role' => $member->roles->first()->name ?? 'Member',
                        'team' => $team ? ($team->name ?? 'Team #' . $team->id) : null,
                    ];
                })
                ->values();
        }

        return [
            'total' => $subUsers->count(),
            'team_info' => null,
            'current_user_role' => $currentUserRole,
            'sub_users_list' => $subUsers,
        ];
    }
}
