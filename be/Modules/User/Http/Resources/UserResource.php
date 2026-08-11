<?php

namespace Modules\User\Http\Resources;

use App\Models\Company;
use App\Models\HostUserDetail;
use App\Models\Team;
use App\Models\UserStripeFeeSetting;
use App\Models\UserSubscription;
use App\Services\Subscription\SubscriptionPlanService;
use Modules\User\Models\User as InvoiceUser;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\PermissionRegistrar;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(schema="UserResource", type="object")
 */
class UserResource extends JsonResource
{
    public function toArray($request)
    {
        $authUser = auth()->user();
        $personalHostId = (int) ($this->host_id ?? $authUser?->host_id ?? 0);
        $activeContextCompanyRow = null;
        $isCompanyContextForActiveRow = (string) ($this->active_context_type ?? '') === 'company'
            || (empty($this->active_context_type) && strtolower((string) ($this->account_type ?? '')) === 'company');
        if (
            $isCompanyContextForActiveRow
            && !empty($this->active_company_id)
        ) {
            // Owner lookup
            $activeContextCompanyRow = Company::query()
                ->where('id', (int) $this->active_company_id)
                ->where('owner_user_id', $this->id)
                ->first(['id', 'host_id', 'owner_user_id', 'company_name', 'business_email', 'company_address', 'company_currency', 'is_active']);
            // Sub-user lookup: company under the same host
            if (!$activeContextCompanyRow && !empty($this->host_id)) {
                $activeContextCompanyRow = Company::query()
                    ->where('id', (int) $this->active_company_id)
                    ->where('host_id', (int) $this->host_id)
                    ->first(['id', 'host_id', 'owner_user_id', 'company_name', 'business_email', 'company_address', 'company_currency', 'is_active']);
            }
        }

        // Company-registered users (Flow 2) may not have a companies table row or active_company_id.
        // Build a synthetic row from the user's own host_id so bank/company resolution works.
        if (!$activeContextCompanyRow && $isCompanyContextForActiveRow && !empty($this->host_id)) {
            // IMPORTANT: for sub-users of multi-company accounts their host_id equals the
            // company's host_id. Look up the real Company record first so owner_user_id
            // reflects the actual owner, not the sub-user themselves.
            $realCompanyForHost = Company::where('host_id', (int) $this->host_id)
                ->first(['id', 'host_id', 'owner_user_id', 'company_name', 'business_email', 'company_address', 'company_currency', 'is_active']);
            if ($realCompanyForHost) {
                $activeContextCompanyRow = $realCompanyForHost;
            } else {
                // Use the FIRST user registered under this host as the owner.
                // If $this is a sub-user, their ID is not the first, so owner_user_id
                // will differ from $this->id → isDefinitelySubUser=true, canManageCompanyProfile=false.
                $syntheticOwnerId = InvoiceUser::where('host_id', (int) $this->host_id)
                    ->orderBy('id', 'asc')
                    ->value('id') ?? $this->id;
                $syntheticOwner = InvoiceUser::find($syntheticOwnerId);
                $activeContextCompanyRow = (object) [
                    'id' => null,
                    'host_id' => (int) $this->host_id,
                    'owner_user_id' => $syntheticOwnerId,
                    'company_name' => $syntheticOwner
                        ? trim(($syntheticOwner->first_name ?? '') . ' ' . ($syntheticOwner->last_name ?? ''))
                        : ($this->name ?? ($this->first_name . ' ' . $this->last_name)),
                    'business_email' => $syntheticOwner?->email ?? $this->email ?? null,
                    'company_address' => null,
                    'company_currency' => null,
                    'is_active' => true,
                ];
            }
        }

        $hostId = ($activeContextCompanyRow && !empty($activeContextCompanyRow->host_id))
            ? (int) $activeContextCompanyRow->host_id
            : $personalHostId;
        if ($hostId <= 0) {
            $hostId = $personalHostId;
        }

        $primary = InvoiceUser::primaryBillingUserForHost($hostId);
        $isSsoUser = $this->sso_id !== null && $this->sso_id !== '';

        // Resolve team owner within the same team when applicable; otherwise fall back to host primary.
        $teamOwner = null;
        $teamId = (int) ($this->team_id ?? 0);
        if ($teamId > 0) {
            $teamOwner = InvoiceUser::query()
                ->where('host_id', $hostId)
                ->where('team_id', $teamId)
                ->orderByRaw("CASE LOWER(COALESCE(account_type,'')) WHEN 'company' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END")
                ->orderBy('id')
                ->first();
        }
        $effectiveOwner = $teamOwner ?: $primary;

        // Identify the host owner as the FIRST user registered under this host
        // (lowest ID). Must be computed before $companyRows so personal sub-users
        // can inherit the parent's HostUserDetail records.
        $hostOwnerUser = ($hostId > 0)
            ? InvoiceUser::where('host_id', $hostId)->orderBy('id', 'asc')->first()
            : null;
        $isRootless = is_null($this->host_id);
        $isPrimaryForHost = $hostOwnerUser && (int) $hostOwnerUser->id === (int) $this->id;

        // Multi-company fix: the company owner registers under their OWN personal host_id,
        // not the company's host_id. This makes the host_id-based $isPrimaryForHost check
        // unreliable — the FIRST sub-user created under the company is incorrectly treated
        // as the host owner. Use companies.owner_user_id as the definitive source.
        $companyOwnerUserId = $activeContextCompanyRow?->owner_user_id
            ? (int) $activeContextCompanyRow->owner_user_id
            : null;
        // Current user IS the company owner (but may not be first by host_id).
        $isCompanyOwner = $companyOwnerUserId !== null && $companyOwnerUserId === (int) $this->id;
        // Current user is definitely a sub-user — a Company record exists and they are NOT its owner.
        $isDefinitelySubUser = $companyOwnerUserId !== null && $companyOwnerUserId !== (int) $this->id;

        // Correct $hostOwnerUser to the actual company owner so bank / profile / company-name
        // lookups resolve correctly for both the owner and their sub-users.
        if ($isCompanyOwner && !$isPrimaryForHost) {
            $hostOwnerUser = InvoiceUser::find($companyOwnerUserId) ?? $hostOwnerUser;
        } elseif ($isDefinitelySubUser && $companyOwnerUserId) {
            $hostOwnerUser = InvoiceUser::find($companyOwnerUserId) ?? $hostOwnerUser;
        }

        $canManageCompanyProfile = $isRootless
            || ($isPrimaryForHost && !$isDefinitelySubUser)
            || $isCompanyOwner;

        // Resolve host owner's profile image URL — used as branding fallback for sub-users
        // when no company_logo has been uploaded by the parent account.
        $hostOwnerProfileImgUrl = null;
        if (!$canManageCompanyProfile && $hostOwnerUser) {
            $ownerImg = trim((string) ($hostOwnerUser->profile_img ?? ''));
            if ($ownerImg !== '') {
                if (preg_match('/^https?:\/\//i', $ownerImg)) {
                    $hostOwnerProfileImgUrl = $ownerImg;
                } else {
                    $base = request()?->getSchemeAndHttpHost() ?: rtrim((string) config('app.url'), '/');
                    $hostOwnerProfileImgUrl = $base . '/storage/' . ltrim($ownerImg, '/');
                }
            }
        }

        $hostUser = $this->HostUser;

        // Company details source:
        // - SSO users: resolve from effective team owner so team sees shared details.
        // - non-SSO personal owner: use this user's own company_details.
        // - non-SSO personal sub-user: use the host owner's details so the parent's
        //   company profile is visible to the sub-user (they have no own HostUserDetail).
        // - non-SSO company/admin: prefer primary account holder, then same-host fallback.
        $isPersonalAccount = strtolower((string) ($this->account_type ?? '')) === 'personal';
        $companyRowsOwnerId = ($isPersonalAccount && !$canManageCompanyProfile && $hostOwnerUser)
            ? $hostOwnerUser->id
            : $this->id;
        $companyRows = HostUserDetail::query()
            ->where('host_id', $hostId)
            ->where('type', 'company_details')
            ->when(
                $isSsoUser,
                fn ($q) => $q->where('user_id', $effectiveOwner?->id ?? $this->id)->orderByDesc('id'),
                fn ($q) => $q->when(
                    $isPersonalAccount,
                    fn ($sub) => $sub->where('user_id', $companyRowsOwnerId)->orderBy('id'),
                    fn ($sub) => $sub->where('user_id', (!$isPrimaryForHost && $hostOwnerUser) ? $hostOwnerUser->id : ($primary?->id ?? $this->id))->orderBy('id')
                )
            )
            ->get();
        $companyDetails = $companyRows->unique('name')->keyBy('name');

        $getDetailValue = function ($key) use ($companyDetails) {
            if (isset($companyDetails[$key])) {
                return $companyDetails[$key]->values ?? $companyDetails[$key]->files ?? null;
            }
            return null;
        };

        // ── Bank details (strict context isolation) ──────────────────────
        // Personal context: use ONLY authenticated user's personal bank row.
        // Company context: use ONLY active company's InvoiceCompany bank row.
        $directBank = $this->relationLoaded('bank') ? $this->bank : $this->bank()->first();
        $bankDetails = [
            'account_name' => $directBank?->account_name ?? null,
            'account_number' => $directBank?->account_number ?? null,
            'sort_code' => $directBank?->sort_code ?? null,
        ];

        $feeUserId = $primary?->id ?? $authUser?->id ?? $this->id;
        $userStripeFee = UserStripeFeeSetting::where('user_id', $feeUserId)->first();

        $subject = $this->resource;
        $subjectModel = $subject instanceof InvoiceUser
            ? $subject->fresh(['roles.permissions'])
            : InvoiceUser::query()->with(['roles.permissions'])->find($this->id);

        if ($subjectModel) {
            app(PermissionRegistrar::class)->setPermissionsTeamId(
                $this->resolvePermissionsTeamId($subjectModel)
            );
        }

        $effectivePermissions = $subjectModel
            ? $subjectModel->getAllPermissions()->pluck('name')->unique()->values()
            : collect();

        // Parent company name — query directly using the owner's user_id so it
        // works regardless of the sub-user's own account_type.
        $parentCompanyName = (!$isPrimaryForHost && $hostOwnerUser && $hostId > 0)
            ? HostUserDetail::where('host_id', $hostId)
                ->where('user_id', $hostOwnerUser->id)
                ->where('type', 'company_details')
                ->where('name', 'company_name')
                ->value('values')
            : null;

        $onBoarding = DB::table('user_onboarding_states')->where('user_id', $authUser?->id ?? $this->id)->first();

        $emptyCompany = [
            'company_name' => null,
            'company_logo' => null,
            'business_registration_number' => null,
            'years_in_business' => null,
            'vat_no' => null,
            'partnerships' => null,
            'service_areas' => null,
            'company_address' => null,
            'business_email' => null,
            'office_hours' => null,
            'phone_number' => null,
            'company_website' => null,
            'business_highlights' => null,
            'mission_statement' => null,
            'about_the_company' => null,
            'bio' => null,
            'company_currency' => 'GBP',
        ];

        $emptySocial = [
            'facebook' => null,
            'instagram' => null,
            'linkedin' => null,
            'twitter' => null,
        ];


        $companyPayload = [
            'company_name' => $getDetailValue('company_name'),
            'company_logo' => $getDetailValue('company_logo')
                ? asset('storage/app/public/' . $getDetailValue('company_logo'))
                : $hostOwnerProfileImgUrl,
            'business_registration_number' => $getDetailValue('business_registration_number'),
            'years_in_business' => $getDetailValue('years_in_business'),
            'vat_no' => $getDetailValue('vat_no'),
            'partnerships' => $getDetailValue('partnerships'),
            'service_areas' => $getDetailValue('service_areas'),
            'company_address' => $getDetailValue('company_address'),
            'company_address_nr' => $getDetailValue('company_address_nr'),
            'company_address_street' => $getDetailValue('company_address_street'),
            'company_address_city' => $getDetailValue('company_address_city'),
            'company_address_town' => $getDetailValue('company_address_town'),
            'company_address_postcode' => $getDetailValue('company_address_postcode'),
            'company_address_county' => $getDetailValue('company_address_county'),
            'company_address_country' => $getDetailValue('company_address_country'),
            'business_email' => $getDetailValue('business_email'),
            'office_hours' => $getDetailValue('office_hours'),
            'phone_number' => $getDetailValue('phone_number'),
            'company_website' => $getDetailValue('company_website'),
            'business_highlights' => $getDetailValue('business_highlights'),
            'mission_statement' => $getDetailValue('mission_statement'),
            'about_the_company' => $getDetailValue('about_the_company'),
            'bio' => $hostUser?->short_bio ?? null,
            'company_currency' => $getDetailValue('company_currency') ?? 'GBP'
        ];

        $hasCompanyProfile = trim((string) ($companyPayload['company_name'] ?? '')) !== ''
            || trim((string) ($companyPayload['business_email'] ?? '')) !== ''
            || trim((string) ($companyPayload['company_address'] ?? '')) !== '';

        $resolvedCompanyId = (int) ($this->company_id ?? 0);
        if ($resolvedCompanyId <= 0 && $hasCompanyProfile && $hostId > 0) {
            $resolvedCompanyId = $hostId;
        }

        $ownedCompanyQuery = Company::query()
            ->withoutGlobalScopes()
            ->where('owner_user_id', $this->id);
        // Sub-users: also include companies under the same host
        if (!empty($this->host_id)) {
            $ownedCompanyQuery->orWhere('host_id', (int) $this->host_id);
        }
        $ownedCompanyRows = $ownedCompanyQuery
            ->withoutGlobalScopes()
            ->orderByDesc('id')
            ->get(['id', 'host_id', 'company_name', 'business_email', 'company_address', 'company_currency', 'is_active']);

        // Batch-fetch HostUserDetail rich fields for all company host_ids in one query.
        $companyHostIds = $ownedCompanyRows->pluck('host_id')->filter()->unique()->values()->toArray();
        $richDetailsByHost = collect();
        if (!empty($companyHostIds)) {
            $richDetailsByHost = HostUserDetail::query()
                ->whereIn('host_id', $companyHostIds)
                ->where('type', 'company_details')
                ->get()
                ->groupBy('host_id')
                ->map(fn ($rows) => $rows->unique('name')->keyBy('name'));
        }

        $getHostDetail = function (int $hId, string $key) use ($richDetailsByHost) {
            $details = $richDetailsByHost->get($hId);
            if ($details && isset($details[$key])) {
                return $details[$key]->values ?? $details[$key]->files ?? null;
            }
            return null;
        };

        // Batch-fetch Bank details for all companies
        $bankDetailsByHost = collect();
        if (!empty($companyHostIds)) {
            $bankDetailsByHost = DB::table('invoices_companies')
                ->whereIn('host_id', $companyHostIds)
                ->get(['host_id', 'company_id', 'account_name', 'account_number', 'sort_code'])
                ->groupBy('host_id');
        }

        // Batch-fetch Stripe status for all companies
        $stripeStatusByHost = collect();
        if (!empty($companyHostIds)) {
            $stripeStatusByHost = \App\Models\HostUserStripe::whereIn('host_id', $companyHostIds)
                ->get(['host_id', 'stripe_connection_status'])
                ->keyBy('host_id');
        }

        $ownedCompanies = $ownedCompanyRows->map(function (Company $company) use ($getHostDetail, $bankDetailsByHost, $stripeStatusByHost) {
            $hId = (int) $company->host_id;
            $rawLogo = $getHostDetail($hId, 'company_logo');

            // Resolve bank details from batch
            $banks = $bankDetailsByHost->get($hId);
            $companyBank = $banks ? $banks->firstWhere('company_id', (int) $company->id) : null;
            if (!$companyBank && $banks) {
                $companyBank = $banks->first();
            }

            return [
                'id'             => (int) $company->id,
                'host_id'        => $hId,
                'account_type'   => 'company',
                'company_name'   => $getHostDetail($hId, 'company_name') ?? $company->company_name,
                'business_email' => $getHostDetail($hId, 'business_email') ?? $company->business_email,
                'company_address'=> $getHostDetail($hId, 'company_address') ?? $company->company_address,
                'company_currency'=> $getHostDetail($hId, 'company_currency') ?? $company->company_currency ?: 'GBP',
                'company_logo'   => $rawLogo ? asset('storage/app/public/' . $rawLogo) : null,
                'vat_no'         => $getHostDetail($hId, 'vat_no'),
                'phone_number'   => $getHostDetail($hId, 'phone_number'),
                'is_active'      => (bool) ($company->is_active ?? true),
                'bank'           => [
                    'account_name'   => $companyBank->account_name ?? null,
                    'account_number' => $companyBank->account_number ?? null,
                    'sort_code'      => $companyBank->sort_code ?? null,
                ],
                'stripe'         => [
                    'status' => $stripeStatusByHost->get($hId)->stripe_connection_status ?? 'not_connected',
                ],
            ];
        })->values();

        $currentContext = ['type' => 'personal'];
        $isCompanyAccount = strtolower((string) ($this->account_type ?? '')) === 'company';
        if (($this->active_context_type ?? 'personal') === 'company' || ($isCompanyAccount && empty($this->active_context_type))) {
            $activeCompanyId = (int) ($this->active_company_id ?? 0);
            $activeCompany = null;

            if ($activeCompanyId > 0) {
                $activeCompany = $ownedCompanies->firstWhere('id', $activeCompanyId);
                if (!$activeCompany) {
                    $dbCompany = Company::query()
                        ->where('id', $activeCompanyId)
                        ->where('owner_user_id', $this->id)
                        ->first(['id', 'host_id', 'company_name']);
                    // Sub-user lookup
                    if (!$dbCompany && !empty($this->host_id)) {
                        $dbCompany = Company::query()
                            ->where('id', $activeCompanyId)
                            ->where('host_id', (int) $this->host_id)
                            ->first(['id', 'host_id', 'company_name']);
                    }
                    if ($dbCompany) {
                        $activeCompany = [
                            'id' => (int) $dbCompany->id,
                            'host_id' => (int) $dbCompany->host_id,
                            'company_name' => $dbCompany->company_name,
                        ];
                    }
                }
            }

            if (!$activeCompany && $ownedCompanies->isNotEmpty()) {
                $activeCompany = $ownedCompanies->firstWhere('is_active', true) ?: $ownedCompanies->first();
            }

            if ($activeCompany && (bool) ($activeCompany['is_active'] ?? true)) {
                $currentContext = [
                    'type' => 'company',
                    'company_id' => (int) $activeCompany['id'],
                    'host_id' => (int) ($activeCompany['host_id'] ?? 0),
                    'company_name' => $activeCompany['company_name'] ?? null,
                ];
            } elseif (!$activeCompany && $isCompanyAccount && !empty($this->host_id)) {
                // Company-registered users (Flow 2) may not have a row in the companies table.
                // Their own host_id IS the company context. For sub-users, use the host's
                // company name from host_user_details rather than the sub-user's own name.
                $currentContext = [
                    'type' => 'company',
                    'company_id' => null,
                    'host_id' => (int) $this->host_id,
                    'company_name' => $getDetailValue('company_name')
                        ?: ($parentCompanyName
                            ?: ($this->name ?? ($this->first_name . ' ' . $this->last_name))),
                ];
            }
        }

        // ── Sub-user override: always force company context ────────────────
        // Team-members never own a company; they always operate under the
        // parent's company (shared host_id). If context wasn't already set
        // to company above, force it now so `company` is populated correctly.
        if (!$canManageCompanyProfile && $currentContext['type'] !== 'company') {
            $fallbackCompany = $ownedCompanies->firstWhere('is_active', true)
                ?: $ownedCompanies->first();

            if ($fallbackCompany) {
                // Real Company row found under the same host — use it.
                $currentContext = [
                    'type'         => 'company',
                    'company_id'   => (int) $fallbackCompany['id'],
                    'host_id'      => (int) ($fallbackCompany['host_id'] ?? 0),
                    'company_name' => $fallbackCompany['company_name'] ?? null,
                ];
            } elseif ($hostId > 0) {
                // No Company row, but HostUserDetail data exists for the host.
                // Create a virtual company context so $companyPayload is returned.
                $currentContext = [
                    'type'         => 'company',
                    'company_id'   => null,
                    'host_id'      => $hostId,
                    'company_name' => $getDetailValue('company_name'),
                ];
            }
        }

        // ── Active context company resolution ─────────────────────────────
        // When the user is in a company context, resolve `company` and
        // `company_id` from the active Company record + its HostUserDetail
        // rich profile, instead of from the user's static company_id FK.
        // All original logic above is preserved as the personal/fallback path.
        $activeContextCompany = null;
        $activeContextSocialLinks = [
            'facebook' => null,
            'instagram' => null,
            'linkedin' => null,
            'twitter' => null,
        ];
        if ($currentContext['type'] === 'company' && !empty($currentContext['company_id'])) {
            if (!$activeContextCompanyRow || (int) $activeContextCompanyRow->id !== (int) $currentContext['company_id']) {
                $activeContextCompanyRow = Company::query()
                    ->where('id', (int) $currentContext['company_id'])
                    ->where('owner_user_id', $this->id)
                    ->first();
                // Sub-user lookup
                if (!$activeContextCompanyRow && !empty($this->host_id)) {
                    $activeContextCompanyRow = Company::query()
                        ->where('id', (int) $currentContext['company_id'])
                        ->where('host_id', (int) $this->host_id)
                        ->first();
                }
            }

            if ($activeContextCompanyRow) {
                $activeHostId = (int) $activeContextCompanyRow->host_id;

                $activeCompanyRows    = HostUserDetail::query()
                    ->where('host_id', $activeHostId)
                    ->where('type', 'company_details')
                    ->orderByDesc('id')
                    ->get();
                $activeCompanyDetails = $activeCompanyRows->unique('name')->keyBy('name');

                $getActiveDetailValue = function ($key) use ($activeCompanyDetails) {
                    if (isset($activeCompanyDetails[$key])) {
                        return $activeCompanyDetails[$key]->values ?? $activeCompanyDetails[$key]->files ?? null;
                    }
                    return null;
                };

                $activeContextCompany = [
                    'id'                           => (int) $activeContextCompanyRow->id,
                    'account_type'                 => 'company',
                    'company_name'                 => $getActiveDetailValue('company_name') ?? $activeContextCompanyRow->company_name,
                    'company_logo'                 => $getActiveDetailValue('company_logo')
                        ? asset('storage/app/public/' . $getActiveDetailValue('company_logo'))
                        : $hostOwnerProfileImgUrl,
                    'business_registration_number' => $getActiveDetailValue('business_registration_number'),
                    'years_in_business'            => $getActiveDetailValue('years_in_business'),
                    'vat_no'                       => $getActiveDetailValue('vat_no'),
                    'partnerships'                 => $getActiveDetailValue('partnerships'),
                    'service_areas'                => $getActiveDetailValue('service_areas'),
                    'company_address'              => $getActiveDetailValue('company_address') ?? $activeContextCompanyRow->company_address,
                    'company_address_nr'           => $getActiveDetailValue('company_address_nr'),
                    'company_address_street'       => $getActiveDetailValue('company_address_street'),
                    'company_address_city'         => $getActiveDetailValue('company_address_city'),
                    'company_address_town'         => $getActiveDetailValue('company_address_town'),
                    'company_address_postcode'     => $getActiveDetailValue('company_address_postcode'),
                    'company_address_county'       => $getActiveDetailValue('company_address_county'),
                    'company_address_country'      => $getActiveDetailValue('company_address_country'),
                    'business_email'               => $getActiveDetailValue('business_email') ?? $activeContextCompanyRow->business_email,
                    'office_hours'                 => $getActiveDetailValue('office_hours'),
                    'phone_number'                 => $getActiveDetailValue('phone_number'),
                    'company_website'              => $getActiveDetailValue('company_website'),
                    'business_highlights'          => $getActiveDetailValue('business_highlights'),
                    'mission_statement'            => $getActiveDetailValue('mission_statement'),
                    'about_the_company'            => $getActiveDetailValue('about_the_company'),
                    'bio'                          => $getActiveDetailValue('short_bio'),
                    'company_currency'             => $getActiveDetailValue('company_currency')
                        ?? $activeContextCompanyRow->company_currency
                        ?? 'GBP',
                ];

                $activeContextSocialLinks = [
                    'facebook' => $getActiveDetailValue('social_media_links_facebook'),
                    'instagram' => $getActiveDetailValue('social_media_links_instagram'),
                    'linkedin' => $getActiveDetailValue('social_media_links_linkedin'),
                    'twitter' => $getActiveDetailValue('social_media_links_twitter'),
                ];
            }
        }

        $activeCompanyBankDetails = ['account_name' => null, 'account_number' => null, 'sort_code' => null];
        $bankLookupHostId = $activeContextCompanyRow
            ? (int) $activeContextCompanyRow->host_id
            : (!$canManageCompanyProfile && $hostId > 0 ? $hostId : 0);
        if ($activeContextCompanyRow || $bankLookupHostId > 0) {
            // Personal-context parents (super-admin / personal account type) always save
            // bank details to user_banks, never to invoices_companies.  Skip the
            // invoices_companies lookup for sub-users of those parents so a stale
            // invoices_companies row (e.g. from an old company context) cannot shadow
            // the freshly updated user_banks entry.
            $hostOwnerAccountType = strtolower((string) ($hostOwnerUser?->account_type ?? ''));
            $parentIsPersonalContext = !$activeContextCompanyRow
                && in_array($hostOwnerAccountType, ['personal', 'super-admin', ''], true);

            $invoiceCompany = null;
            if (!$parentIsPersonalContext) {
                $invoiceCompanyQuery = DB::table('invoices_companies')
                    ->where('host_id', $bankLookupHostId);
                // Per-company bank details: also filter by company_id when available
                if ($activeContextCompanyRow && !empty($activeContextCompanyRow->id)) {
                    $invoiceCompanyQuery->where('company_id', (int) $activeContextCompanyRow->id);
                }
                $invoiceCompany = $invoiceCompanyQuery->first(['account_name', 'account_number', 'sort_code']);
            }

            $activeCompanyBankDetails = [
                'account_name' => $invoiceCompany?->account_name ?? null,
                'account_number' => $invoiceCompany?->account_number ?? null,
                'sort_code' => $invoiceCompany?->sort_code ?? null,
            ];

            // If invoices_companies has no bank data, check the Company table
            $hasBankData = !empty($activeCompanyBankDetails['account_name'])
                || !empty($activeCompanyBankDetails['account_number'])
                || !empty($activeCompanyBankDetails['sort_code']);
            if (!$hasBankData && $activeContextCompanyRow) {
                $companyBank = Company::where('id', (int) $activeContextCompanyRow->id)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($companyBank) {
                    $activeCompanyBankDetails = [
                        'account_name' => $companyBank->account_name ?? null,
                        'account_number' => $companyBank->account_number ?? null,
                        'sort_code' => $companyBank->sort_code ?? null,
                    ];
                    $hasBankData = true;
                }
            }

            // If still no bank data, fall back to the host owner's user_banks row.
            // This handles cases where the parent saved bank details via the Company Branding form
            // (which writes to user_banks, not invoices_companies).
            if (!$hasBankData && $bankLookupHostId > 0) {
                $parentUser = $hostOwnerUser
                    ?? InvoiceUser::primaryBillingUserForHost($bankLookupHostId);
                if ($parentUser) {
                    $parentBank = \Modules\User\Models\UserBank::where('user_id', $parentUser->id)
                        ->first(['account_name', 'account_number', 'sort_code']);
                    if ($parentBank) {
                        $activeCompanyBankDetails = [
                            'account_name' => $parentBank->account_name ?? null,
                            'account_number' => $parentBank->account_number ?? null,
                            'sort_code' => $parentBank->sort_code ?? null,
                        ];
                    }
                }
            }
        }

        $isCompanyContext = ($currentContext['type'] ?? 'personal') === 'company';
        $resolvedBankDetails = $isCompanyContext ? $activeCompanyBankDetails : $bankDetails;
        $hasActiveContextSocial = !empty($activeContextSocialLinks['facebook'])
            || !empty($activeContextSocialLinks['instagram'])
            || !empty($activeContextSocialLinks['linkedin'])
            || !empty($activeContextSocialLinks['twitter']);
        $resolvedSocialLinks = $isCompanyContext
            ? ($hasActiveContextSocial
                ? $activeContextSocialLinks
                : [
                    'facebook'  => $getDetailValue('social_media_links_facebook'),
                    'instagram' => $getDetailValue('social_media_links_instagram'),
                    'linkedin'  => $getDetailValue('social_media_links_linkedin'),
                    'twitter'   => $getDetailValue('social_media_links_twitter'),
                ])
            : [
                'facebook' => $getDetailValue('social_media_links_facebook'),
                'instagram' => $getDetailValue('social_media_links_instagram'),
                'linkedin' => $getDetailValue('social_media_links_linkedin'),
                'twitter' => $getDetailValue('social_media_links_twitter'),
            ];

        $resolvedProfileImg = $this->resolveProfileImageUrl();

        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'team_id' => $this->team_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'team_owner_name' => (!$isPrimaryForHost && !$isCompanyOwner && $hostOwnerUser)
                ? (
                    $parentCompanyName
                    ?: trim(($hostOwnerUser->first_name ?? '') . ' ' . ($hostOwnerUser->last_name ?? ''))
                )
                : null,
            'email' => $this->email,
            'user_name' => $this->user_name,
            'phone' => $this->phone_number,
            'profile_img' => $resolvedProfileImg,
            'account_type' => $this->account_type,
            'company_designation' => $this->company_designation,
            'short_bio' => $hostUser?->short_bio ?? null,
            'location' => $hostUser?->location ?? null,
            'theme_color' => (function () use ($hostId) {
                $host = \App\Models\Host::find($hostId);
                return $host?->theme_color ?? $this->theme_color;
            })(),
            'invoice_theme_color' => (function () use ($hostId) {
                $host = \App\Models\Host::find($hostId);
                return $host?->invoice_theme_color ?? $this->invoice_theme_color;
            })(),
            'company_id' => $isCompanyContext
                ? ($activeContextCompany
                    ? (int) $activeContextCompany['id']
                    : ($hasCompanyProfile ? $resolvedCompanyId : null))
                : null,
            'company' => $isCompanyContext
                ? ($activeContextCompany
                    ?: ($hasCompanyProfile
                        ? array_merge(
                            [
                                'id' => $resolvedCompanyId,
                                'account_type' => 'company',
                            ],
                            $companyPayload
                        )
                        : null))
                : null,
            'current_context' => $currentContext,
            'active_context_type' => (string) ($this->active_context_type ?? ($isCompanyAccount ? 'company' : 'personal')),
            'active_company_id' => !empty($this->active_company_id) ? (int) $this->active_company_id : null,
            'available_companies' => $ownedCompanies,
            'social_links' => $resolvedSocialLinks,
            'can_manage_company_profile' => $canManageCompanyProfile,
            'bank' => [
                'account_name' => $resolvedBankDetails['account_name'] ?? null,
                'account_number' => $resolvedBankDetails['account_number'] ?? null,
                'sort_code' => $resolvedBankDetails['sort_code'] ?? null,
            ],

            'stripe' => (function () use ($hostId, $userStripeFee, $canManageCompanyProfile) {
                $hostStripe = $this->stripeForHost($hostId);
                // Sub-users: inherit the parent host's stripe connection when they have none.
                // This allows sub-users of super-admin (or any admin) to use the parent's
                // connected Stripe account for invoicing without needing their own.
                if (!$hostStripe && !$canManageCompanyProfile && $hostId > 0) {
                    $hostStripe = \App\Models\HostUserStripe::where('host_id', $hostId)->first();
                }
                return [
                    'secret_key' => $hostStripe?->secret_key,
                    'publish_key' => $hostStripe?->publish_key,
                    'status' => $hostStripe?->stripe_connection_status ?? 'not_connected',
                    'stripe_fee_percentage' => $userStripeFee?->stripe_fee_percentage ?? null,
                    'stripe_fixed_fee' => $userStripeFee?->stripe_fixed_fee ?? null,
                ];
            })(),
            // Roles: relation (Role models) or pre-plucked names (e.g. from login)
            'roles' => $subjectModel
                ? $subjectModel->roles->pluck('name')->values()
                : ($this->roles instanceof \Illuminate\Support\Collection
                    ? ($this->roles->first() instanceof \Illuminate\Database\Eloquent\Model ? $this->roles->pluck('name')->values() : $this->roles->values())
                    : collect($this->roles)->pluck('name')->values()),
            'permissions' => $effectivePermissions,
            'is_active' => $this->is_active ? 'Active' : 'Inactive',
            'is_otp_verified' => $this->is_otp_verified ? 'Active' : 'Inactive',
            'onboarding' => [
                'first_login' => (bool) ($onBoarding->first_login ?? true),
                'has_seen_pricing' => (bool) (
                    $this->has_seen_pricing
                    ?? $onBoarding->has_seen_pricing
                    ?? false
                ),
            ],
            'subscription' => $this->resolveSubscriptionPayload((int) ($primary?->id ?? $this->id)),
        ];
    }

    private function resolveSubscriptionPayload(int $userId): ?array
    {
        $sub = UserSubscription::query()->where('user_id', $userId)->latest('id')->first();

        if (! $sub) {
            return null;
        }

        $trialEnds = $sub->trial_ends_at;
        $availableDays = null;
        if ($trialEnds && $sub->status === 'trialing') {
            $availableDays = max(
                0,
                (int) now()->startOfDay()->diffInDays($trialEnds->copy()->startOfDay(), false),
            );
        }

        $billingUser = InvoiceUser::find($userId);
        $planService = app(SubscriptionPlanService::class);
        $entitlements = $billingUser
            ? $planService->entitlementsForUser($billingUser)
            : [
                'slug' => null,
                'name' => null,
                'features' => [],
                'limits' => [],
                'templates_access' => 'preview',
                'full_trial_access' => false,
            ];

        return [
            'id' => $sub->id,
            'status' => $sub->status,
            'plan_type' => $sub->plan_type,
            'plan_name' => $sub->plan_name,
            'plan_id' => $sub->plan_id,
            'plan_slug' => $entitlements['slug'],
            'trial_ends_at' => $trialEnds?->toIso8601String(),
            'next_payment_at' => $sub->next_payment_at?->toIso8601String(),
            'amount' => (float) $sub->amount,
            'available_days' => $availableDays,
            'trial_days_total' => (int) config('subscription.trial_days', 30),
            'features' => $entitlements['features'],
            'limits' => $entitlements['limits'],
            'templates_access' => $entitlements['templates_access'],
            'allowed_templates' => $billingUser ? $planService->allowedTemplateKeys($billingUser) : ['classic'],
            'full_trial_access' => (bool) $entitlements['full_trial_access'],
        ];
    }

    private function resolveProfileImageUrl(): ?string
    {
        $profileImg = trim((string) ($this->profile_img ?? ''));
        if ($profileImg !== '') {
            // If it's already a full external URL (like S3 or external gravatar), return it.
            // BUT if it's our own domain's storage URL, we fall through to ensure the path is correct.
            if (preg_match('/^https?:\/\//i', $profileImg) && !str_contains($profileImg, config('app.url'))) {
                return $profileImg;
            }

            $base = request()?->getSchemeAndHttpHost() ?: rtrim((string) config('app.url'), '/');
            
            // Extract the relative path if a full URL was stored by mistake
            $path = $profileImg;
            if (str_contains($path, '/storage/')) {
                $path = explode('/storage/', $path)[1];
            }
            
            // Remove 'app/public/' from the start if it was already there to avoid duplication
            $path = ltrim($path, '/');
            $path = preg_replace('/^app\/public\//', '', $path);
            
            return $base . '/storage/app/public/' . $path;
        }

        $avatar = trim((string) ($this->avatar ?? ''));
        if ($avatar !== '') {
            return $avatar;
        }

        return null;
    }

    private function resolvePermissionsTeamId(InvoiceUser $user): ?int
    {
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && !empty($user->active_company_id)
        ) {
            $company = Company::query()
                ->where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            // Sub-user lookup: company under the same host
            if (!$company && !empty($user->host_id)) {
                $company = Company::query()
                    ->where('id', (int) $user->active_company_id)
                    ->where('host_id', (int) $user->host_id)
                    ->first();
            }
            if ($company) {
                $teamId = Team::query()
                    ->where('host_id', (int) $company->host_id)
                    ->orderBy('id')
                    ->value('id');
                if (!empty($teamId)) {
                    return (int) $teamId;
                }
            }
        }

        if (!empty($user->team_id)) {
            return (int) $user->team_id;
        }

        $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
        $pivotTeam = DB::table($pivotTable)
            ->where('model_id', $user->id)
            ->where('model_type', InvoiceUser::class)
            ->orderByRaw('team_id IS NOT NULL DESC')
            ->value('team_id');

        return $pivotTeam !== null ? (int) $pivotTeam : null;
    }
}
