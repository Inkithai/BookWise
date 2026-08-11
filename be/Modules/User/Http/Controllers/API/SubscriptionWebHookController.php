<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\UserSubscription;
use App\Services\Subscription\SubscriptionNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\Webhook;

class SubscriptionWebHookController extends Controller
{
    public function __construct(
        private readonly SubscriptionNotificationService $notifications
    ) {}

    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $endpointSecret = config('stripe.webhook_secret_sub');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $sigHeader,
                $endpointSecret
            );
        } catch (SignatureVerificationException $e) {
            Log::warning('Stripe subscription webhook signature invalid: ' . $e->getMessage());

            return response('Invalid signature', 400);
        }

        Log::info('Stripe subscription webhook received', [
            'type' => $event->type,
            'id' => $event->id,
        ]);

        switch ($event->type) {
            case 'payment_intent.succeeded':
                $this->handlePaymentSucceeded($event->data->object);
                break;

            case 'payment_intent.payment_failed':
                $this->handlePaymentFailed($event->data->object);
                break;

            default:
                Log::info('Unhandled Stripe subscription event: ' . $event->type);
        }

        return response('Webhook handled', 200);
    }

    private function handlePaymentSucceeded(PaymentIntent $paymentIntent): void
    {
        $subscription = UserSubscription::where('payment_intent_id', $paymentIntent->id)->first();

        if (! $subscription) {
            return;
        }

        $previousStatus = $subscription->status;

        if ($previousStatus === 'active') {
            return;
        }

        $paymentMethodId = is_string($paymentIntent->payment_method)
            ? $paymentIntent->payment_method
            : ($paymentIntent->payment_method->id ?? null);

        $subscription->update([
            'status' => 'active',
            'paid_at' => now(),
            'trial_ends_at' => null,
            'grace_ends_at' => null,
            'stripe_payment_method_id' => $paymentMethodId ?: $subscription->stripe_payment_method_id,
            'next_payment_at' => $subscription->plan_type === 'yearly'
                ? now()->addYear()
                : now()->addMonth(),
        ]);

        if ($subscription->stripe_customer_id && $paymentMethodId) {
            try {
                Stripe::setApiKey(config('stripe.secret'));
                \Stripe\Customer::update($subscription->stripe_customer_id, [
                    'invoice_settings' => ['default_payment_method' => $paymentMethodId],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Could not set default payment method on customer', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->notifications->notifyActivatedIfNeeded($subscription->fresh(['plan']), $previousStatus);

        Log::info("Subscription activated for user {$subscription->user_id}");
    }

    private function handlePaymentFailed(PaymentIntent $paymentIntent): void
    {
        $subscription = UserSubscription::where('payment_intent_id', $paymentIntent->id)->first();

        if (! $subscription) {
            return;
        }

        $subscription->update([
            'status' => 'past_due',
        ]);

        Log::warning("Subscription payment failed for user {$subscription->user_id}");
    }
}
