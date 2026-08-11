<?php

namespace Modules\SuperAdminAnalytics\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\SuperAdminAnalytics\Services\AnalyticsService;

class AnalyticsInvoicesController extends Controller
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

    // GET /api/analytics/invoices
    public function index(Request $request): JsonResponse
    {
        try {
            $data = $this->service->getInvoices($request->only([
                'search', 'status', 'user_id', 'page', 'per_page',
                'date_from', 'date_to', 'sort_by', 'sort_dir',
            ]));
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to load invoices.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
