<?php

namespace App\Services\Subscription;

use App\Models\Plan;
use App\Models\UserSubscription;
use Illuminate\Contracts\Auth\Authenticatable;
use Modules\User\Models\User;

class VipPlanService
{
    public function __construct(
        private readonly SubscriptionPlanService $planService,
    ) {}

    public function vipPlan(): ?Plan
    {
        $slug = (string) config('subscription.vip_plan_slug', 'vip');

        return Plan::query()
            ->where('is_active', true)
            ->where(function ($q) use ($slug) {
                $q->where('slug', $slug)->orWhere('is_vip', true);
            })
            ->orderByRaw('CASE WHEN slug = ? THEN 0 ELSE 1 END', [$slug])
            ->first();
    }

    public function isVipPlan(?Plan $plan): bool
    {
        if (! $plan) {
            return false;
        }

        if ((bool) ($plan->is_vip ?? false)) {
            return true;
        }

        return strtolower((string) $plan->slug) === strtolower((string) config('subscription.vip_plan_slug', 'vip'));
    }

    public function isVipSubscription(?UserSubscription $subscription): bool
    {
        if (! $subscription) {
            return false;
        }

        return $this->isVipPlan($this->planService->effectivePlan($subscription));
    }

    public function shouldSendBillingNotifications(?UserSubscription $subscription): bool
    {
        return ! $this->isVipSubscription($subscription);
    }

    /**
     * Grant or refresh VIP subscription for a user (no payment, no billing emails).
     */
    public function assignUser(Authenticatable|User $user): UserSubscription
    {
        $plan = $this->vipPlan();
        if (! $plan) {
            throw new \RuntimeException('VIP plan is not configured. Run migrations and db:seed --class=PlansTableSeeder.');
        }

        $userId = (int) $user->getAuthIdentifier();
        $existing = UserSubscription::query()->where('user_id', $userId)->latest('id')->first();

        return UserSubscription::query()->updateOrCreate(
            ['user_id' => $userId],
            [
                'plan_id' => $plan->id,
                'plan_type' => 'forever',
                'plan_name' => $plan->name,
                'status' => 'active',
                'amount' => 0,
                'trial_ends_at' => null,
                'next_payment_at' => null,
                'grace_ends_at' => null,
                'paid_at' => null,
                'payment_intent_id' => null,
                'stripe_customer_id' => $existing?->stripe_customer_id,
            ]
        );
    }

    public function isSuperAdminAccount(Authenticatable|User $user): bool
    {
        $accountType = strtolower(str_replace([' ', '_'], '-', (string) ($user->account_type ?? '')));

        return in_array($accountType, ['super-admin', 'superadmin'], true);
    }
}
