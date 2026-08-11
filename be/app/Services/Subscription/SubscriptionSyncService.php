<?php

namespace App\Services\Subscription;

use App\Models\Plan;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Modules\User\Models\User;

class SubscriptionSyncService
{
    public function __construct(
        private readonly BookWiseSubscriptionClient $syncClient,
        private readonly SubscriptionPlanService $planService,
        private readonly SubscriptionNotificationService $notifications,
        private readonly VipPlanService $vipPlans,
        private readonly TrialLifecycleService $trialLifecycle,
    ) {}

    /**
     * Update Invoice user_subscriptions after platform checkout (FE or platform server push).
     */
    public function applyFromPlatformPlan(
        User $user,
        string $syncPlanSlug,
        string $subscriptionType = 'paid',
        ?float $amount = null,
        string $billingInterval = 'monthly',
    ): UserSubscription {
        $syncPlanSlug = strtolower(trim($syncPlanSlug));
        $invoiceSlug = $this->mapPlatformSlugToApp($syncPlanSlug);
        $plan = $this->resolveInvoicePlan($invoiceSlug, $syncPlanSlug);

        if (! $plan) {
            throw new \RuntimeException('Selected plan is not available on Invoice. Please contact support.');
        }

        $isVip = $this->vipPlans->isVipPlan($plan);
        $isPaid = ! $isVip
            && strtolower($subscriptionType) === 'paid'
            && ! ($plan?->is_free ?? false);
        $resolvedAmount = $isVip ? 0 : ($amount ?? (float) ($plan?->monthly_price ?? 0));
        $existing = UserSubscription::query()->where('user_id', $user->id)->latest('id')->first();
        $previousStatus = $existing?->status;
        $trialEnds = $existing?->trial_ends_at ?? now()->addDays($this->planService->trialDays());

        $subscription = UserSubscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_id' => $plan?->id,
                'plan_type' => $isVip ? 'forever' : ($isPaid ? ($billingInterval === 'yearly' ? 'yearly' : 'monthly') : 'trial'),
                'plan_name' => $plan?->name ?? 'Free Plan',
                'status' => ($isPaid || $isVip) ? 'active' : 'trialing',
                'trial_ends_at' => ($isPaid || $isVip) ? null : $trialEnds,
                'next_payment_at' => $isPaid
                    ? ($billingInterval === 'yearly' ? now()->addYear() : now()->addMonth())
                    : ($isVip ? null : $trialEnds),
                'amount' => $isPaid ? $resolvedAmount : 0,
                'paid_at' => $isPaid ? now() : null,
            ]
        );

        if ($isPaid) {
            $this->notifications->notifyActivatedIfNeeded($subscription->fresh(['plan']), $previousStatus);
        }

        return $subscription;
    }

    public function syncFromBookWise(User $user): UserSubscription
    {
        $syncRow = $this->syncClient->getInvoiceFeatureSubscription($user->email);

        if (! $syncRow) {
            Log::info('BookWise sync: no invoice feature row', ['email' => $user->email]);

            return $this->ensureLocalTrialOrFree($user);
        }

        return $this->upsertFromPlatformRow($user, $syncRow);
    }

    /**
     * @param  array<string, mixed>  $syncRow
     */
    public function upsertFromPlatformRow(User $user, array $syncRow): UserSubscription
    {
        if ($this->isPlatformSubscriptionCancelled($syncRow)) {
            return $this->downgradeCancelledToFree($user);
        }

        $syncPlanSlug = strtolower((string) ($syncRow['plan']['slug'] ?? 'free'));
        $invoiceSlug = $this->mapPlatformSlugToApp($syncPlanSlug);
        $plan = $this->resolveInvoicePlan($invoiceSlug, $syncPlanSlug)
            ?? $this->planService->freePlan();

        $subscriptionType = strtolower((string) ($syncRow['subscription_type'] ?? ''));
        $isVip = $this->vipPlans->isVipPlan($plan);
        $isPaidIw = ! $isVip && $subscriptionType === 'paid';
        $isTrialPlan = ! $isVip && (in_array($syncPlanSlug, ['trial', 'free'], true) || (bool) ($plan?->is_free ?? false));

        $trialEnds = ! empty($syncRow['trial_ends_at'])
            ? Carbon::parse($syncRow['trial_ends_at'])
            : null;

        $status = $this->mapStatus($syncRow, $isPaidIw, $isTrialPlan);
        $planType = $this->mapPlanType($isPaidIw, $isTrialPlan, $trialEnds, $plan);
        $amount = $isVip ? 0 : (float) ($syncRow['plan']['amount_monthly'] ?? $plan?->monthly_price ?? 0);

        $nextPaymentAt = null;
        if ($isPaidIw) {
            $nextPaymentAt = now()->addMonth();
        } elseif ($trialEnds && $trialEnds->isFuture()) {
            $nextPaymentAt = $trialEnds;
        }

        $existing = UserSubscription::query()->where('user_id', $user->id)->latest('id')->first();
        $previousStatus = $existing?->status;

        $subscription = UserSubscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_id' => $plan?->id,
                'plan_type' => $planType,
                'plan_name' => $plan?->name ?? ($syncRow['plan']['name'] ?? 'Free Plan'),
                'status' => $status,
                'trial_ends_at' => $isPaidIw ? null : $trialEnds,
                'next_payment_at' => $nextPaymentAt,
                'amount' => $amount,
                'paid_at' => $isPaidIw ? now() : null,
            ]
        );

        if ($status === 'active' && ! $isVip) {
            $this->notifications->notifyActivatedIfNeeded($subscription->fresh(['plan']), $previousStatus);
        }

        return $subscription;
    }

    public function ensureLocalTrialOrFree(User $user): UserSubscription
    {
        $existing = UserSubscription::query()->where('user_id', $user->id)->latest('id')->first();
        if ($existing) {
            return $existing;
        }

        $plan = $this->planService->freePlan();
        $trialDays = $this->planService->trialDays();

        return UserSubscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan?->id,
            'plan_type' => 'trial',
            'plan_name' => $plan?->name ?? 'Free Plan',
            'status' => 'trialing',
            'trial_ends_at' => now()->addDays($trialDays),
            'amount' => 0,
        ]);
    }

    private function resolveInvoicePlan(string $invoiceSlug, string $syncPlanSlug): ?Plan
    {
        $plan = Plan::query()
            ->where('slug', $invoiceSlug)
            ->where('is_active', true)
            ->first();

        if ($plan) {
            return $plan;
        }

        if (in_array($syncPlanSlug, ['free', 'trial'], true) || in_array($invoiceSlug, ['free'], true)) {
            return $this->planService->freePlan();
        }

        if (in_array($syncPlanSlug, ['vip'], true) || in_array($invoiceSlug, ['vip'], true)) {
            return Plan::query()
                ->where('slug', config('subscription.vip_plan_slug', 'vip'))
                ->where('is_active', true)
                ->first();
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $syncRow
     */
    private function isPlatformSubscriptionCancelled(array $syncRow): bool
    {
        $status = strtolower((string) ($syncRow['status'] ?? 'active'));

        if (in_array($status, ['cancelled', 'canceled', 'inactive'], true)) {
            return true;
        }

        return ! empty($syncRow['cancelled_at']);
    }

    private function downgradeCancelledToFree(User $user): UserSubscription
    {
        $subscription = UserSubscription::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->first();

        if (! $subscription) {
            $subscription = $this->ensureLocalTrialOrFree($user);
        }

        $this->trialLifecycle->downgradeToFreePlan($subscription, false);

        return $subscription->fresh();
    }

    private function mapPlatformSlugToApp(string $platformSlug): string
    {
        $map = config('subscription.platform_to_app_plan_slug', []);
        $key = strtolower($platformSlug);
        $normalized = [];
        foreach ($map as $platform => $invoice) {
            $normalized[strtolower((string) $platform)] = $invoice;
        }

        return (string) ($normalized[$key] ?? $key);
    }

    private function mapPlanType(
        bool $isPaidIw,
        bool $isTrialPlan,
        ?Carbon $trialEnds,
        ?Plan $plan,
    ): string {
        if ($isPaidIw) {
            return 'monthly';
        }

        if ($isTrialPlan || $plan?->is_free) {
            return ($trialEnds && $trialEnds->isFuture()) ? 'trial' : 'forever';
        }

        return 'monthly';
    }

    /**
     * @param  array<string, mixed>  $syncRow
     */
    private function mapStatus(array $syncRow, bool $isPaidIw, bool $isTrialPlan): string
    {
        $status = strtolower((string) ($syncRow['status'] ?? 'active'));
        $paymentStatus = strtolower((string) ($syncRow['payment_status'] ?? ''));

        if ($status === 'cancelled' || $status === 'canceled') {
            return 'inactive';
        }

        if ($isPaidIw || ($paymentStatus === 'success' && ! $isTrialPlan)) {
            return 'active';
        }

        if ($isTrialPlan && ! empty($syncRow['trial_ends_at'])) {
            $trialEnd = Carbon::parse($syncRow['trial_ends_at']);
            if ($trialEnd->isFuture()) {
                return 'trialing';
            }
            if ($trialEnd->isPast()) {
                return 'trial_end';
            }
        }

        if ($paymentStatus === 'past_due') {
            return 'past_due';
        }

        return match ($status) {
            'active', 'trialing' => $status,
            'past_due' => 'past_due',
            'inactive', 'cancelled', 'canceled' => 'inactive',
            default => $isTrialPlan ? 'trialing' : 'inactive',
        };
    }
}
