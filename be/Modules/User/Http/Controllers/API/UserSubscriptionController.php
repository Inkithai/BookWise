<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\UserSubscription;
use App\Services\Subscription\SubscriptionNotificationService;
use App\Services\Subscription\SubscriptionPlanService;
use App\Services\Subscription\VipPlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class UserSubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionPlanService $plans,
        private readonly SubscriptionNotificationService $notifications,
        private readonly VipPlanService $vipPlans,
    ) {}

    public function index(): JsonResponse
    {
        $plans = \App\Models\Plan::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->where('is_public', true)->orWhereNull('is_public');
            })
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'plan_type' => 'required|in:monthly,yearly,trial,forever',
            'amount' => 'required|numeric|min:0',
            'plan_name' => 'nullable|string|max:100',
            'plan_slug' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $existing = UserSubscription::query()->where('user_id', $user->id)->latest('id')->first();
        if ($this->vipPlans->isVipSubscription($existing)) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is on the VIP plan and does not require payment.',
            ], 422);
        }

        $planType = (string) $request->plan_type;
        $plan = $this->plans->findPlanForSubscribe(
            $planType,
            $request->plan_slug,
            $request->plan_name
        );

        if (! $plan && ! in_array($planType, ['trial', 'forever'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Selected plan is not available.',
            ], 422);
        }

        if ($this->vipPlans->isVipPlan($plan)) {
            $subscription = $this->vipPlans->assignUser($user);

            return response()->json([
                'success' => true,
                'message' => 'VIP plan applied.',
                'data' => $subscription->fresh('plan'),
            ]);
        }

        $expectedAmount = $plan
            ? $this->plans->expectedAmount($plan, $planType)
            : 0.0;

        if (abs((float) $request->amount - $expectedAmount) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Plan amount does not match the configured price.',
            ], 422);
        }

        $trialDays = $this->plans->trialDays();
        $trialEnds = now()->addDays($trialDays);

        if (in_array($planType, ['trial', 'forever'], true) || $expectedAmount == 0) {
            $status = $planType === 'forever' ? 'active' : 'trialing';
            $existing = UserSubscription::query()->where('user_id', $user->id)->latest('id')->first();
            $previousStatus = $existing?->status;
            $subscription = UserSubscription::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'plan_id' => $plan?->id,
                    'plan_type' => $planType === 'forever' ? 'forever' : 'trial',
                    'plan_name' => $plan?->name ?? ($request->plan_name ?? 'Free'),
                    'status' => $status,
                    'amount' => 0,
                    'trial_ends_at' => $planType === 'forever' ? null : $trialEnds,
                    'next_payment_at' => $planType === 'forever' ? null : $trialEnds,
                    'grace_ends_at' => null,
                    'payment_intent_id' => null,
                ]
            );

            $user->update(['has_seen_pricing' => true]);

            if ($status === 'active' && $this->vipPlans->shouldSendBillingNotifications($subscription)) {
                $this->notifications->notifyActivatedIfNeeded($subscription->fresh(['plan']), $previousStatus);
            }

            return response()->json([
                'success' => true,
                'message' => $planType === 'forever'
                    ? 'Free plan activated successfully.'
                    : 'Free trial activated successfully.',
                'subscription' => $subscription,
                'client_secret' => null,
            ]);
        }

        $subscription = UserSubscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_id' => $plan?->id,
                'plan_type' => $planType,
                'plan_name' => $plan?->name ?? $request->plan_name,
                'amount' => $expectedAmount,
                'status' => 'trialing',
                'trial_ends_at' => $trialEnds,
                'next_payment_at' => $trialEnds,
            ]
        );

        Stripe::setApiKey(config('stripe.secret'));

        try {
            if (! $subscription->stripe_customer_id) {
                $customer = \Stripe\Customer::create([
                    'email' => $user->email,
                    'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                ]);
                $subscription->stripe_customer_id = $customer->id;
                $subscription->save();
            }

            $paymentIntent = PaymentIntent::create([
                'amount' => (int) round($expectedAmount * 100),
                'currency' => strtolower(config('subscription.currency', 'gbp')),
                'customer' => $subscription->stripe_customer_id,
                'confirmation_method' => 'manual',
                'confirm' => false,
                'setup_future_usage' => 'off_session',
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'subscription_id' => (string) $subscription->id,
                    'plan_type' => $planType,
                    'plan_slug' => $plan?->slug,
                ],
            ]);

            $subscription->update([
                'payment_intent_id' => $paymentIntent->id,
            ]);

            $user->update(['has_seen_pricing' => true]);

            return response()->json([
                'success' => true,
                'subscription' => $subscription->fresh(),
                'client_secret' => $paymentIntent->client_secret,
            ]);
        } catch (\Throwable $e) {
            Log::warning('plans/subscribe Stripe error', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment could not be started. Please try again or contact support.',
            ], 502);
        }
    }

    public function savePaymentMethod(Request $request): JsonResponse
    {
        $request->validate([
            'subscription_id' => 'required|integer',
            'payment_intent_id' => 'required|string',
        ]);

        $user = $request->user();
        $subscription = UserSubscription::query()
            ->where('id', $request->subscription_id)
            ->where('user_id', $user->id)
            ->first();

        if (! $subscription) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription not found.',
            ], 404);
        }

        Stripe::setApiKey(config('stripe.secret'));

        try {
            $paymentIntent = PaymentIntent::retrieve($request->payment_intent_id);

            if ($paymentIntent->status !== 'succeeded') {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment has not completed yet.',
                ], 422);
            }

            $paymentMethodId = is_string($paymentIntent->payment_method)
                ? $paymentIntent->payment_method
                : ($paymentIntent->payment_method->id ?? null);

            $updates = [
                'payment_intent_id' => $paymentIntent->id,
                'status' => 'active',
                'paid_at' => now(),
                'trial_ends_at' => null,
                'grace_ends_at' => null,
                'next_payment_at' => $subscription->plan_type === 'yearly'
                    ? now()->addYear()
                    : now()->addMonth(),
            ];

            if ($paymentMethodId) {
                $updates['stripe_payment_method_id'] = $paymentMethodId;
            }

            if ($subscription->stripe_customer_id && $paymentMethodId) {
                \Stripe\Customer::update($subscription->stripe_customer_id, [
                    'invoice_settings' => ['default_payment_method' => $paymentMethodId],
                ]);
            }

            $previousStatus = $subscription->status;
            $subscription->update($updates);
            $user->update(['has_seen_pricing' => true]);

            $this->notifications->notifyActivatedIfNeeded($subscription->fresh(['plan']), $previousStatus);

            return response()->json([
                'success' => true,
                'message' => 'Payment method saved and subscription activated.',
                'data' => $subscription->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('savePaymentMethod failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not verify payment with Stripe.',
            ], 502);
        }
    }
}
