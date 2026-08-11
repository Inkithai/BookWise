<?php

namespace Modules\SuperAdmin\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Services\Subscription\BookWisePlanAdminClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanManagementController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()->orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    /**
     * Invoice entitlements + BookWise billing plans for super-admin /plans UI.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $invoicePlans = Plan::query()->orderBy('sort_order')->get();
        $client = app(BookWisePlanAdminClient::class);
        $syncResult = $client->listPlans(
            $request->boolean('include_hidden', true),
            $request->user()?->email,
        );
        $syncLoaded = (bool) ($syncResult['success'] ?? false);

        return response()->json([
            'success' => true,
            'data' => [
                'invoice_plans' => $invoicePlans,
                'sync_plans' => $syncLoaded ? ($syncResult['data'] ?? []) : [],
            ],
            'meta' => [
                'platform_configured' => $client->isConfigured(),
                'platform_loaded' => $syncLoaded,
                'platform_error' => $syncLoaded ? null : ($syncResult['message'] ?? 'Could not load BookWise plans.'),
            ],
        ]);
    }

    /**
     * BookWise billing plans (proxied server-to-server for super-admin /plans).
     */
    public function listPlatformPlans(Request $request): JsonResponse
    {
        $client = app(BookWisePlanAdminClient::class);
        $result = $client->listPlans(
            $request->boolean('include_hidden', true),
            $request->user()?->email,
        );

        if (! ($result['success'] ?? false)) {
            $status = $client->isConfigured() ? 502 : 503;

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Could not load BookWise plans.',
                'data' => [],
            ], $status);
        }

        return response()->json([
            'success' => true,
            'data' => $result['data'] ?? [],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $plan = Plan::query()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $plan,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $plan = Plan::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Plan created successfully.',
            'data' => $plan,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $plan = Plan::query()->findOrFail($id);
        $plan->update($this->validated($request, $plan));

        return response()->json([
            'success' => true,
            'message' => 'Plan updated successfully.',
            'data' => $plan->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $plan = Plan::query()->findOrFail($id);
        $plan->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Plan deactivated successfully.',
        ]);
    }

    /**
     * Toggle Invoice-side plan visibility for the upgrade page and validation.
     */
    public function updateInvoiceVisibility(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'is_public' => 'sometimes|boolean',
        ]);

        if (! array_key_exists('is_active', $data) && ! array_key_exists('is_public', $data)) {
            return response()->json([
                'success' => false,
                'message' => 'Provide is_active and/or is_public.',
            ], 422);
        }

        $invoiceSlug = $this->resolveInvoiceSlug($slug);
        $plan = Plan::query()->where('slug', $invoiceSlug)->first();

        if (! $plan) {
            $catalog = collect(config('plan_catalog.plans', []))->firstWhere('slug', $invoiceSlug);
            if (! $catalog) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice plan not found for slug: ' . $invoiceSlug,
                ], 404);
            }

            $plan = Plan::create([
                'slug' => $invoiceSlug,
                'name' => $catalog['name'],
                'description' => $catalog['description'] ?? null,
                'monthly_price' => $catalog['monthly_price'] ?? 0,
                'yearly_price' => $catalog['yearly_price'] ?? 0,
                'currency' => config('plan_catalog.currency', 'GBP'),
                'is_free' => (bool) ($catalog['is_free'] ?? false),
                'is_vip' => (bool) ($catalog['is_vip'] ?? false),
                'is_public' => (bool) ($data['is_public'] ?? ($catalog['is_public'] ?? true)),
                'is_active' => (bool) ($data['is_active'] ?? ($catalog['is_active'] ?? true)),
                'trial_eligible' => (bool) ($catalog['trial_eligible'] ?? false),
                'sort_order' => (int) ($catalog['sort_order'] ?? 0),
                'features' => $catalog['features'] ?? [],
                'limits' => $catalog['limits'] ?? [],
            ]);
        } else {
            $plan->update($data);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice plan visibility updated.',
            'data' => $plan->fresh(),
        ]);
    }

    /**
     * Toggle BookWise billing plan visibility (server-to-server via api-key).
     */
    public function updatePlatformVisibility(Request $request, int $syncPlanId): JsonResponse
    {
        $data = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $result = app(BookWisePlanAdminClient::class)->updatePlanVisibility(
            $syncPlanId,
            (bool) $data['is_active'],
            $request->user()?->email,
        );

        if (! ($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Could not update BookWise plan.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'BookWise plan visibility updated.',
            'data' => $result['data'] ?? null,
        ]);
    }

    /**
     * Update Invoice-side feature flags and limits only (billing lives on BookWise).
     *
     * @param  string  $slug  Invoice plan slug or BookWise plan slug (e.g. pro → starter)
     */
    public function updateEntitlements(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'features' => 'required|array',
            'limits' => 'required|array',
            'name' => 'nullable|string|max:150',
        ]);

        $invoiceSlug = $this->resolveInvoiceSlug($slug);

        $plan = Plan::query()->where('slug', $invoiceSlug)->first();

        if (! $plan) {
            $plan = Plan::create([
                'slug' => $invoiceSlug,
                'name' => $data['name'] ?? ucfirst(str_replace('-', ' ', $invoiceSlug)),
                'description' => 'Entitlements for BookWise plan: ' . $slug,
                'monthly_price' => 0,
                'yearly_price' => 0,
                'currency' => config('subscription.currency', 'gbp'),
                'is_free' => $invoiceSlug === 'free',
                'is_active' => true,
                'features' => $data['features'],
                'limits' => $data['limits'],
            ]);
        } else {
            $plan->update([
                'features' => $data['features'],
                'limits' => $data['limits'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Plan entitlements updated successfully.',
            'data' => $plan->fresh(),
        ]);
    }

    private function resolveInvoiceSlug(string $slug): string
    {
        $slug = strtolower(trim($slug));
        $map = config('subscription.platform_to_app_plan_slug', []);

        return (string) ($map[$slug] ?? $slug);
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'slug' => 'sometimes|string|max:100|unique:plans,slug,' . ($plan?->id ?? 'NULL'),
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'monthly_price' => 'required|numeric|min:0',
            'yearly_price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'is_free' => 'boolean',
            'is_vip' => 'boolean',
            'is_public' => 'boolean',
            'is_active' => 'boolean',
            'trial_eligible' => 'boolean',
            'sort_order' => 'integer|min:0',
            'features' => 'nullable|array',
            'limits' => 'nullable|array',
        ]);

        if (! isset($data['slug']) && ! $plan) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        }

        return $data;
    }
}
