<?php



namespace App\Services\Subscription;



use App\Models\Plan;

use App\Models\UserSubscription;

use Illuminate\Contracts\Auth\Authenticatable;

use Modules\User\Models\User as InvoiceUser;



class SubscriptionPlanService

{

    public function trialDays(): int

    {

        return max(1, (int) config('subscription.trial_days', 30));

    }



    public function freePlan(): ?Plan

    {

        $slug = (string) config('subscription.free_plan_slug', 'free');

        $bySlug = Plan::query()

            ->where('is_active', true)

            ->where('slug', $slug)

            ->where(function ($q) {

                $q->where('is_vip', false)->orWhereNull('is_vip');

            })

            ->first();

        if ($bySlug) {

            return $bySlug;

        }

        return Plan::query()

            ->where('is_active', true)

            ->where('is_free', true)

            ->where(function ($q) {

                $q->where('is_vip', false)->orWhereNull('is_vip');

            })

            ->orderBy('sort_order')

            ->first();

    }



    public function findPlanForSubscribe(string $planType, ?string $planSlug, ?string $planName): ?Plan

    {

        if ($planSlug) {

            $plan = Plan::query()->where('slug', $planSlug)->where('is_active', true)->first();

            if ($plan) {

                return $plan;

            }

        }



        if ($planName) {

            $plan = Plan::query()

                ->where('is_active', true)

                ->whereRaw('LOWER(name) = ?', [strtolower(trim($planName))])

                ->first();

            if ($plan) {

                return $plan;

            }

        }



        if (in_array($planType, ['trial', 'forever'], true)) {

            return $this->freePlan();

        }



        return null;

    }



    public function expectedAmount(Plan $plan, string $planType): float

    {

        if ($plan->is_free || $planType === 'trial' || $planType === 'forever') {

            return 0.0;

        }



        return $planType === 'yearly'

            ? (float) $plan->yearly_price

            : (float) $plan->monthly_price;

    }



    public function billingUser(Authenticatable|InvoiceUser $user): InvoiceUser
    {
        if (! $user instanceof InvoiceUser) {
            $resolved = InvoiceUser::query()->find($user->getAuthIdentifier());
            if (! $resolved) {
                throw new \InvalidArgumentException('Expected Invoice user model.');
            }
            $user = $resolved;
        }

        $hostId = (int) ($user->host_id ?? $user->id);

        return InvoiceUser::primaryBillingUserForHost($hostId) ?? $user;
    }

    public function subscriptionForUser(Authenticatable|InvoiceUser $user): ?UserSubscription
    {
        $billingUser = $this->billingUser($user);

        return UserSubscription::query()
            ->where('user_id', $billingUser->id)
            ->latest('id')
            ->first();
    }



    public function effectivePlan(?UserSubscription $subscription): ?Plan

    {

        if (! $subscription) {

            return $this->freePlan();

        }



        if ($subscription->plan_id) {

            $plan = Plan::query()->find($subscription->plan_id);

            if ($plan && $plan->is_active) {

                return $plan;

            }

        }



        return $this->findPlanForSubscribe(

            (string) ($subscription->plan_type ?? 'trial'),

            null,

            $subscription->plan_name

        ) ?? $this->freePlan();

    }



    /** Full feature access during active 1-month trial (no plan restrictions). */

    public function hasFullTrialAccess(?UserSubscription $subscription): bool

    {

        if (! $subscription) {

            return false;

        }



        if ($subscription->status !== 'trialing') {

            return false;

        }



        return $subscription->trial_ends_at && $subscription->trial_ends_at->isFuture();

    }

    public function trialDaysRemaining(?UserSubscription $subscription): ?int
    {
        if (! $subscription || $subscription->status !== 'trialing' || ! $subscription->trial_ends_at) {
            return null;
        }

        if ($subscription->trial_ends_at->isPast()) {
            return 0;
        }

        return (int) now()->startOfDay()->diffInDays($subscription->trial_ends_at->copy()->startOfDay(), false);
    }

    public function canUseFeature(Authenticatable|InvoiceUser $user, string $featureKey): bool

    {

        $subscription = $this->subscriptionForUser($user);



        if ($this->hasFullTrialAccess($subscription)) {

            return true;

        }



        if (! $subscription || ! in_array($subscription->status, ['active', 'trialing', 'trial_end', 'past_due'], true)) {

            return false;

        }



        $plan = $this->effectivePlan($subscription);

        $features = $plan?->features ?? [];



        if (! empty($features['all'])) {

            return true;

        }



        return match ($featureKey) {

            'dashboard_advanced', 'advanced_dashboard', 'feature.advanced-dashboard' => $this->dashboardTierAtLeast($features, 'advanced'),

            'dashboard_custom', 'custom_dashboard', 'feature.custom-dashboard' => $this->dashboardTierAtLeast($features, 'custom'),

            'dashboard_standard', 'standard_dashboard', 'feature.standard-dashboard' => true,

            'any_currency', 'feature.any-currency' => (bool) ($features['any_currency'] ?? false),

            'accept_online_payments', 'feature.accept-online-payment' => (bool) ($features['accept_online_payments'] ?? false),

            'multiple_businesses', 'feature.multiple-business' => (bool) ($features['multiple_businesses'] ?? false),

            'recurring_statements', 'recurring_invoices', 'feature.recurring-invoice' => (bool) ($features['recurring_statements'] ?? false),

            'branding', 'feature.branding' => (bool) ($features['branding'] ?? false),

            'crm', 'feature.crm' => (bool) ($features['crm'] ?? false),

            'send_invoices', 'feature.send-invoice' => true,

            default => (bool) ($features[$featureKey] ?? false),

        };

    }



    /**

     * @param  array<string, mixed>  $features

     */

    private function dashboardTierAtLeast(array $features, string $minimum): bool

    {

        $tier = strtolower((string) ($features['dashboard_tier'] ?? 'standard'));

        $order = ['standard' => 1, 'advanced' => 2, 'custom' => 3];



        return ($order[$tier] ?? 1) >= ($order[$minimum] ?? 1);

    }



    public function limitFor(Authenticatable|InvoiceUser $user, string $limitKey): ?int

    {

        $subscription = $this->subscriptionForUser($user);



        if ($this->hasFullTrialAccess($subscription)) {

            return null;

        }



        $plan = $this->effectivePlan($subscription);

        $limits = $plan?->limits ?? [];

        $value = $limits[$limitKey] ?? null;



        if ($value === null || $value === '' || (int) $value === -1) {

            return null;

        }



        return (int) $value;

    }



    public function templatesAccess(Authenticatable|InvoiceUser $user): string

    {

        $subscription = $this->subscriptionForUser($user);



        if ($this->hasFullTrialAccess($subscription)) {

            return 'all';

        }



        $plan = $this->effectivePlan($subscription);

        $features = $plan?->features ?? [];



        if (! empty($features['all'])) {

            return 'custom';

        }



        return (string) ($features['templates_access'] ?? 'preview');

    }



    /** @return list<string> */

    public function allowedTemplateKeys(Authenticatable|InvoiceUser $user): array

    {

        $access = $this->templatesAccess($user);

        $all = ['classic', 'minimal', 'modern', 'modern1'];



        return match ($access) {

            'all', 'custom' => $all,

            'three' => ['classic', 'minimal', 'modern'],

            default => ['classic'],

        };

    }



    public function canUseTemplate(Authenticatable|InvoiceUser $user, string $templateKey): bool

    {

        $key = strtolower(trim($templateKey));

        if ($key === '') {

            return true;

        }



        return in_array($key, $this->allowedTemplateKeys($user), true);

    }



    public function dashboardTier(Authenticatable|InvoiceUser $user): string

    {

        $subscription = $this->subscriptionForUser($user);



        if ($this->hasFullTrialAccess($subscription)) {

            return 'advanced';

        }



        $plan = $this->effectivePlan($subscription);

        $features = $plan?->features ?? [];



        if (! empty($features['all'])) {

            return 'custom';

        }



        return strtolower((string) ($features['dashboard_tier'] ?? 'standard'));

    }



    /**

     * @return array{slug: string|null, name: string|null, features: array<string, mixed>, limits: array<string, int>, templates_access: string}

     */

    public function entitlementsForUser(Authenticatable|InvoiceUser $user): array

    {

        $subscription = $this->subscriptionForUser($user);

        $plan = $this->effectivePlan($subscription);



        return [

            'slug' => $plan?->slug,

            'name' => $plan?->name,

            'features' => $plan?->features ?? [],

            'limits' => $plan?->limits ?? [],

            'templates_access' => $this->templatesAccess($user),

            'full_trial_access' => $this->hasFullTrialAccess($subscription),
            'trial_days_total' => (int) config('subscription.trial_days', 30),
            'trial_days_remaining' => $this->trialDaysRemaining($subscription),

        ];

    }

}


