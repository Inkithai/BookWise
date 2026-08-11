<?php

namespace Modules\User\Http\Controllers\API;

use App\Support\TenantRole;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Host;
use App\Models\HostUserDetail;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Modules\Invoice\Models\InvoiceCompany;
use Modules\User\Http\Resources\UserResource;
use App\Services\Subscription\SubscriptionLimitService;

class AccountController extends Controller
{
    public function __construct(
        private readonly SubscriptionLimitService $subscriptionLimits
    ) {
        $this->middleware('auth:api');
    }

    public function mode(Request $request): JsonResponse
    {
        return $this->contexts($request);
    }

    public function contexts(Request $request): JsonResponse
    {
        $user = auth()->user();
        $me = (new UserResource($user->fresh()))->toArray($request);
        $companiesQuery = Company::query()
            ->where('owner_user_id', $user->id);
        // Sub-users: also include companies under the same host
        if (!empty($user->host_id)) {
            $companiesQuery->orWhere('host_id', (int) $user->host_id);
        }
        $companies = $companiesQuery
            ->orderByDesc('id')
            ->get(['id', 'host_id', 'company_name', 'business_email', 'company_address', 'company_currency', 'is_active'])
            ->map(function (Company $company) {
                return [
                    'id' => (int) $company->id,
                    'host_id' => (int) $company->host_id,
                    'account_type' => 'company',
                    'company_name' => $company->company_name,
                    'business_email' => $company->business_email,
                    'company_address' => $company->company_address,
                    'company_currency' => $company->company_currency ?: 'GBP',
                    'is_active' => (bool) ($company->is_active ?? true),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'current_mode' => (string) ($user->active_context_type ?? (strtolower((string) ($user->account_type ?? '')) === 'company' ? 'company' : 'personal')),
                'current_context' => $this->currentContext($user),
                'companies' => $companies,
                'company_exists' => $companies->isNotEmpty(),
                'can_switch_to_company' => $companies->isNotEmpty(),
                'can_switch_to_personal' => true,
                'can_manage_company_profile' => (bool) ($me['can_manage_company_profile'] ?? false),
            ],
        ], 200);
    }

    public function switchMode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_mode' => 'required|string|in:personal,company',
        ]);

        if ($validated['target_mode'] === 'personal') {
            $request->merge(['type' => 'personal']);
        } else {
            $user = auth()->user();
            $firstCompanyId = Company::query()->where('owner_user_id', $user->id)->value('id');
            // Sub-user: find company under the same host
            if (!$firstCompanyId && !empty($user->host_id)) {
                $firstCompanyId = Company::query()->where('host_id', (int) $user->host_id)->value('id');
            }
            if (!$firstCompanyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company profile required',
                    'data' => ['requires_company_setup' => true],
                ], 409);
            }

            $request->merge(['type' => 'company', 'company_id' => (int) $firstCompanyId]);
        }

        return $this->switchContext($request);
    }

    public function switchContext(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|in:personal,company',
            'company_id' => 'required_if:type,company|nullable|integer|min:1',
        ]);
        if ($validator->fails()) {
            $user = auth()->user();
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'data' => [
                    'current_context' => $user ? $this->currentContext($user) : ['type' => 'personal'],
                    'active_company_id' => !empty($user?->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $user ? $this->availableCompanies($user) : [],
                ],
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        $user = auth()->user();

        // NOTE: Super-admin IS allowed to switch context (active_context_type + active_company_id
        // are saved to DB). This is required so all backend data queries correctly resolve the
        // company's isolated host_id via active_company_id. Only host_id and team_id must never
        // change for super-admin — switchContext does NOT touch those fields.

        if ($validated['type'] === 'company') {
            $companyId = (int) ($validated['company_id'] ?? 0);
            if ($companyId <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'company_id is required when type is company.',
                    'data' => [
                        'current_context' => $this->currentContext($user),
                        'active_company_id' => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                        'available_companies' => $this->availableCompanies($user),
                    ],
                ], 422);
            }
            $company = Company::query()
                ->where('id', $companyId)
                ->where('owner_user_id', $user->id)
                ->first();
            // Sub-user: company under the same host
            if (!$company && !empty($user->host_id)) {
                $company = Company::query()
                    ->where('id', $companyId)
                    ->where('host_id', (int) $user->host_id)
                    ->first();
            }
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can switch only to your mapped companies.',
                    'data' => [
                        'current_context' => ['type' => 'personal'],
                        'active_company_id' => null,
                        'available_companies' => [],
                    ],
                ], 403);
            }
            if (!(bool) ($company->is_active ?? true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected company is deactivated.',
                    'data' => [
                        'current_context' => $this->currentContext($user),
                        'active_company_id' => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                        'available_companies' => $this->availableCompanies($user),
                    ],
                ], 409);
            }

            // Ensure the target company has a dedicated team scope and this user has
            // role mappings inside that team before switching context.
            $team = $this->resolveOrCreateTeamForHost((int) $company->host_id, $company->company_name);
            $this->ensureCompanyRolesAndPermissions((int) $company->host_id, (int) $team->id);
            
            // If the user is the owner, force-map the 'admin' role for this team.
            $isOwner = (int) ($company->owner_user_id ?? 0) === (int) $user->id;
            $this->ensureUserRoleMappingsForTeam($user, (int) $team->id, $isOwner);

            $user->active_context_type = 'company';
            $user->active_company_id = $company->id;
            $user->save();
            $availableCompanies = $this->availableCompanies($user);

            return response()->json([
                'success' => true,
                'message' => 'Switched to company context',
                'data' => [
                    'current_context' => $this->currentContext($user->fresh()),
                    'active_company_id' => (int) $company->id,
                    'available_companies' => $availableCompanies,
                ],
            ], 200);
        }

        $user->active_context_type = 'personal';
        $user->active_company_id = null;
        $user->save();
        $availableCompanies = $this->availableCompanies($user);

        return response()->json([
            'success' => true,
            'message' => 'Switched to personal context',
            'data' => [
                'current_context' => $this->currentContext($user->fresh()),
                'active_company_id' => null,
                'available_companies' => $availableCompanies,
            ],
        ], 200);
    }

    public function createCompanyProfile(Request $request): JsonResponse
    {
        return $this->createCompany($request);
    }

    public function createCompany(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Sub-users cannot create companies — only admins/owners can
        if ($user && $user->hasRole('team-member')) {
            return response()->json([
                'success' => false,
                'message' => 'Sub-users cannot create companies. Only account owners can create new companies.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'company_name' => 'required|string|max:255',
            'business_email' => 'required|email',
            'company_address' => 'nullable|string|max:1000',
            'company_currency' => 'required|string|size:3',
        ]);
        if ($validator->fails()) {
            $user = auth()->user();
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'data' => [
                    'current_context' => $user ? $this->currentContext($user) : ['type' => 'personal'],
                    'active_company_id' => !empty($user?->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $user ? $this->availableCompanies($user) : [],
                ],
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        $user = auth()->user();
        $existingCompany = Company::query()
            ->where('owner_user_id', $user->id)
            ->whereRaw('LOWER(company_name) = ?', [strtolower($validated['company_name'])])
            ->first();
        if ($existingCompany) {
            return response()->json([
                'success' => false,
                'message' => 'Company profile already exists',
                'data' => [
                    'current_context' => $this->currentContext($user),
                    'active_company_id' => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $this->availableCompanies($user),
                ],
            ], 409);
        }

        $existingEmail = Company::query()
            ->where('owner_user_id', $user->id)
            ->whereRaw('LOWER(business_email) = ?', [strtolower($validated['business_email'])])
            ->first();
        if ($existingEmail) {
            return response()->json([
                'success' => false,
                'message' => 'A company with this email already exists',
                'data' => [
                    'current_context' => $this->currentContext($user),
                    'active_company_id' => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $this->availableCompanies($user),
                ],
            ], 409);
        }

        $this->subscriptionLimits->assertCanCreateCompany($user);

        $company = DB::transaction(function () use ($user, $validated): Company {
            // Always create a dedicated Host for each new company so that
            // multiple companies owned by the same personal user never share
            // the same host_id (and therefore never collide in host_user_details).
            $host   = Host::create(['name' => $validated['company_name']]);
            $hostId = (int) $host->id;

            // Bind personal user to a host only the very first time (no host yet).
            // Subsequent company creations must NOT overwrite users.host_id so that
            // the personal workspace remains on its own host.
            // Super-admin NEVER gets their host_id/team_id overwritten — they have
            // a dedicated permanent host assigned by migration.
            $isSuperAdmin = strtolower((string) ($user->account_type ?? '')) === 'super-admin'
                || $user->hasRole('super-admin');

            if (!$isSuperAdmin && (int) ($user->host_id ?? 0) <= 0) {
                $user->host_id = $hostId;
            }

            // Every company host owns its own team scope.
            $team = Team::where('host_id', $hostId)->orderBy('id')->first();
            if (!$team) {
                $team = Team::create([
                    'host_id' => $hostId,
                    'name' => 'Team ' . $validated['company_name'],
                ]);
            }

            // Keep personal default team on user row only once.
            // Super-admin already has their own permanent team — never overwrite it.
            if (!$isSuperAdmin && empty($user->team_id)) {
                $user->team_id = $team->id;
            }

            $detailUpserts = [
                'company_name' => $validated['company_name'],
                'business_email' => $validated['business_email'] ?? null,
                'company_address' => $validated['company_address'] ?? null,
                'company_currency' => strtoupper($validated['company_currency']),
            ];

            foreach ($detailUpserts as $key => $value) {
                HostUserDetail::updateOrCreate(
                    [
                        'host_id' => $hostId,
                        'user_id' => $user->id,
                        'type' => 'company_details',
                        'name' => $key,
                    ],
                    [
                        'values' => $value,
                        'files' => null,
                        'details' => null,
                    ]
                );
            }

            $company = Company::create([
                'owner_user_id' => $user->id,
                'host_id' => $hostId,
                'company_name' => $validated['company_name'],
                'business_email' => $validated['business_email'] ?? null,
                'company_address' => $validated['company_address'] ?? null,
                'company_currency' => strtoupper($validated['company_currency']),
                'is_active' => true,
            ]);

            InvoiceCompany::updateOrCreate(
                ['host_id' => $hostId, 'company_id' => $company->id],
                [
                    'name' => $validated['company_name'],
                    'email' => $validated['business_email'] ?? $user->email,
                    'address' => $validated['company_address'] ?? null,
                ]
            );

            // Some environments no longer have users.company_id (migrated to context fields).
            if (Schema::hasColumn('users', 'company_id') && empty($user->company_id)) {
                $user->company_id = $hostId;
            }
            // Super-admin context stays personal — they manage companies externally,
            // not by switching into a company context themselves.
            if (!$isSuperAdmin) {
                $user->active_context_type = 'company';
                $user->active_company_id   = $company->id;
            }
            $user->save();

            $this->ensureCompanyRolesAndPermissions($hostId, (int) $team->id);
            $this->ensureUserRoleMappingsForTeam($user, (int) $team->id, true);

            return $company;
        });

        $me = (new UserResource($user->fresh()))->toArray($request);
        $availableCompanies = $this->availableCompanies($user);

        return response()->json([
            'success' => true,
            'message' => 'Company profile created',
            'data' => [
                'current_context' => $this->currentContext($user->fresh()),
                'active_company_id' => (int) $company->id,
                'available_companies' => $availableCompanies,
                'company_created' => [
                    'id' => (int) $company->id,
                    'host_id' => (int) $company->host_id,
                    'company_name' => $company->company_name,
                    'business_email' => $company->business_email,
                    'company_address' => $company->company_address,
                    'company_currency' => $company->company_currency,
                ],
                'company_id' => $me['company_id'] ?? null,
                'company' => $me['company'] ?? null,
            ],
        ], 200);
    }

    public function toggleCompanyStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);
        if ($validator->fails()) {
            $user = auth()->user();
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'data' => [
                    'current_context' => $user ? $this->currentContext($user) : ['type' => 'personal'],
                    'active_company_id' => !empty($user?->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $user ? $this->availableCompanies($user) : [],
                ],
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $user = auth()->user();
        $company = Company::query()
            ->where('id', (int) $validated['company_id'])
            ->where('owner_user_id', $user->id)
            ->first();
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found for this user.',
                'data' => [
                    'current_context' => $this->currentContext($user),
                    'active_company_id' => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $this->availableCompanies($user),
                ],
            ], 404);
        }

        $company->is_active = (bool) $validated['is_active'];
        $company->save();

        // If currently active context company was deactivated, fallback to personal.
        if (
            !$company->is_active
            && (string) ($user->active_context_type ?? 'personal') === 'company'
            && (int) ($user->active_company_id ?? 0) === (int) $company->id
        ) {
            $user->active_context_type = 'personal';
            $user->active_company_id = null;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => $company->is_active ? 'Company activated successfully.' : 'Company deactivated successfully.',
            'data' => [
                'current_context' => $this->currentContext($user->fresh()),
                'active_company_id' => !empty($user->fresh()->active_company_id) ? (int) $user->fresh()->active_company_id : null,
                'available_companies' => $this->availableCompanies($user->fresh()),
            ],
        ], 200);
    }

    public function deleteCompany(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            $user = auth()->user();
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'data' => [
                    'current_context'    => $this->currentContext($user),
                    'active_company_id'  => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $this->availableCompanies($user),
                ],
                'errors' => $validator->errors(),
            ], 422);
        }

        $user    = auth()->user();
        $company = Company::query()
            ->where('id', (int) $request->company_id)
            ->where('owner_user_id', $user->id)
            ->first();

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found for this user.',
                'data' => [
                    'current_context'    => $this->currentContext($user),
                    'active_company_id'  => !empty($user->active_company_id) ? (int) $user->active_company_id : null,
                    'available_companies' => $this->availableCompanies($user),
                ],
            ], 404);
        }

        // If the user is currently on this company context, fall back to personal.
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && (int) ($user->active_company_id ?? 0) === (int) $company->id
        ) {
            $user->active_context_type = 'personal';
            $user->active_company_id   = null;
            $user->save();
        }

        // Soft delete — record is preserved in DB with deleted_at timestamp.
        $company->delete();

        $freshUser = $user->fresh();

        return response()->json([
            'success' => true,
            'message' => 'Company deleted successfully.',
            'data' => [
                'current_context'    => $this->currentContext($freshUser),
                'active_company_id'  => !empty($freshUser->active_company_id) ? (int) $freshUser->active_company_id : null,
                'available_companies' => $this->availableCompanies($freshUser),
            ],
        ], 200);
    }

    private function normalizeMode(string $accountType): string
    {
        $value = strtolower(trim($accountType));
        if ($value === 'company') {
            return 'company';
        }

        return 'personal';
    }

    private function currentContext($user): array
    {
        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
        if (!$isCompanyContext) {
            return ['type' => 'personal'];
        }

        $company = null;
        if (!empty($user->active_company_id)) {
            // Owner lookup
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
        }

        if (!$company) {
            // Owner lookup
            $company = Company::query()
                ->where('owner_user_id', $user->id)
                ->where('is_active', true)
                ->orderByDesc('id')
                ->first();
            // Sub-user lookup: company under the same host
            if (!$company && !empty($user->host_id)) {
                $company = Company::query()
                    ->where('host_id', (int) $user->host_id)
                    ->where('is_active', true)
                    ->orderByDesc('id')
                    ->first();
            }
        }

        // Company-registered users (Flow 2) may not have a row in the companies table.
        // Their own host_id IS the company context.
        if (!$company) {
            $isCompanyAccount = strtolower((string) ($user->account_type ?? '')) === 'company';
            if ($isCompanyAccount && !empty($user->host_id)) {
                return [
                    'type' => 'company',
                    'company_id' => null,
                    'host_id' => (int) $user->host_id,
                    'company_name' => $user->name ?? ($user->first_name . ' ' . $user->last_name),
                ];
            }
            return ['type' => 'personal'];
        }

        if (!(bool) ($company->is_active ?? true)) {
            return ['type' => 'personal'];
        }

        return [
            'type' => 'company',
            'company_id' => (int) $company->id,
            'host_id' => (int) $company->host_id,
            'company_name' => $company->company_name,
        ];
    }

    private function availableCompanies($user): \Illuminate\Support\Collection
    {
        $query = Company::query()
            ->where('owner_user_id', $user->id)
            ->orderByDesc('id');

        // Sub-users: also include companies under the same host
        if (!empty($user->host_id)) {
            $query->orWhere('host_id', (int) $user->host_id);
        }

        $rows = $query->get(['id', 'host_id', 'company_name', 'business_email', 'company_address', 'company_currency', 'is_active']);

        $hostIds = $rows->pluck('host_id')->filter()->unique()->values()->toArray();
        $richByHost = collect();
        if (!empty($hostIds)) {
            $richByHost = HostUserDetail::query()
                ->whereIn('host_id', $hostIds)
                ->where('type', 'company_details')
                ->get()
                ->groupBy('host_id')
                ->map(fn ($r) => $r->unique('name')->keyBy('name'));
        }

        $getDetail = function (int $hId, string $key) use ($richByHost) {
            $details = $richByHost->get($hId);
            return ($details && isset($details[$key]))
                ? ($details[$key]->values ?? $details[$key]->files ?? null)
                : null;
        };

        return $rows->map(function (Company $company) use ($getDetail) {
            $hId    = (int) $company->host_id;
            $rawLogo = $getDetail($hId, 'company_logo');
            return [
                'id'              => (int) $company->id,
                'host_id'         => $hId,
                'account_type'    => 'company',
                'company_name'    => $getDetail($hId, 'company_name') ?? $company->company_name,
                'business_email'  => $getDetail($hId, 'business_email') ?? $company->business_email,
                'company_address' => $getDetail($hId, 'company_address') ?? $company->company_address,
                'company_currency'=> $getDetail($hId, 'company_currency') ?? $company->company_currency ?: 'GBP',
                'company_logo'    => $rawLogo ? asset('storage/app/public/' . $rawLogo) : null,
                'vat_no'          => $getDetail($hId, 'vat_no'),
                'phone_number'    => $getDetail($hId, 'phone_number'),
                'is_active'       => (bool) ($company->is_active ?? true),
            ];
        })->values();
    }

    private function resolveOrCreateTeamForHost(int $hostId, ?string $companyName = null): Team
    {
        $team = Team::where('host_id', $hostId)->orderBy('id')->first();
        if ($team) {
            return $team;
        }

        return Team::create([
            'host_id' => $hostId,
            'name' => 'Team ' . ($companyName ?: (string) $hostId),
        ]);
    }

    private function ensureUserRoleMappingsForTeam($user, int $teamId, bool $forceAdmin = false): void
    {
        if ($teamId <= 0) {
            return;
        }

        $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
        $modelTypes = array_values(array_unique([
            get_class($user),
            \Modules\User\Models\User::class,
            \App\Models\User::class,
        ]));

        // 1. Gather roles to map. If forceAdmin is true, ensure 'admin' is in the list.
        $roleIds = DB::table($pivotTable)
            ->where('model_id', (int) $user->id)
            ->whereIn('model_type', $modelTypes)
            ->pluck('role_id')
            ->unique()
            ->values()
            ->toArray();

        if ($forceAdmin) {
            $adminRoleId = DB::table(config('permission.table_names.roles', 'roles'))
                ->where('name', 'admin')
                ->where('team_id', $teamId)
                ->value('id');
            if ($adminRoleId && !in_array($adminRoleId, $roleIds)) {
                $roleIds[] = $adminRoleId;
            }
        }

        // 2. Perform the mapping
        foreach ($roleIds as $roleId) {
            foreach ($modelTypes as $modelType) {
                DB::table($pivotTable)->updateOrInsert(
                    [
                        'role_id' => (int) $roleId,
                        'model_id' => (int) $user->id,
                        'model_type' => $modelType,
                        'team_id' => $teamId,
                    ],
                    []
                );
            }
        }
    }

    /**
     * Create admin/team-member roles for a company's team and sync all
     * non-system permissions to the admin role — same as registration flow.
     */
    private function ensureCompanyRolesAndPermissions(int $hostId, int $teamId): void
    {
        if ($teamId <= 0) {
            return;
        }

        // Create roles scoped to the company's team (idempotent)
        $tenantRoles = collect(['admin', 'team-member']);
        $roles = $tenantRoles->map(fn ($roleName) => TenantRole::firstOrCreateScoped(
            $roleName,
            'api',
            $hostId,
            $teamId
        ));

        // Sync all non-system permissions to the admin role
        $adminRole = $roles->firstWhere('name', 'admin');
        if ($adminRole) {
            $excludedPermissionIds = Permission::where('name', 'like', 'system.%')->pluck('id');
            $permissions = Permission::whereNotIn('id', $excludedPermissionIds)->get();
            $adminRole->syncPermissions($permissions);
        }
    }
}

