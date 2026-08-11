<?php



namespace App\Services\Subscription;



use App\Enums\InvoiceStatus;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Exceptions\HttpResponseException;
use Modules\Invoice\Models\Invoice;

use Modules\Invoice\Models\InvoiceClient;

use Modules\Invoice\Models\Receipt;

use App\Models\Company;

use Modules\User\Models\User as InvoiceUser;



class SubscriptionLimitService

{

    public function __construct(

        private readonly SubscriptionPlanService $plans

    ) {}



    public function isSuperAdmin(Authenticatable $user): bool

    {

        if (! $user instanceof InvoiceUser) {

            return false;

        }



        $accountType = strtolower(str_replace([' ', '_'], '-', (string) ($user->account_type ?? '')));

        if (in_array($accountType, ['super-admin', 'superadmin'], true)) {

            return true;

        }



        return $user->hasRole('super-admin') || $user->hasRole('superadmin') || $user->hasRole('super admin');

    }



    public function assertFeature(Authenticatable $user, string $featureKey, ?int $hostId = null): void

    {

        if ($this->isSuperAdmin($user)) {

            return;

        }

        $billingUser = $this->resolveBillingUser($user, $hostId);

        if ($this->plans->canUseFeature($billingUser, $featureKey)) {

            return;

        }

        $this->denyFeature($featureKey);

    }



    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    public function assertInvoiceCurrencies(
        Authenticatable $user,
        array $items,
        ?int $companyId = null,
        ?int $hostId = null,
    ): void {
        if ($this->isSuperAdmin($user)) {
            return;
        }

        $billingUser = $this->resolveBillingUser($user, $hostId);

        if ($this->plans->canUseFeature($billingUser, 'any_currency')) {
            return;
        }

        $allowed = strtoupper($this->resolveCompanyCurrency($companyId, $hostId, $user));

        foreach ($items as $item) {
            $currency = strtoupper((string) ($item['currency'] ?? $allowed));
            if ($currency !== $allowed) {
                $this->denyFeature(
                    'any_currency',
                    "Your plan only allows billing in your company currency ({$allowed}). Upgrade to Business Premium for multi-currency invoices.",
                );
            }
        }
    }



    private function resolveCompanyCurrency(?int $companyId, ?int $hostId, Authenticatable $user): string
    {
        if ($companyId) {
            $company = Company::query()->find($companyId);
            if ($company?->company_currency) {
                return strtoupper((string) $company->company_currency);
            }
        }

        if ($hostId) {
            $company = Company::query()
                ->where('host_id', $hostId)
                ->where('is_active', true)
                ->orderBy('id')
                ->first();
            if ($company?->company_currency) {
                return strtoupper((string) $company->company_currency);
            }
        }

        if ($user instanceof InvoiceUser && $user->active_company_id) {
            $company = Company::query()->find((int) $user->active_company_id);
            if ($company?->company_currency) {
                return strtoupper((string) $company->company_currency);
            }
        }

        return 'GBP';
    }



    public function assertCanCreateCompany(Authenticatable $user): void

    {

        if ($this->isSuperAdmin($user)) {

            return;

        }



        $this->assertSubscriptionAllowsAppAccess($user);



        if ($this->plans->hasFullTrialAccess($this->plans->subscriptionForUser($user))) {

            return;

        }



        if (! $user instanceof InvoiceUser) {

            return;

        }



        $existing = Company::query()->where('owner_user_id', $user->id)->count();

        if ($existing < 1) {

            return;

        }



        if (! $this->plans->canUseFeature($user, 'multiple_businesses')) {

            $this->denyFeature(

                'multiple_businesses',

                'Your plan allows only one business. Upgrade to Business Premium to add more companies.'

            );

        }

    }



    public function assertCanUseTemplate(Authenticatable $user, string $templateKey, ?int $hostId = null): void

    {

        if ($this->isSuperAdmin($user)) {

            return;

        }

        $billingUser = $this->resolveBillingUser($user, $hostId);

        $this->assertSubscriptionAllowsAppAccess($user, $hostId);



        if ($this->plans->hasFullTrialAccess($this->plans->subscriptionForUser($billingUser))) {

            return;

        }



        if ($billingUser instanceof InvoiceUser && $this->plans->canUseTemplate($billingUser, $templateKey)) {

            return;

        }



        $this->denyFeature(

            'templates',

            'This invoice template is not included on your plan. Please upgrade or choose an allowed template.'

        );

    }



    public function assertCanConnectStripe(Authenticatable $user): void

    {

        $this->assertFeature($user, 'accept_online_payments');

    }



    private function billingUser(Authenticatable $user, int $hostId): Authenticatable

    {

        return $this->resolveBillingUser($user, $hostId > 0 ? $hostId : null);

    }



    private function resolveBillingUser(Authenticatable $user, ?int $hostId = null): Authenticatable

    {

        if ($hostId !== null && $hostId > 0) {

            $fromHost = InvoiceUser::primaryBillingUserForHost($hostId);

            if ($fromHost) {

                return $fromHost;

            }

        }



        if ($user instanceof InvoiceUser) {

            return $this->plans->billingUser($user);

        }



        return $user;

    }



    public function assertCanCreateClient(Authenticatable $user, int $hostId): void

    {

        $user = $this->billingUser($user, $hostId);

        $this->assertWithinLimit($user, 'clients', $hostId, function () use ($hostId) {

            return InvoiceClient::query()->where('host_id', $hostId)->count();

        });

    }



    public function assertCanCreateInvoice(Authenticatable $user, int $hostId): void

    {

        $user = $this->billingUser($user, $hostId);

        $this->assertWithinLimit($user, 'invoices', $hostId, function () use ($hostId) {

            return Invoice::query()

                ->where('host_id', $hostId)

                ->whereMonth('created_at', now()->month)

                ->whereYear('created_at', now()->year)

                ->count();

        });

    }



    public function assertCanCreateReceipt(Authenticatable $user, int $hostId): void

    {

        $user = $this->billingUser($user, $hostId);

        $this->assertWithinLimit($user, 'receipts', $hostId, function () use ($hostId) {

            return Receipt::query()
                ->whereHas('invoice', fn ($q) => $q->where('host_id', $hostId))
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();

        });

    }



    public function assertCanSendInvoice(Authenticatable $user, int $hostId): void

    {

        $user = $this->billingUser($user, $hostId);

        $this->assertWithinLimit($user, 'send_invoices', $hostId, function () use ($hostId) {

            return Invoice::query()
                ->where('host_id', $hostId)
                ->whereIn('status', [
                    InvoiceStatus::MailSent->value,
                    InvoiceStatus::ReceiptSent->value,
                ])
                ->whereMonth('updated_at', now()->month)
                ->whereYear('updated_at', now()->year)
                ->count();

        });

    }



    public function assertCanAddTeamMember(Authenticatable $user, int $hostId): void

    {

        $user = $this->billingUser($user, $hostId);

        $this->assertWithinLimit($user, 'team_members', $hostId, function () use ($hostId) {

            return InvoiceUser::query()->where('host_id', $hostId)->count();

        });

    }



    public function assertSubscriptionAllowsAppAccess(Authenticatable $user, ?int $hostId = null): void

    {

        if ($this->isSuperAdmin($user)) {

            return;

        }

        $billingUser = $this->resolveBillingUser($user, $hostId);

        $subscription = $this->plans->subscriptionForUser($billingUser);



        if ($this->plans->hasFullTrialAccess($subscription)) {

            return;

        }



        if ($subscription && in_array($subscription->status, ['active', 'trialing', 'trial_end', 'past_due'], true)) {

            return;

        }



        if ($subscription && $subscription->status === 'inactive') {

            $this->deny('Your subscription is inactive. Please renew to continue.');

        }



        $this->deny('An active subscription is required to use this feature.');

    }



    private function assertWithinLimit(

        Authenticatable $user,

        string $limitKey,

        int $hostId,

        callable $countFn

    ): void {

        if ($this->isSuperAdmin($user)) {

            return;

        }



        $this->assertSubscriptionAllowsAppAccess($user, $hostId);



        $billingUser = $this->resolveBillingUser($user, $hostId);

        if ($this->plans->hasFullTrialAccess($this->plans->subscriptionForUser($billingUser))) {

            return;

        }



        $max = $this->plans->limitFor($billingUser, $limitKey);



        if ($max === null) {

            return;

        }



        $current = (int) $countFn();



        if ($current >= $max) {

            $label = str_replace('_', ' ', $limitKey);

            $this->deny("You have reached your plan limit for {$label} ({$max}). Please upgrade your plan.");

        }

    }



    public function denyFeature(string $featureKey, ?string $message = null): void

    {

        throw new HttpResponseException(response()->json([

            'success' => false,

            'message' => $message ?? "Your current plan does not include this feature ({$featureKey}). Please upgrade.",

            'code' => 'plan_feature_restricted',

            'feature' => $featureKey,

        ], 403));

    }



    private function deny(string $message): void

    {

        throw new HttpResponseException(response()->json([

            'success' => false,

            'message' => $message,

            'code' => 'plan_limit_exceeded',

        ], 403));

    }

}


