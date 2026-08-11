<?php

namespace Modules\SuperAdmin\Services;

use App\Models\Company;
use App\Models\Host;
use App\Models\Plan;
use App\Models\User;
use App\Models\UserSubscription;
use App\Services\Subscription\SubscriptionPlanService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class SubscriptionFinanceService
{
    /** Statuses that count as a live subscription for host/plan reporting. */
    private const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

    public function getOverview(?string $startDate = null, ?string $endDate = null): array
    {
        [$start, $end] = $this->parsePeriod($startDate, $endDate);
        $currency = strtoupper((string) config('subscription.currency', 'GBP'));
        $plans = Plan::query()->where('is_active', true)->orderBy('sort_order')->get();

        $revenueByPlan = $this->paymentsInPeriodByPlanId($start, $end);
        $paymentCountByPlan = $this->paymentCountInPeriodByPlanId($start, $end);
        $paidInPeriodByUserPlan = $this->paidInPeriodByUserAndPlan($start, $end);
        $transactions = $this->buildTransactionHistory($start, $end);
        $paymentCountTotal = $this->countAllPaymentsInPeriod($start, $end);

        $planSections = [];
        $totalHosts = 0;
        $totalSubscribers = 0;
        $totalRevenue = 0.0;
        $pastDue = 0;
        $trialing = 0;
        $active = 0;

        foreach ($plans as $plan) {
            $subscriptionsByUser = $this->subscribersByUserIdForPlanInPeriod((int) $plan->id, $start, $end);
            $built = $this->buildHostRowsFromSubscriptions(
                $plan,
                $subscriptionsByUser,
                $paidInPeriodByUserPlan,
            );

            $revenue = round((float) ($revenueByPlan[$plan->id] ?? 0), 2);
            $totalRevenue += $revenue;
            $totalHosts += $built['host_count'];
            $totalSubscribers += $built['subscriber_count'];
            $pastDue += $built['status_counts']['past_due'];
            $trialing += $built['status_counts']['trialing'];
            $active += $built['status_counts']['active'];

            $planSections[] = [
                'plan_id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'monthly_price' => (float) $plan->monthly_price,
                'yearly_price' => (float) $plan->yearly_price,
                'is_free' => (bool) $plan->is_free,
                'subscriber_count' => $built['subscriber_count'],
                'host_count' => $built['host_count'],
                'revenue_in_period' => $revenue,
                'payment_count' => (int) ($paymentCountByPlan[$plan->id] ?? 0),
                'hosts' => $built['hosts'],
            ];
        }

        return [
            'currency' => $currency,
            'period' => [
                'month' => $start->format('Y-m'),
                'month_label' => $start->format('F Y').($start->format('Y-m') !== $end->format('Y-m')
                    ? ' – '.$end->format('F Y')
                    : ''),
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'summary' => [
                'total_revenue' => round($totalRevenue, 2),
                'total_hosts' => $totalHosts,
                'total_subscribers' => $totalSubscribers,
                'transaction_count' => $paymentCountTotal,
                'active_subscribers' => $active,
                'trialing_subscribers' => $trialing,
                'past_due_subscribers' => $pastDue,
            ],
            'plans' => $planSections,
            'transactions' => $transactions,
        ];
    }

    /**
     * Host-level subscription rows for a plan within a date range (super-admin drill-down).
     *
     * @return array<string, mixed>
     */
    public function getHostsForPlan(string $planSlug, ?string $startDate, ?string $endDate): array
    {
        $plan = Plan::query()->where('slug', $planSlug)->where('is_active', true)->first();
        if (! $plan) {
            return [
                'currency' => strtoupper((string) config('subscription.currency', 'GBP')),
                'filters' => [
                    'plan_slug' => $planSlug,
                    'plan_name' => null,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                'total_hosts' => 0,
                'hosts' => [],
            ];
        }

        [$start, $end] = $this->parsePeriod($startDate, $endDate);
        $currency = strtoupper((string) config('subscription.currency', 'GBP'));
        $paidInPeriodByUserPlan = $this->paidInPeriodByUserAndPlan($start, $end);
        $subscriptionsByUser = $this->subscribersByUserIdForPlanInPeriod((int) $plan->id, $start, $end);
        $built = $this->buildHostRowsFromSubscriptions($plan, $subscriptionsByUser, $paidInPeriodByUserPlan);

        return [
            'currency' => $currency,
            'filters' => [
                'plan_slug' => $plan->slug,
                'plan_name' => $plan->name,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'revenue_in_period' => round((float) $this->paymentsInPeriodByPlanId($start, $end)[$plan->id] ?? 0, 2),
            'total_hosts' => $built['host_count'],
            'subscriber_count' => $built['subscriber_count'],
            'hosts' => $built['hosts'],
        ];
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function parsePeriod(?string $startDate, ?string $endDate): array
    {
        $start = Carbon::parse($startDate ?? now()->startOfMonth()->toDateString())->startOfDay();
        $end = Carbon::parse($endDate ?? now()->toDateString())->endOfDay();
        if ($start->gt($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return [$start, $end];
    }

    /**
     * @param  array<int, UserSubscription>  $subscriptionsByUser
     * @param  array<string, float>  $paidInPeriodByUserPlan  keys: "{userId}:{planId}"
     * @return array{subscriber_count: int, host_count: int, hosts: list<array<string, mixed>>, status_counts: array<string, int>}
     */
    private function buildHostRowsFromSubscriptions(
        Plan $plan,
        array $subscriptionsByUser,
        array $paidInPeriodByUserPlan = [],
    ): array {
        $userIds = array_keys($subscriptionsByUser);

        if ($userIds === []) {
            return [
                'subscriber_count' => 0,
                'host_count' => 0,
                'hosts' => [],
                'status_counts' => ['active' => 0, 'trialing' => 0, 'past_due' => 0],
            ];
        }

        $users = User::query()->whereIn('id', $userIds)->get()->keyBy('id');
        $hostToOwner = [];
        $subscriberCount = 0;
        $statusCounts = ['active' => 0, 'trialing' => 0, 'past_due' => 0];

        foreach ($subscriptionsByUser as $userId => $subscription) {
            $user = $users->get($userId);

            $subscriberCount++;
            $status = $subscription->status;
            if (isset($statusCounts[$status])) {
                $statusCounts[$status]++;
            }

            $paidKey = $userId.':'.(int) $plan->id;
            $paidInPeriod = round((float) ($paidInPeriodByUserPlan[$paidKey] ?? 0), 2);

            $hostIds = $user
                ? $this->hostIdsForBillingUser((int) $userId, $user)
                : [];

            if (! $user) {
                $hostToOwner['user-'.$userId] = [
                    'host_id' => null,
                    'user' => null,
                    'user_id' => (int) $userId,
                    'subscription' => $subscription,
                    'paid_in_period' => $paidInPeriod,
                ];
                continue;
            }

            if ($hostIds === []) {
                $hostToOwner['user-'.$userId] = [
                    'host_id' => null,
                    'user' => $user,
                    'user_id' => (int) $userId,
                    'subscription' => $subscription,
                    'paid_in_period' => $paidInPeriod,
                ];
                continue;
            }

            foreach ($hostIds as $hostId) {
                if (! isset($hostToOwner[$hostId])) {
                    $hostToOwner[$hostId] = [
                        'host_id' => $hostId,
                        'user' => $user,
                        'user_id' => (int) $userId,
                        'subscription' => $subscription,
                        'paid_in_period' => $paidInPeriod,
                    ];
                }
            }
        }

        $numericHostIds = array_values(array_filter(
            array_map(fn ($m) => $m['host_id'] ?? null, $hostToOwner),
            fn ($id) => $id !== null,
        ));

        $hostsById = $numericHostIds !== []
            ? Host::query()->whereIn('id', $numericHostIds)->get()->keyBy('id')
            : collect();

        $companiesByHost = $numericHostIds !== []
            ? Company::query()
                ->whereIn('host_id', $numericHostIds)
                ->whereNotNull('company_name')
                ->get()
                ->groupBy('host_id')
            : collect();

        $rows = [];
        foreach ($hostToOwner as $meta) {
            $hostId = $meta['host_id'] ?? null;
            $host = $hostId ? $hostsById->get($hostId) : null;
            $user = $meta['user'] ?? null;
            $ownerUserId = (int) ($meta['user_id'] ?? $user?->id ?? 0);
            $subscription = $meta['subscription'];
            $companyNames = $hostId
                ? ($companiesByHost->get($hostId) ?? collect())
                    ->pluck('company_name')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all()
                : [];

            $rows[] = [
                'subscription_id' => (int) $subscription->id,
                'host_id' => $hostId ? (int) $hostId : null,
                'host_name' => $host?->name ?? ($hostId ? 'Host #'.$hostId : 'No host linked'),
                'owner_user_id' => $ownerUserId,
                'owner_name' => $user
                    ? (trim((string) ($user->first_name ?? '').' '.(string) ($user->last_name ?? '')) ?: null)
                    : null,
                'owner_email' => $user?->email ?? ('user #'.$ownerUserId),
                'owner_is_active' => $user ? (bool) ($user->is_active ?? true) : false,
                'is_super_admin' => $user ? $this->isSuperAdminUser($user) : false,
                'companies' => $companyNames,
                'subscription_status' => $subscription->status,
                'plan_type' => $subscription->plan_type,
                'plan_name' => $subscription->plan_name ?? $plan->name,
                'amount' => round((float) $subscription->amount, 2),
                'paid_in_period' => $meta['paid_in_period'],
                'subscription_started_at' => $subscription->created_at?->toIso8601String(),
                'paid_at' => $subscription->paid_at?->toIso8601String(),
                'next_payment_at' => $subscription->next_payment_at?->toIso8601String(),
                'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                'payment_intent_id' => $subscription->payment_intent_id,
                'has_stripe_customer' => ! empty($subscription->stripe_customer_id),
            ];
        }

        usort($rows, fn ($a, $b) => strcasecmp((string) $a['host_name'], (string) $b['host_name']));

        $hostCount = count(array_filter($rows, fn ($r) => $r['host_id'] !== null));

        return [
            'subscriber_count' => $subscriberCount,
            'host_count' => $hostCount > 0 ? $hostCount : count($rows),
            'hosts' => $rows,
            'status_counts' => $statusCounts,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildTransactionHistory(Carbon $start, Carbon $end): array
    {
        $rows = UserSubscription::query()
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('amount', '>', 0)
            ->orderByDesc('paid_at')
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $userIds = $rows->pluck('user_id')->unique()->all();
        $users = User::query()->whereIn('id', $userIds)->get()->keyBy('id');
        $plansById = Plan::query()->where('is_active', true)->get()->keyBy('id');

        $transactions = [];
        foreach ($rows as $sub) {
            $user = $users->get($sub->user_id);
            $resolvedPlanId = $this->resolveSubscriptionPlanId($sub);
            $plan = $resolvedPlanId ? $plansById->get($resolvedPlanId) : null;
            $hostIds = $user
                ? $this->hostIdsForBillingUser((int) $sub->user_id, $user)
                : [];
            $hostLabels = $hostIds !== []
                ? Host::query()->whereIn('id', $hostIds)->pluck('name', 'id')->all()
                : [];

            $ownerUserId = (int) $sub->user_id;
            $transactions[] = [
                'id' => (int) $sub->id,
                'paid_at' => $sub->paid_at?->toIso8601String(),
                'amount' => round((float) $sub->amount, 2),
                'plan_slug' => $plan?->slug,
                'plan_name' => $sub->plan_name ?? $plan?->name ?? 'Unknown',
                'plan_type' => $sub->plan_type,
                'status' => $sub->status,
                'payment_intent_id' => $sub->payment_intent_id,
                'owner_user_id' => $ownerUserId,
                'owner_name' => $user
                    ? (trim((string) ($user->first_name ?? '').' '.(string) ($user->last_name ?? '')) ?: null)
                    : null,
                'owner_email' => $user?->email ?? ('user #'.$ownerUserId),
                'is_super_admin' => $user ? $this->isSuperAdminUser($user) : false,
                'host_ids' => $hostIds,
                'host_names' => array_values($hostLabels),
            ];
        }

        return $transactions;
    }

    /**
     * @return array<string, float> keys "{userId}:{planId}"
     */
    private function paidInPeriodByUserAndPlan(Carbon $start, Carbon $end): array
    {
        $rows = UserSubscription::query()
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('amount', '>', 0)
            ->get(['user_id', 'plan_id', 'amount']);

        $totals = [];
        foreach ($rows as $row) {
            $planId = $this->resolveSubscriptionPlanId($row) ?? 0;
            $key = $row->user_id.':'.$planId;
            $totals[$key] = ($totals[$key] ?? 0) + (float) $row->amount;
        }

        return $totals;
    }

    /** @return array<int, float> */
    private function paymentsInPeriodByPlanId(Carbon $start, Carbon $end): array
    {
        $plans = Plan::query()->where('is_active', true)->get();
        $totals = [];
        foreach ($plans as $plan) {
            $totals[$plan->id] = 0.0;
        }

        $rows = UserSubscription::query()
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('amount', '>', 0)
            ->get();

        foreach ($rows as $row) {
            $matchedPlanId = $this->resolveSubscriptionPlanId($row);
            if ($matchedPlanId && isset($totals[$matchedPlanId])) {
                $totals[$matchedPlanId] += (float) $row->amount;
            }
        }

        return $totals;
    }

    /** @return array<int, int> */
    private function paymentCountInPeriodByPlanId(Carbon $start, Carbon $end): array
    {
        $plans = Plan::query()->where('is_active', true)->get();
        $counts = [];
        foreach ($plans as $plan) {
            $counts[$plan->id] = 0;
        }

        $rows = UserSubscription::query()
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('amount', '>', 0)
            ->get();

        foreach ($rows as $row) {
            $matchedPlanId = $this->resolveSubscriptionPlanId($row);
            if ($matchedPlanId && isset($counts[$matchedPlanId])) {
                $counts[$matchedPlanId]++;
            }
        }

        return $counts;
    }

    /**
     * Billing users for a plan: anyone who paid in the period or has an overlapping subscription on this plan.
     *
     * @return array<int, UserSubscription>
     */
    private function subscribersByUserIdForPlanInPeriod(int $planId, Carbon $start, Carbon $end): array
    {
        $plan = Plan::query()->find($planId);
        if (! $plan) {
            return [];
        }

        $map = [];

        $paidRows = UserSubscription::query()
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('amount', '>', 0)
            ->orderByDesc('paid_at')
            ->get();

        foreach ($paidRows as $row) {
            if ($this->belongsToPlan($row, $plan)) {
                $map[$row->user_id] = $row;
            }
        }

        $subscriptionRows = UserSubscription::query()
            ->where(function (Builder $q) use ($plan) {
                $this->applyPlanMatchQuery($q, $plan);
            })
            ->orderByDesc('id')
            ->get();

        foreach ($subscriptionRows as $row) {
            if (! isset($map[$row->user_id])
                && $this->belongsToPlan($row, $plan)
                && $this->subscriptionOverlapsPeriod($row, $start, $end)) {
                $map[$row->user_id] = $row;
            }
        }

        return $map;
    }

    private function belongsToPlan(UserSubscription $subscription, Plan $plan): bool
    {
        return $this->resolveSubscriptionPlanId($subscription) === (int) $plan->id;
    }

    private function resolveSubscriptionPlanId(UserSubscription $subscription): ?int
    {
        if ($subscription->plan_id) {
            $linked = Plan::query()->find($subscription->plan_id);
            if ($linked && $linked->is_active) {
                return (int) $linked->id;
            }
        }

        $resolved = app(SubscriptionPlanService::class)->findPlanForSubscribe(
            (string) ($subscription->plan_type ?? ''),
            null,
            $subscription->plan_name
        );

        if ($resolved) {
            return (int) $resolved->id;
        }

        $name = strtolower(trim((string) $subscription->plan_name));
        if ($name === '') {
            return null;
        }

        foreach (Plan::query()->where('is_active', true)->get() as $plan) {
            if ($name === strtolower(trim($plan->name)) || $name === strtolower(trim($plan->slug))) {
                return (int) $plan->id;
            }
            foreach ($this->alternatePlanNames($plan->slug) as $alt) {
                if ($name === strtolower(trim($alt))) {
                    return (int) $plan->id;
                }
            }
        }

        return null;
    }

    /** @return list<string> */
    private function alternatePlanNames(string $slug): array
    {
        return match ($slug) {
            'starter' => ['Starter', 'Business Pro', 'Pro', 'starter', 'pro'],
            'professional' => ['Premium', 'Business Premium', 'Professional', 'premium'],
            'free' => ['Free', 'Trial', 'trial'],
            default => [],
        };
    }

    private function applyPlanMatchQuery(Builder $query, Plan $plan): void
    {
        $query->where('plan_id', $plan->id);
        $query->orWhereRaw('LOWER(TRIM(plan_name)) = ?', [strtolower(trim($plan->name))]);
        foreach ($this->alternatePlanNames($plan->slug) as $alt) {
            $query->orWhereRaw('LOWER(TRIM(plan_name)) = ?', [strtolower(trim($alt))]);
        }
    }

    private function subscriptionOverlapsPeriod(UserSubscription $subscription, Carbon $start, Carbon $end): bool
    {
        if ($subscription->paid_at && $subscription->paid_at->between($start, $end)) {
            return true;
        }

        if ($subscription->created_at && $subscription->created_at->between($start, $end)) {
            return true;
        }

        if (in_array($subscription->status, self::ACTIVE_STATUSES, true)) {
            return $subscription->created_at && $subscription->created_at->lte($end);
        }

        return false;
    }

    private function countAllPaymentsInPeriod(Carbon $start, Carbon $end): int
    {
        return UserSubscription::query()
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('amount', '>', 0)
            ->count();
    }

    /** @return list<int> */
    private function hostIdsForBillingUser(int $userId, User $user): array
    {
        $hostIds = [];

        if ((int) ($user->host_id ?? 0) > 0) {
            $hostIds[] = (int) $user->host_id;
        }

        $companyHosts = Company::query()
            ->where('owner_user_id', $userId)
            ->whereNotNull('host_id')
            ->pluck('host_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return array_values(array_unique(array_filter(array_merge($hostIds, $companyHosts))));
    }

    private function isSuperAdminUser(User $user): bool
    {
        $accountType = strtolower(str_replace([' ', '_'], '-', (string) ($user->account_type ?? '')));

        return in_array($accountType, ['super-admin', 'superadmin'], true);
    }
}
