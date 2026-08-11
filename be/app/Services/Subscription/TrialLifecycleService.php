<?php

namespace App\Services\Subscription;

use App\Helpers\EmailTemplateHelper;
use App\Models\Plan;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Modules\User\Mail\TrialStatusMail;
use Modules\User\Models\User;

class TrialLifecycleService
{
    private const REMINDER_DAYS = [7, 3, 1];

    public function __construct(
        private readonly SubscriptionPlanService $planService,
        private readonly VipPlanService $vipPlans,
    ) {}

    /**
     * @return array{reminders_sent: int, moved_to_free: int}
     */
    public function process(): array
    {
        return [
            'reminders_sent' => $this->sendDueReminders(),
            'moved_to_free' => $this->expireTrialsToFreePlan(),
        ];
    }

    public function sendDueReminders(): int
    {
        $sent = 0;
        $today = now()->startOfDay();

        UserSubscription::query()
            ->where('status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', $today)
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) use (&$sent, $today) {
                foreach ($subscriptions as $subscription) {
                    if ($this->vipPlans->isVipSubscription($subscription)) {
                        continue;
                    }

                    $trialEnd = $subscription->trial_ends_at->copy()->startOfDay();
                    $daysRemaining = (int) $today->diffInDays($trialEnd, false);

                    if (! in_array($daysRemaining, self::REMINDER_DAYS, true)) {
                        continue;
                    }

                    $alreadySent = $this->remindersSentList($subscription);
                    if (in_array($daysRemaining, $alreadySent, true)) {
                        continue;
                    }

                    $user = $this->resolveUser($subscription);
                    if (! $user || ! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                        continue;
                    }

                    try {
                        $branding = EmailTemplateHelper::resolveCompanyBranding(
                            (int) ($user->host_id ?? 0),
                            $user->id,
                        );
                        Mail::to($user->email)->send(
                            new TrialStatusMail(
                                $user,
                                $subscription,
                                'trial_reminder_'.$daysRemaining,
                                $branding['logoUrl'],
                                $branding['companyName'],
                                $daysRemaining,
                            )
                        );

                        $alreadySent[] = $daysRemaining;
                        $subscription->update([
                            'trial_reminders_sent' => array_values(array_unique($alreadySent)),
                        ]);
                        $sent++;
                    } catch (\Throwable $e) {
                        Log::error('Trial reminder email failed', [
                            'user_id' => $subscription->user_id,
                            'days_remaining' => $daysRemaining,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

        return $sent;
    }

    public function expireTrialsToFreePlan(): int
    {
        $moved = 0;

        UserSubscription::query()
            ->where('status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) use (&$moved) {
                foreach ($subscriptions as $subscription) {
                    if ($this->vipPlans->isVipSubscription($subscription)) {
                        continue;
                    }

                    if ($this->downgradeToFreePlan($subscription)) {
                        $moved++;
                    }
                }
            });

        return $moved;
    }

    /**
     * Move subscription to free plan (active, limited entitlements).
     */
    public function downgradeToFreePlan(UserSubscription $subscription, bool $sendEmail = true): bool
    {
        $freePlan = $this->planService->freePlan();
        if (! $freePlan) {
            Log::error('Cannot downgrade trial: free plan missing');

            return false;
        }

        $subscription->update([
            'plan_id' => $freePlan->id,
            'plan_type' => 'forever',
            'plan_name' => $freePlan->name,
            'status' => 'active',
            'amount' => 0,
            'trial_ends_at' => null,
            'next_payment_at' => null,
            'grace_ends_at' => null,
            'paid_at' => null,
        ]);

        if (! $sendEmail) {
            return true;
        }

        $user = $this->resolveUser($subscription->fresh());
        if (! $user || ! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return true;
        }

        try {
            $branding = EmailTemplateHelper::resolveCompanyBranding(
                (int) ($user->host_id ?? 0),
                $user->id,
            );
            Mail::to($user->email)->send(
                new TrialStatusMail(
                    $user,
                    $subscription->fresh(),
                    'trial_ended_free',
                    $branding['logoUrl'],
                    $branding['companyName'],
                )
            );
        } catch (\Throwable $e) {
            Log::error('Trial ended (free plan) email failed', [
                'user_id' => $subscription->user_id,
                'error' => $e->getMessage(),
            ]);
        }

        return true;
    }

    public function daysRemaining(?UserSubscription $subscription): ?int
    {
        if (! $subscription || $subscription->status !== 'trialing' || ! $subscription->trial_ends_at) {
            return null;
        }

        if ($subscription->trial_ends_at->isPast()) {
            return 0;
        }

        return (int) now()->startOfDay()->diffInDays($subscription->trial_ends_at->copy()->startOfDay(), false);
    }

    /** @return list<int> */
    private function remindersSentList(UserSubscription $subscription): array
    {
        $raw = $subscription->trial_reminders_sent;
        if (is_array($raw)) {
            return array_map('intval', $raw);
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? array_map('intval', $decoded) : [];
        }

        return [];
    }

    private function resolveUser(UserSubscription $subscription): ?User
    {
        return User::query()->find($subscription->user_id);
    }
}
