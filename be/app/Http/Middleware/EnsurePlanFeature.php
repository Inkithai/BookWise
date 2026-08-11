<?php

namespace App\Http\Middleware;

use App\Services\Subscription\SubscriptionPlanService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlanFeature
{
    public function __construct(
        private readonly SubscriptionPlanService $plans
    ) {}

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($this->plans->canUseFeature($user, $feature)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Your current plan does not include this feature. Please upgrade your subscription.',
            'code' => 'plan_feature_restricted',
            'feature' => $feature,
        ], 403);
    }
}
