<?php

namespace Modules\Analytics\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Analytics\Services\AnalyticsService;

/**
 * @OA\Tag(
 *     name="Analytics",
 *     description="Analytics and Dashboard Statistics API"
 * )
 */
class AnalyticsController extends Controller
{
    protected AnalyticsService $analyticsService;

    public function __construct(AnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get overall dashboard statistics
     * 
     * @OA\Get(
     *     path="/api/v1/admin/analytics/dashboard",
     *     tags={"Analytics"},
     *     summary="Get overall dashboard statistics",
     *     description="Returns total users, invoices, clients, and sub-users count",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Dashboard statistics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Dashboard statistics retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="total_users", type="integer", example=12),
     *                 @OA\Property(property="total_invoices", type="integer", example=165),
     *                 @OA\Property(property="total_clients", type="integer", example=52),
     *                 @OA\Property(property="sub_users", type="integer", example=15),
     *                 @OA\Property(property="avg_invoices_per_user", type="number", example=13.8)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized"
     *     )
     * )
     */
    public function getDashboard(): JsonResponse
    {
        try {
            $data = $this->analyticsService->getDashboardOverview();

            return response()->json([
                'status' => 'success',
                'message' => 'Dashboard statistics retrieved successfully',
                'data' => $data,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve dashboard statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get list of all users for dropdown
     * 
     * @OA\Get(
     *     path="/api/v1/admin/analytics/users",
     *     tags={"Analytics"},
     *     summary="Get list of all active users",
     *     description="Returns list of users for dropdown selection",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Users list retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Users list retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="John Doe"),
     *                     @OA\Property(property="email", type="string", example="john@example.com")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized"
     *     )
     * )
     */
    public function getUsersList(): JsonResponse
    {
        try {
            $users = $this->analyticsService->getUsersList();

            return response()->json([
                'status' => 'success',
                'message' => 'Users list retrieved successfully',
                'data' => $users,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve users list',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get analytics for a specific user
     * 
     * @OA\Get(
     *     path="/api/v1/admin/analytics/user/{userId}",
     *     tags={"Analytics"},
     *     summary="Get analytics for a specific user",
     *     description="Returns detailed analytics including invoice statistics, status distribution, client distribution, and sub-users",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="userId",
     *         in="path",
     *         required=true,
     *         description="User ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="User analytics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="User analytics retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(
     *                     property="user_info",
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="John Doe"),
     *                     @OA\Property(property="email", type="string", example="john@example.com")
     *                 ),
     *                 @OA\Property(
     *                     property="invoice_statistics",
     *                     type="object",
     *                     @OA\Property(property="invoice_count", type="integer", example=45),
     *                     @OA\Property(property="total_amount", type="number", example=125000.00),
     *                     @OA\Property(property="formatted_amount", type="string", example="£125,000"),
     *                     @OA\Property(property="percentage_of_max", type="number", example=100.0)
     *                 ),
     *                 @OA\Property(
     *                     property="invoice_status_distribution",
     *                     type="object",
     *                     @OA\Property(property="total_invoices", type="integer", example=45),
     *                     @OA\Property(
     *                         property="distribution",
     *                         type="array",
     *                         @OA\Items(
     *                             @OA\Property(property="status", type="string", example="Paid"),
     *                             @OA\Property(property="status_label", type="string", example="Paid"),
     *                             @OA\Property(property="count", type="integer", example=25),
     *                             @OA\Property(property="percentage", type="number", example=55.6)
     *                         )
     *                     )
     *                 ),
     *                 @OA\Property(
     *                     property="client_distribution",
     *                     type="object",
     *                     @OA\Property(property="clients_count", type="integer", example=15),
     *                     @OA\Property(property="percentage_of_total", type="number", example=100.0),
     *                     @OA\Property(property="avg_clients_per_user", type="number", example=15.0)
     *                 ),
     *                 @OA\Property(
     *                     property="sub_users",
     *                     type="object",
     *                     @OA\Property(property="total", type="integer", example=5),
     *                     @OA\Property(
     *                         property="team_info",
     *                         type="object",
     *                         @OA\Property(property="id", type="integer", example=1),
     *                         @OA\Property(property="name", type="string", example="Team Alpha")
     *                     ),
     *                     @OA\Property(property="current_user_role", type="string", example="admin"),
     *                     @OA\Property(
     *                         property="sub_users_list",
     *                         type="array",
     *                         @OA\Items(
     *                             @OA\Property(property="id", type="integer", example=2),
     *                             @OA\Property(property="name", type="string", example="Jane Smith"),
     *                             @OA\Property(property="email", type="string", example="jane@example.com"),
     *                             @OA\Property(property="role", type="string", example="team-member")
     *                         )
     *                     )
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="User not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized"
     *     )
     * )
     */
    public function getUserAnalytics($userId): JsonResponse
    {
        try {
            $analytics = $this->analyticsService->getUserAnalytics($userId);

            return response()->json([
                'status' => 'success',
                'message' => 'User analytics retrieved successfully',
                'data' => $analytics,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'User not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve user analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
