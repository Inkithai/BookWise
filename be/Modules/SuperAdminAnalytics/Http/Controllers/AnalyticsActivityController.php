<?php

namespace Modules\SuperAdminAnalytics\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\SuperAdminAnalytics\Services\AnalyticsService;

class AnalyticsActivityController extends Controller
{
    public function __construct(private readonly AnalyticsService $service) {}

    // GET /api/analytics/activity-logs
    public function index(Request $request): JsonResponse
    {
        try {
            $data = $this->service->getActivityLogs($request->only([
                'search', 'type', 'status', 'account_type', 'page', 'per_page',
            ]));
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to load activity logs.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
