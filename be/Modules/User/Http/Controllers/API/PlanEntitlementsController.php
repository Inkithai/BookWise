<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

/**
 * Invoice-side plan features & limits used for UI display and server validation.
 * Billing/pricing lives on api.bookwise.io — this endpoint is entitlements only.
 */
class PlanEntitlementsController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'name', 'description', 'features', 'limits', 'is_free', 'is_vip', 'is_public', 'is_active', 'trial_eligible', 'sort_order', 'monthly_price', 'yearly_price']);

        $catalogSync = collect(config('plan_catalog.plans', []))
            ->keyBy('slug')
            ->map(fn ($row) => $row['platform_plan_slug'] ?? $row['slug']);

        $slugMap = config('subscription.platform_to_app_plan_slug', []);
        $invoiceToPlatform = [];
        foreach ($slugMap as $platform => $invoice) {
            $invoiceToPlatform[strtolower((string) $invoice)] = $platform;
        }

        $data = $plans->map(function (Plan $plan) use ($invoiceToPlatform, $catalogSync) {
            return [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'platform_plan_slug' => $catalogSync->get($plan->slug)
                    ?? $invoiceToPlatform[$plan->slug]
                    ?? $plan->slug,
                'name' => $plan->name,
                'description' => $plan->description,
                'is_free' => (bool) $plan->is_free,
                'is_vip' => (bool) $plan->is_vip,
                'is_public' => (bool) $plan->is_public,
                'is_active' => (bool) $plan->is_active,
                'trial_eligible' => (bool) $plan->trial_eligible,
                'features' => $plan->features ?? [],
                'limits' => $plan->limits ?? [],
                'monthly_price' => (float) $plan->monthly_price,
                'yearly_price' => (float) $plan->yearly_price,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'billing_provider' => 'bookwise',
                'billing_api' => rtrim((string) config('services.bookwise.url', ''), '/') . '/api/v1/plans',
            ],
        ]);
    }
}
