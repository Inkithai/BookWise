<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserSubscription;
use Illuminate\Support\Facades\Mail;
use Modules\User\Mail\SubscriptionChargeFailedMail;
use Modules\User\Mail\SubscriptionChargeSuccessMail;
use Stripe\Stripe;
use Stripe\PaymentIntent;

class ChargeSubscriptions extends Command
{
    protected $signature = 'charge-subscriptions';
    protected $description = 'Charge active subscriptions for due payments';

    public function handle()
    {
        Stripe::setApiKey(config('stripe.secret'));

        $subscriptions = UserSubscription::where('status', 'active')
            ->where('plan_type', '!=', 'forever')
            ->where('plan_type', '!=', 'trial')
            ->where('next_payment_at', '<=', now())
            ->get();

        foreach ($subscriptions as $sub) {
            $user = $sub->user;

            try {
                // Stripe API key
                Stripe::setApiKey(config('stripe.secret'));

                if (!$sub->stripe_payment_method_id) {
                    throw new \Exception("No saved payment method for subscription ID {$sub->id}");
                }

                // Create PaymentIntent using saved payment method
                $paymentIntent = PaymentIntent::create([
                    'amount' => (int)($sub->amount * 100),
                    'currency' => 'gbp',
                    'customer' => $sub->stripe_customer_id,
                    'payment_method' => $sub->stripe_payment_method_id,
                    'off_session' => true,
                    'confirm' => true,
                    'metadata' => [
                        'user_id' => $user->id,
                        'plan_type' => $sub->plan_type,
                        'subscription_id' => $sub->id,
                    ],
                ]);

                // Payment succeeded → update next_payment_at
                $sub->update([
                    'next_payment_at' => $sub->plan_type === 'monthly'
                        ? now()->addMonth()
                        : now()->addYear(),
                ]);

                $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($user->host_id);
                Mail::to($user->email)->send(
                    new SubscriptionChargeSuccessMail($user, $sub, $branding['logoUrl'], $branding['companyName'])
                );

                $this->info("Charged User ID {$user->id} successfully.");
            } catch (\Exception $e) {
                // Payment failed → deactivate user
                $sub->update(['status' => 'inactive']);
                $user->update(['is_active' => 0]);

                $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($user->host_id);
                Mail::to($user->email)->send(
                    new SubscriptionChargeFailedMail($user, $sub, $branding['logoUrl'], $branding['companyName'])
                );

                $this->error("Payment failed for User ID {$user->id}: {$e->getMessage()}");
            }
        }
    }
}
