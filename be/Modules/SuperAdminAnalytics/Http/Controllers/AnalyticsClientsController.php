<?php

namespace Modules\SuperAdminAnalytics\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\SuperAdminAnalytics\Services\AnalyticsService;

class AnalyticsClientsController extends Controller
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

    // GET /api/analytics/clients
    public function index(Request $request): JsonResponse
    {
        try {
            $data = $this->service->getClients($request->only([
                'search', 'status', 'user_id', 'page', 'per_page',
            ]));
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to load clients.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
