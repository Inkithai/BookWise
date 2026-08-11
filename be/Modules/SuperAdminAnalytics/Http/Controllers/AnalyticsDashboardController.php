<?php

namespace Modules\SuperAdminAnalytics\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Modules\SuperAdminAnalytics\Services\AnalyticsService;

class AnalyticsDashboardController extends Controller
{
    public function __construct(private readonly AnalyticsService $service) 
    {
        $this->middleware(function ($request, $next) {
            if (!auth()->user() || !auth()->user()->hasRole('super-admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Super Admin privileges required.'
                ], 403);
            }
            return $next($request);
        });
    }

    public function index(): JsonResponse
    {
        try {
            $data = $this->service->getDashboardData();
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to load dashboard data.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
