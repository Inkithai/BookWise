<?php

namespace App\Services\Subscription;

use App\Helpers\EmailTemplateHelper;
use App\Models\UserSubscription;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Modules\User\Mail\SubscriptionActivatedMail;
use Modules\User\Models\User;

class SubscriptionNotificationService
{
    public function __construct(
        private readonly VipPlanService $vipPlans,
    ) {}

    /**
     * Send welcome email when subscription becomes active (paid activation).
     */
    public function notifyActivatedIfNeeded(UserSubscription $subscription, ?string $previousStatus = null): void
    {
        if (! $this->vipPlans->shouldSendBillingNotifications($subscription)) {
            return;
        }

        if ($subscription->status !== 'active') {
            return;
        }

        if ($previousStatus === 'active') {
            return;
        }

        $user = $subscription->relationLoaded('user')
            ? $subscription->user
            : User::query()->find($subscription->user_id);

        if (! $user || ! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        try {
            $hostId = (int) ($user->host_id ?? 0);
            $branding = EmailTemplateHelper::resolveCompanyBranding($hostId, $user->id);
            $subscription->loadMissing('plan');

            Mail::to($user->email)->send(
                new SubscriptionActivatedMail($user, $subscription, $branding['logoUrl'], $branding['companyName'])
            );

            Log::info('Subscription activation email sent', [
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'plan' => $subscription->plan_name,
            ]);
        } catch (\Throwable $e) {
            Log::error('Subscription activation email failed', [
                'user_id' => $subscription->user_id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
