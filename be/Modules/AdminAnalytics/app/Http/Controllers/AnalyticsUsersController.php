<?php

namespace Modules\AdminAnalytics\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\User\Models\User;
use Throwable;

class AnalyticsUsersController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    private function getHostId(): ?int
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
        return $user->host_id > 0 ? (int) $user->host_id : null;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $hostId      = $this->getHostId();
            $search      = $request->input('search');
            $status      = $request->input('status', 'all');
            $accountType = $request->input('account_type', 'all');
            $page        = max(1, (int) $request->input('page', 1));
            $perPage     = min(100, max(1, (int) $request->input('per_page', 10)));

            $query = User::with('roles');
            if ($hostId !== null) $query->where('host_id', $hostId);
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name',  'like', "%{$search}%")
                      ->orWhere('user_name',  'like', "%{$search}%")
                      ->orWhere('email',      'like', "%{$search}%");
                });
            }
            if ($status !== 'all')      $query->where('is_active', $status === 'active' ? 1 : 0);
            if ($accountType !== 'all') $query->where('account_type', $accountType);

            $total = $query->count();
            $users = $query->orderByDesc('created_at')
                ->skip(($page - 1) * $perPage)->take($perPage)->get();

            $summaryQ = User::query();
            if ($hostId !== null) $summaryQ->where('host_id', $hostId);
            $allUsers      = $summaryQ->count();
            $activeUsers   = (clone $summaryQ)->where('is_active', 1)->count();
            $inactiveUsers = $allUsers - $activeUsers;

            // Fetch all host users once to avoid N+1
            $allHostUsers = User::query();
            if ($hostId !== null) $allHostUsers->where('host_id', $hostId);
            $allHostUsers = $allHostUsers->get(['id', 'first_name', 'last_name', 'user_name', 'email', 'is_active', 'account_type', 'host_id']);

            // Get unique host IDs to calculate actual sub users
            $uniqueHostIds = $allHostUsers->pluck('host_id')->unique()->filter()->count();
            $totalSubUsers = $allUsers - $uniqueHostIds; // Sub users = Total users - Unique hosts

            $items = $users->map(function ($u) use ($allHostUsers) {
                // Sub users are users who share the same host_id (excluding the user themselves)
                $subUsers    = $allHostUsers->where('host_id', $u->host_id)->where('id', '!=', $u->id)->values();
                $subUserList = $subUsers->map(fn($su) => [
                    'id'           => $su->id,
                    'full_name'    => trim("{$su->first_name} {$su->last_name}") ?: $su->user_name,
                    'email'        => $su->email,
                    'is_active'    => (bool) $su->is_active,
                    'account_type' => $su->account_type ?? 'personal',
                ])->toArray();

                return [
                    'id'             => $u->id,
                    'full_name'      => trim("{$u->first_name} {$u->last_name}") ?: $u->user_name,
                    'first_name'     => $u->first_name,
                    'last_name'      => $u->last_name,
                    'user_name'      => $u->user_name,
                    'email'          => $u->email,
                    'phone_number'   => $u->phone_number,
                    'account_type'   => $u->account_type ?? 'personal',
                    'is_active'      => (bool) $u->is_active,
                    'created_at'     => $u->created_at?->toIso8601String(),
                    'sub_users'      => $subUserList,
                    'sub_user_count' => count($subUserList),
                    'company_id'     => $u->company_id ?? null,
                ];
            });

            return response()->json([
                'success'    => true,
                'data'       => $items,
                'pagination' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
                'summary'    => [
                    'total'     => $allUsers,
                    'active'    => $activeUsers,
                    'inactive'  => $inactiveUsers,
                    'sub_users' => $totalSubUsers,
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsUsersController@index: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load users.', 'error' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }
}