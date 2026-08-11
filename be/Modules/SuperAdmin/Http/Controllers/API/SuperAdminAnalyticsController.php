<?php

namespace Modules\SuperAdmin\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Subscription\VipPlanService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Modules\SuperAdmin\Services\SuperAdminService;
use Modules\SuperAdmin\Services\SubscriptionFinanceService;
use Modules\User\Models\User;

class SuperAdminAnalyticsController extends Controller
{
    protected $superAdminService;

    public function __construct(
        SuperAdminService $superAdminService,
        private readonly SubscriptionFinanceService $subscriptionFinance,
        private readonly VipPlanService $vipPlanService,
    ) {
        $this->superAdminService = $superAdminService;
    }

    /**
     * Get all users with pagination and filters
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getAllUsers(Request $request): JsonResponse
    {
        try {
            $filters = $request->only([
                'search',
                'is_active',
                'account_type',
                'is_otp_verified',
                'role',
                'host_id',
                'created_from',
                'created_to',
                'sort_by',
                'sort_order',
                'include_deleted'
            ]);

            $perPage = $request->input('per_page', 20);

            $result = $this->superAdminService->getAllUsers($filters, $perPage);

            return response()->json([
                'success' => true,
                'message' => 'Users retrieved successfully',
                'data' => $result
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single user complete details
     * 
     * @param int $userId
     * @param Request $request
     * @return JsonResponse
     */
    public function getUserDetails(int $userId, Request $request): JsonResponse
    {
        try {
            $withDeleted = $request->input('with_deleted', false);
            
            $result = $this->superAdminService->getUserDetails($userId, $withDeleted);

            return response()->json([
                'success' => true,
                'message' => 'User details retrieved successfully',
                'data' => $result
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deactivate user (set is_active = 0)
     * 
     * @param int $userId
     * @return JsonResponse
     */
    public function deactivateUser(int $userId): JsonResponse
    {
        try {
            $this->superAdminService->deactivateUser($userId);

            return response()->json([
                'success' => true,
                'message' => 'User deactivated successfully. The user can no longer login.',
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activate user (set is_active = 1)
     * 
     * @param int $userId
     * @return JsonResponse
     */
    public function activateUser(int $userId): JsonResponse
    {
        try {
            $this->superAdminService->activateUser($userId);

            return response()->json([
                'success' => true,
                'message' => 'User activated successfully. The user can now login.',
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to activate user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft delete user
     * 
     * @param int $userId
     * @return JsonResponse
     */
    public function deleteUser(int $userId): JsonResponse
    {
        try {
            $this->superAdminService->deleteUser($userId);

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully. User data is preserved and can be restored.',
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     * 
     * @return JsonResponse
     */
    public function getDashboardStats(): JsonResponse
    {
        try {
            $stats = $this->superAdminService->getDashboardStats();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard statistics retrieved successfully',
                'data' => $stats
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dashboard statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Per-plan host counts, MRR, and monthly payment totals (super-admin only).
     */
    public function getSubscriptionFinance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        try {
            return response()->json([
                'success' => true,
                'message' => 'Subscription financial overview retrieved successfully',
                'data' => $this->subscriptionFinance->getOverview(
                    $validated['start_date'] ?? null,
                    $validated['end_date'] ?? null,
                ),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve subscription financial overview',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Host-level subscription rows for a plan and date range (super-admin only).
     */
    public function getSubscriptionFinanceHosts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => 'required|string|max:64',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        try {
            return response()->json([
                'success' => true,
                'message' => 'Subscription host details retrieved successfully',
                'data' => $this->subscriptionFinance->getHostsForPlan(
                    $validated['plan'],
                    $validated['start_date'] ?? null,
                    $validated['end_date'] ?? null,
                ),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve subscription host details',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get filter options (hosts, plans, roles)
     * 
     * @return JsonResponse
     */
    public function getFilterOptions(): JsonResponse
    {
        try {
            $options = $this->superAdminService->getFilterOptions();

            return response()->json([
                'success' => true,
                'message' => 'Filter options retrieved successfully',
                'data' => $options
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve filter options',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign VIP plan to a user (full access, no subscription billing).
     */
    public function assignUserVipPlan(int $userId): JsonResponse
    {
        try {
            $user = User::query()->findOrFail($userId);
            $subscription = $this->vipPlanService->assignUser($user);

            return response()->json([
                'success' => true,
                'message' => 'VIP plan assigned successfully.',
                'data' => [
                    'subscription' => $subscription->fresh('plan'),
                ],
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign VIP plan',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
