<?php

namespace Modules\User\Services;

use App\Models\Host;
use App\Models\Company;
use App\Support\TenantRole;
use App\Models\HostUser;
use App\Models\HostUserDetail;
use App\Models\Team;
use App\Models\UserSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Invoice\Models\InvoiceCompany;
use Modules\User\Http\Resources\UserResource;
use Modules\User\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Throwable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Modules\User\Mail\UserOtpMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class AuthService
{
    public function registerHost(array $data): array
    {
        DB::beginTransaction();

        try {
            $otp = random_int(100000, 999999);
            // Create Host & Team
            // $host = Host::create(['name' => $data['company'] ?? $data['first_name'.' '. $data['last_name']]]);
            // $team = Team::create([
            //     'name' => 'Team ' . $data['company'] ?? 'Team ' . $data['first_name'.' '. $data['last_name'] ],
            //     'host_id' => $host->id,
            // ]);

            $hostName = $data['company'] ?? ($data['first_name'] . ' ' . $data['last_name']);

            // ❌ Check for existing host if account_type is Personal
            // if (isset($data['account_type']) && strtolower($data['account_type']) === 'personal') {
            //     if (Host::where('name', $hostName)->exists()) {
            //         return [
            //             'success' => false,
            //             'message' => 'A host with this name already exists for a personal account.'
            //         ];
            //     }
            // }
            $host = Host::create(['name' => $hostName]);

            $teamName = 'Team ' . ($data['company'] ?? ($data['first_name'] . ' ' . $data['last_name']));
            $team = Team::create([
                'name' => $teamName,
                'host_id' => $host->id,
            ]);


            // Create User with hashed password
            $userData = [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                // Some environments don't have users.name and/or users.user_name columns.
                'name' => $data['company'] ?? "{$data['first_name']} {$data['last_name']}",
                'user_name' => "{$data['first_name']} {$data['last_name']}",
                'phone_number' => $data['phone_number'],
                'email' => $data['email'],
                'password' => $data['password'],
                'host_id' => $host->id,
                'is_active' => $data['active'] ?? 1,
                'is_otp_verified' => $data['active'] ?? 0,
                'account_type' => $data['account_type'] ?? "Company",
                'active_context_type' => (strtolower($data['account_type'] ?? 'company') === 'company') ? 'company' : 'personal',
            ];

            if (Schema::hasTable('users')) {
                foreach (array_keys($userData) as $column) {
                    if (!Schema::hasColumn('users', $column)) {
                        unset($userData[$column]);
                    }
                }
            }

            $user = User::create($userData);

            // Link Host and User
            HostUser::create([
                'host_id' => $host->id,
                'user_id' => $user->id,
            ]);

            HostUserDetail::create([
                'host_id' => $host->id,
                'user_id' => $user->id,
                'type' => 'company_details',
                'name' => 'company_name',
                'values' => $host->name,
            ]);

            InvoiceCompany::create([
                'host_id' => $host->id,
                'code' => 'COMP' . str_pad($host->id, 4, '0', STR_PAD_LEFT),
                'name' => $host->name,
                'email' => $data['email'],
            ]);

            // Create a companies table row for company-registered users (Flow 2)
            // so the companies table is the single source of truth for both flows.
            if (strtolower($data['account_type'] ?? 'company') === 'company') {
                $company = \App\Models\Company::create([
                    'owner_user_id' => $user->id,
                    'host_id' => $host->id,
                    'company_name' => $data['company'] ?? ($data['first_name'] . ' ' . $data['last_name']),
                    'business_email' => $data['email'] ?? null,
                    'company_address' => null,
                    'company_currency' => 'GBP',
                    'is_active' => true,
                ]);
                $user->active_company_id = $company->id;
                $user->save();
            }

            $trialEnds = now()->addDays((int) config('subscription.trial_days', 30));
            $freePlan = \App\Models\Plan::query()
                ->where('slug', config('subscription.free_plan_slug', 'free'))
                ->first();

            UserSubscription::create([
                'user_id' => $user->id,
                'plan_id' => $freePlan?->id,
                'plan_type' => 'trial',
                'plan_name' => ($freePlan?->name ?? 'Free').' (Trial)',
                'status' => 'trialing',
                'amount' => 0,
                'trial_ends_at' => $trialEnds,
                'next_payment_at' => $trialEnds,
                'trial_reminders_sent' => [],
            ]);

            // for first time views
            $isCompanyAccount = strtolower((string) ($data['account_type'] ?? 'company')) === 'company';
            DB::table('user_onboarding_states')->insert([
                'user_id' => $user->id,
                'first_login' => true,
                'has_seen_pricing' => $isCompanyAccount,
            ]);

            // Create roles scoped to host and team
            $tenantRoles = collect(['admin', 'team-member']);
            $roles = $tenantRoles->map(fn ($roleName) => TenantRole::firstOrCreateScoped(
                $roleName,
                'api',
                (int) $host->id,
                (int) $team->id
            ));

            // Assign all permissions to admin role (can exclude if needed)
            $adminRole = $roles->firstWhere('name', 'admin');

            if ($adminRole) {
                // Example: exclude permissions starting with "system."
                $excludedPermissionIds = Permission::where('name', 'like', 'system.%')->pluck('id');

                $permissions = Permission::whereNotIn('id', $excludedPermissionIds)->get();

                // ✅ Sync all permissions to admin role
                $adminRole->syncPermissions($permissions);
            }

            // Assign admin role to user if not already assigned
            if ($adminRole && !$user->hasRole('admin')) {
                $user->roles()->attach($adminRole->id, [
                    'model_type' => User::class,
                    'team_id' => $team->id,
                ]);
            }

            DB::commit();

            Cache::put(
                'email_otp:' . $user->email,
                Hash::make($otp),
                now()->addMinutes(10)
            );

            $mailData = [
                'name' => $user->first_name . ' ' . $user->last_name,
                'otp' => $otp,
            ];

            // Resolve company logo for email header
            $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($user->host_id);
            $emailLogoUrl = $branding['logoUrl'];
            $emailCompanyName = $branding['companyName'];

            try {
                Mail::to($user->email)->send((new UserOtpMail($mailData, $emailLogoUrl, $emailCompanyName))->onConnection('sync'));
            } catch (Throwable $e) {
                // Don't fail registration if SMTP is misconfigured on dev/staging.
                Log::error('OTP email send failed', [
                    'user_id' => $user->id ?? null,
                    'email' => $user->email ?? null,
                    'error' => $e->getMessage(),
                ]);
            }

            $user->load('roles.permissions'); // ✅ load roles + permissions

            return ['success' => true, 'user' => new UserResource($user)];
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Host registration failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $payload = ['success' => false, 'message' => 'Registration failed. Please try again.'];
            // Make dev/staging failures diagnosable without SSHing into logs.
            if (config('app.debug')) {
                $payload['debug'] = [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ];
            }

            return $payload;
        }
    }

    public function login(Request $request): JsonResponse
    {
        try {
            $credentials = $request->only('email', 'password');

            $user = User::where('email', $credentials['email'])->first();

            if ($user && ($user->is_active == 0)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account has been deactivated. Please contact support.',
                ], 403);
            }

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'The email you entered does not exist',
                ], 401);
            }

            if ($user->is_otp_verified == 0) {
                return response()->json([
                    'success' => true,
                    'auth_status' => 'otp_required',
                    'message' => 'OTP verification required. Please check your email.',
                    'data' => [
                        'email' => $user->email,
                    ],
                ], 200);
            }

            $user = \Modules\User\Models\User::where('email', $credentials['email'])->first();

            // Verify password manually (using Hash)
            if (! $user || ! Hash::check($credentials['password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incorrect password',
                ], 401);
            }

            $token = $user->createToken('Invoice Token')->accessToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'data' => [
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => 2592000, // 30 days in seconds
                    'user' => new UserResource($user),
                ],
            ]);
        } catch (Throwable $e) {
            Log::error('Login failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $payload = [
                'success' => false,
                'message' => 'Login failed. Please try again later.',
            ];
            // Include actual error when debugging (e.g. Passport not installed, missing table)
            if (config('app.debug')) {
                $payload['debug'] = [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ];
            }

            return response()->json($payload, 500);
        }
    }

    public function me()
    {
        /** @var \Modules\User\Models\User $user */
        $user = Auth::guard('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication token is missing or invalid.',
            ], 401);
        }

        $accountType = strtolower((string) ($user->account_type ?? ''));
        $isSystemSuperAdmin = in_array($accountType, ['super-admin', 'superadmin'], true);

        // Auto-heal: company-type users should default to company context
        if (!$isSystemSuperAdmin && $accountType === 'company' && empty($user->active_context_type)) {
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
            if ($company) {
                $user->active_context_type = 'company';
                $user->active_company_id = (int) $company->id;
                $user->save();
            }
        }

        // Tenant self-heal for multi-company:
        // - keep user's personal default team stable (user.team_id)
        // - do NOT rewrite all role pivots to one team
        // - ensure current active context has a dedicated team + user role mappings
        $activeContextTeamId = null;
        if (!$isSystemSuperAdmin && !empty($user->host_id)) {
            $personalTeam = Team::where('host_id', (int) $user->host_id)->orderBy('id')->first();
            if (!$personalTeam) {
                $personalTeam = Team::create([
                    'host_id' => (int) $user->host_id,
                    'name' => 'Team ' . ((int) $user->host_id),
                ]);
            }
            if (empty($user->team_id)) {
                $user->team_id = (int) $personalTeam->id;
                $user->save();
            }

            $effectiveHostId = (int) $user->host_id;
            $isCompanyContextForTeam = (string) ($user->active_context_type ?? '') === 'company'
                || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
            if (
                $isCompanyContextForTeam
                && !empty($user->active_company_id)
            ) {
                // Owner lookup
                $activeCompany = Company::query()
                    ->where('id', (int) $user->active_company_id)
                    ->where('owner_user_id', (int) $user->id)
                    ->first();
                // Sub-user lookup: company under the same host
                if (!$activeCompany && !empty($user->host_id)) {
                    $activeCompany = Company::query()
                        ->where('id', (int) $user->active_company_id)
                        ->where('host_id', (int) $user->host_id)
                        ->first();
                }
                if ($activeCompany) {
                    $effectiveHostId = (int) $activeCompany->host_id;
                }
            }

            $activeTeam = Team::where('host_id', $effectiveHostId)->orderBy('id')->first();
            if (!$activeTeam) {
                $activeTeam = Team::create([
                    'host_id' => $effectiveHostId,
                    'name' => 'Team ' . $effectiveHostId,
                ]);
            }
            $activeContextTeamId = (int) $activeTeam->id;

            $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
            $modelTypes = array_values(array_unique([
                User::class,
                \App\Models\User::class,
            ]));
            $hasRoleInActiveTeam = DB::table($pivotTable)
                ->where('model_id', (int) $user->id)
                ->whereIn('model_type', $modelTypes)
                ->where('team_id', $activeContextTeamId)
                ->exists();

            if (!$hasRoleInActiveTeam) {
                $roleIds = DB::table($pivotTable)
                    ->where('model_id', (int) $user->id)
                    ->whereIn('model_type', $modelTypes)
                    ->pluck('role_id')
                    ->unique()
                    ->values()
                    ->toArray();

                foreach ($roleIds as $roleId) {
                    foreach ($modelTypes as $modelType) {
                        DB::table($pivotTable)->updateOrInsert(
                            [
                                'role_id' => (int) $roleId,
                                'model_type' => $modelType,
                                'model_id' => (int) $user->id,
                                'team_id' => $activeContextTeamId,
                            ],
                            []
                        );
                    }
                }
            }

            app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($activeContextTeamId);
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }

        // Ensure the user always has at least a basic role in Invoice app so policy
        // checks (invoice.view, invoice.create, etc.) don't fail. Spatie scopes roles
        // by team_id, so we must set user.team_id and pivot.team_id to the same value.
        $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
        $hasAnyRole = DB::table($pivotTable)
            ->where('model_id', $user->id)
            ->where('model_type', User::class)
            ->exists();
        try {
            if (!$hasAnyRole) {
                $roleName = $isSystemSuperAdmin ? 'super-admin' : 'admin';

                $pivotTeamId = null;
                if ($isSystemSuperAdmin) {
                    $role = Role::where('name', 'super-admin')
                        ->where('guard_name', 'api')
                        ->whereNull('host_id')
                        ->whereNull('team_id')
                        ->first();
                    if (!$role) {
                        $role = Role::create([
                            'name' => 'super-admin',
                            'guard_name' => 'api',
                            'host_id' => null,
                            'team_id' => null,
                        ]);
                    }
                    $pivotTeamId = null; 
                } else {
                    // Ensure user has a valid host_id and team_id so Spatie's team scope finds the role
                    if (empty($user->host_id) || empty($user->team_id)) {
                        $host = Host::orderBy('id')->first() ?: Host::create(['name' => 'Default']);
                        $team = Team::where('host_id', $host->id)->orderBy('id')->first() ?: Team::create(['host_id' => $host->id, 'name' => 'Team A']);
                        
                        $user->host_id = $host->id;
                        $user->team_id = $team->id;
                        $user->save();
                    }
                    
                    $pivotTeamId = (int) $user->team_id;

                    // STRICT: Capture scoped role only, never global.
                    $role = TenantRole::firstOrCreateScoped(
                        'admin',
                        'api',
                        (int) $user->host_id,
                        (int) $user->team_id
                    );
                }

                if ($role) {
                    Log::info('AuthService@me: Auto-repairing missing user role', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'assigned_role' => $role->name,
                        'is_global' => $pivotTeamId === null
                    ]);

                    // Insert for both model types so SetSpatieTeamFromUser middleware
                    // can resolve the team context regardless of which class is stored.
                    $bootstrapModelTypes = array_values(array_unique([
                        User::class,
                        \App\Models\User::class,
                    ]));
                    foreach ($bootstrapModelTypes as $modelType) {
                        $exists = DB::table($pivotTable)
                            ->where('role_id', $role->id)
                            ->where('model_type', $modelType)
                            ->where('model_id', $user->id)
                            ->where('team_id', $pivotTeamId)
                            ->exists();
                        if (!$exists) {
                            DB::table($pivotTable)->insert([
                                'role_id' => $role->id,
                                'model_type' => $modelType,
                                'model_id' => $user->id,
                                'team_id' => $pivotTeamId,
                            ]);
                        }
                    }
                }

                $allPermissions = Permission::where('guard_name', 'api')->pluck('id')->toArray();
                if (!empty($allPermissions)) {
                    $role->syncPermissions($allPermissions);
                }

                /** @var \Modules\User\Models\User $user */
                $user->unsetRelation('roles');
                $user->unsetRelation('permissions');
                $user->load('roles.permissions');
            }
        } catch (\Throwable $e) {
            Log::error('AuthService@me role bootstrap failed', [
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'User fetched successfully.',
            'data' => new UserResource($user),
        ]);
    }

    public function logout()
    {
        try {
            $user = Auth::guard('api')->user();
            if ($user) {
                // Get the current access token from the request and revoke it
                $tokenId = request()->user()->token()->id;

                // Revoke the token
                DB::table('oauth_access_tokens')
                    ->where('id', $tokenId)
                    ->update(['revoked' => true]);
            }
        } catch (Throwable $e) {
            Log::debug('AuthService@logout token revoke skipped', [
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message' => 'Successfully logged out',
        ], 200);
    }
}
