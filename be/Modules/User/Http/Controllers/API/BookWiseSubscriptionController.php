<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Subscription\BookWiseSubscriptionClient;
use App\Services\Subscription\SubscriptionSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\User\Http\Resources\UserResource;
use Modules\User\Models\User;

/**
 * Syncs BookWise (api.bookwise.io) subscription state into Invoice for validation.
 * Payments and reminder emails are handled on the BookWise platform.
 */
class BookWiseSubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionSyncService $syncService,
        private readonly BookWiseSubscriptionClient $syncClient,
    ) {
        $this->middleware(['auth:api', 'otp.verified'])->except(['pushFromBookWise']);
    }

    public function sync(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->syncClient->isConfigured()) {
            $subscription = $this->syncService->ensureLocalTrialOrFree($user);

            return response()->json([
                'success' => true,
                'message' => 'Subscription synced locally (BookWise API is not configured).',
                'data' => [
                    'subscription' => $subscription->fresh('plan'),
                ],
                'meta' => [
                    'platform_row_found' => false,
                    'platform_plan_slug' => null,
                    'platform_configured' => false,
                ],
                'user' => new UserResource($user->fresh()),
            ]);
        }

        $syncRow = $this->syncClient->getInvoiceFeatureSubscription($user->email);
        $subscription = $this->syncService->syncFromBookWise($user);

        return response()->json([
            'success' => true,
            'message' => $syncRow
                ? 'Subscription synced from BookWise.'
                : 'Subscription unchanged — BookWise returned no invoice feature (use apply-platform-plan after checkout or deploy platform invoice-feature endpoint).',
            'data' => [
                'subscription' => $subscription->fresh('plan'),
            ],
            'meta' => [
                'platform_row_found' => $syncRow !== null,
                'platform_plan_slug' => $syncRow['plan']['slug'] ?? null,
            ],
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Called by BookWise frontend immediately after platform confirm-payment.
     */
    public function applyPlatformPlan(Request $request): JsonResponse
    {
        $request->validate([
            'platform_plan_slug' => 'required|string|max:64',
            'subscription_type' => 'nullable|string|in:paid,free,trial',
            'amount' => 'nullable|numeric|min:0',
            'billing_interval' => 'nullable|string|in:monthly,yearly',
        ]);

        $user = $request->user();

        try {
            $subscription = $this->syncService->applyFromPlatformPlan(
                $user,
                (string) $request->input('platform_plan_slug'),
                (string) $request->input('subscription_type', 'paid'),
                $request->has('amount') ? (float) $request->input('amount') : null,
                (string) $request->input('billing_interval', 'monthly'),
            );
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice subscription updated from BookWise plan.',
            'data' => [
                'subscription' => $subscription->fresh('plan'),
            ],
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Server push from BookWise all-be after successful checkout (api-key only).
     */
    public function pushFromBookWise(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'platform_plan_slug' => 'required|string|max:64',
            'subscription_type' => 'nullable|string|in:paid,free,trial',
            'amount' => 'nullable|numeric|min:0',
            'billing_interval' => 'nullable|string|in:monthly,yearly',
        ]);

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower(trim((string) $request->input('email')))])
            ->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice user not found for this email.',
            ], 404);
        }

        $subscription = $this->syncService->applyFromPlatformPlan(
            $user,
            (string) $request->input('platform_plan_slug'),
            (string) $request->input('subscription_type', 'paid'),
            $request->has('amount') ? (float) $request->input('amount') : null,
            (string) $request->input('billing_interval', 'monthly'),
        );

        return response()->json([
            'success' => true,
            'message' => 'Invoice subscription updated.',
            'data' => ['subscription' => $subscription->fresh('plan')],
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $syncRow = $this->syncClient->getInvoiceFeatureSubscription($user->email);

        return response()->json([
            'success' => true,
            'data' => [
                'bookwise' => $syncRow,
                'configured' => $this->syncClient->isConfigured(),
            ],
        ]);
    }
}
