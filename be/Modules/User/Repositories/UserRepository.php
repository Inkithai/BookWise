<?php

namespace Modules\User\Repositories;

use App\Models\Host;
use App\Models\HostUser;
use App\Models\HostUserDetail;
use App\Models\HostUserStripe;
use App\Models\Team;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Modules\Invoice\Models\InvoiceCompany;
use Modules\User\Mail\UserResetPasswordMail;
use Modules\User\Mail\UserCreatePasswordMail;
use Modules\User\Models\User;
use Modules\User\Models\UserBank;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\InvoiceItem;
use App\Models\Receipt;
use App\Models\UserStripeFeeSetting;
use Throwable;

class UserRepository implements UserRepositoryInterface
{
    private User $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function getAll(array $filters)
    {
        $authUser = auth()->user();
        $hostId = $this->resolveTargetHostId($authUser);

        $query = $this->user->with('roles');

        // Always filter by host_id for tenant isolation
        if ($hostId > 0) {
            $query->where('host_id', $hostId);
        }

        // Sub-user detection: sub-users have a host_id and are NOT the primary billing user
        // for that host. They can have ANY role (admin, team-member, or custom).
        $isSubUser = false;
        if (!is_null($authUser->host_id)) {
            $hostIdForCheck = (int) $authUser->host_id;
            $primary = User::primaryBillingUserForHost($hostIdForCheck);
            $isSubUser = !$primary || (int) $primary->id !== (int) $authUser->id;
        }
        // Sub-users see all users under the same host_id — no extra company scope needed.
        // The host_id WHERE above already ensures tenant isolation.

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('users.first_name', 'like', "%$search%")
                    ->orWhere('users.last_name', 'like', "%$search%")
                    ->orWhere('users.email', 'like', "%$search%");
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('users.is_active', $filters['is_active']);
        }

        // Apply pagination if provided (non-DataTables)
        if (!empty($filters['per_page'])) {
            $page = $filters['page'] ?? 1;
            $perPage = (int) $filters['per_page'];
            $query->skip(($page - 1) * $perPage)->take($perPage);
        }

        return $query;
    }

    public function findById($id)
    {
        /** @var User|null $authUser */
        $authUser = auth()->user();

        $hostId = $this->resolveTargetHostId($authUser);

        $query = User::with('roles')->where('id', $id);

        // Super-admin has no host_id (rootless); skip host scoping so their own record is found.
        $isSuperAdmin = strtolower((string) ($authUser->account_type ?? '')) === 'super-admin'
            || $authUser->hasRole('super-admin');
        if (!$isSuperAdmin && $hostId > 0) {
            $query->where('host_id', $hostId);
        }

        $user = $query->firstOrFail();

        if ($authUser->hasRole('admin') || $authUser->hasRole('super-admin')) {
            $user->bank = $user->bank ?? [];
            $user->stripe = $user->HostUserStripe ?? [];
        }

        return $user;
    }

    public function create(array $data)
    {
        try {
            /** @var User|null $authUser */
            $authUser = auth()->user();
            $authAccountType = strtolower((string) ($authUser->account_type ?? ''));
            $account_type = 'Company';
            $hostId = $this->resolveTargetHostId($authUser);
            $teamId = Team::where('host_id', $hostId)->value('id') ?: $authUser->team_id;
            if (empty($teamId)) {
                $team = Team::create([
                    'host_id' => $hostId,
                    'name' => 'Team ' . $hostId,
                ]);
                $teamId = $team->id;
            }

            $password = Str::random(8);
            $company_name = $authUser->host?->name ?? trim($authUser->first_name) . ' ' . trim($authUser->last_name);
            // Normalize user_name and add password
            $data['user_name'] = strtolower(str_replace(' ', '-', $data['user_name']));

            // Resolve role before the transaction so host_role can be derived from it.
            // Try host-scoped lookup first; fall back to ID-only so host_role is always
            // derived from the actual role name even when host_id doesn't match exactly.
            $role = Role::where('id', $data['roles'])->where('host_id', $hostId)->first()
                ?: Role::where('id', $data['roles'])->first();
            // Derive host_role from the assigned Spatie role name:
            //   admin → 'admin' | team-member / anything else → 'member'
            $roleName  = strtolower((string) ($role?->name ?? ''));
            $host_role = $roleName === 'admin' ? 'admin' : 'member';

            $fullName = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''))
                ?: ($data['first_name'] ?? $data['email'] ?? '');

            DB::beginTransaction();

            $userData = [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'name' => $fullName,
                'email' => $data['email'],
                'user_name' => $data['user_name'],
                'password' => $password, // Hash the password
                'phone_number' => $data['phone_number'],
                'company_designation' => $data['company_designation'] ?? '',
                'is_active' => isset($data['active']) ? 1 : 0,
                'is_otp_verified' => 1,
                'is_temp_password' => 1,
                'host_id' => $hostId,
                'team_id' => $teamId,
                'account_type' => $account_type,
                'host_role' => $host_role,
                'active_context_type' => 'company',
                'active_company_id' => in_array($authAccountType, ['super-admin', 'superadmin'])
                    ? null
                    : ($authUser->active_company_id ?? null),
            ];

            // Remove keys for columns that don't exist in the current DB
            if (Schema::hasTable('users')) {
                foreach (array_keys($userData) as $column) {
                    if (!Schema::hasColumn('users', $column)) {
                        unset($userData[$column]);
                    }
                }
            }

            $user = User::create($userData);

            // Attach roles
            if ($role) {
                Log::info('roles1: ' . $role);

                DB::table('model_has_roles')->insert([
                    'role_id' => $role->id,
                    'model_id' => $user->id,
                    'model_type' => User::class,
                    'team_id' => $teamId,
                ]);
            }

            DB::commit();

            // Create reset token & reset URL
            $token = Password::createToken($user);
            DB::table('password_resets')->updateOrInsert(
                ['email' => $user->email],
                [
                    'token' => Hash::make($token),
                    'created_at' => now(),
                ]
            );
            $frontendUrl = trim((string) config('app.frontend_url'));
            if ($frontendUrl !== '' && !preg_match('/^https?:\/\//i', $frontendUrl)) {
                $frontendUrl = 'https://' . ltrim($frontendUrl, '/');
            }

            if ($frontendUrl === '') {
                throw new \Exception('Frontend URL is not configured.');
            }

            $resetUrl = rtrim($frontendUrl, '/') . '/auth/reset-password?token=' . rawurlencode((string) $token) . '&email=' . rawurlencode((string) $user->email);

            // Resolve company logo for email header
            $authUser = auth()->user();
            $hostId = $authUser?->host_id ?? $user->host_id ?? null;
            $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($hostId);
            $emailCompanyName = $company_name ?: $branding['companyName'];

            // Send reset email (sync — bypass queue so user receives it immediately)
            try {
                Mail::to($user->email)->send(
                    (new UserCreatePasswordMail([
                        'name' => $user->first_name,
                        'company_name' => $company_name,
                        'email' => $user->email,
                        'activation_url' => $resetUrl,
                    ], $branding['logoUrl'], $emailCompanyName))->onConnection('sync')
                );
            } catch (\Throwable $mailErr) {
                Log::error('Create-password email send failed: ' . $mailErr->getMessage());
            }

            Log::info("User reset email sent to {$user->email}");

            $user->roles = $user->roles?->pluck('name') ?? collect();

            if ($authUser->hasRole('admin') || $authUser->hasRole('super-admin')) {
                $user->bank = $user->bank ?? [];
                $user->stripe = $user->HostUserStripe ?? [];
            }

            return $user;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('User creation failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            throw new \Exception('Failed to create user: ' . $e->getMessage());
        }
    }

    public function update(array $data, $id, $isRemove)
    {
        try {
            /** @var User|null $authUser */
            $authUser = auth()->user();
            $hostId = $this->resolveTargetHostId($authUser);
            $hostFirstTeamId = Team::where('host_id', $hostId)->value('id');

            $userQuery = User::where('id', $id);
            if (!$authUser->hasRole('super-admin')) {
                $userQuery->where('host_id', $hostId);
            }

            $user = $userQuery->firstOrFail();

            // Use the edited user's team so role is assigned in their team (per-user per-team).
            // Otherwise the role would be in the auth user's team and not show for this user.
            $teamId = $user->team_id ?? $hostFirstTeamId;
            if ($user->team_id === null && $hostFirstTeamId !== null) {
                $user->update(['team_id' => $hostFirstTeamId]);
                $teamId = $hostFirstTeamId;
            }

            DB::beginTransaction();

            // Handle file upload for profile_img if present
            if (request()->hasFile('profile_img')) {
                $file = request()->file('profile_img');

                // ✅ Use underscores for consistency with your working example
                $fileName = 'prof_img_' . $hostId . '_' . time() . '.' . $file->getClientOriginalExtension();

                // ✅ Store file in storage/app/public/profile_img
                $filePath = $file->storeAs('profile_img', $fileName, 'public');

                // ✅ Save relative path for DB, not temp path
                $data['profile_img'] = $filePath;
            }

            // Prepare update data
            $updateData = [];
            $fieldsToSync = [
                'first_name', 'last_name', 'email', 'user_name',
                'phone_number', 'company_designation', 'short_bio', 'location'
            ];

            foreach ($fieldsToSync as $field) {
                if (array_key_exists($field, $data)) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (isset($data['active'])) {
                $updateData['is_active'] = (int) $data['active'];
            }

            // Sync 'name' if names are being updated
            if (isset($data['first_name']) || isset($data['last_name'])) {
                $f = $data['first_name'] ?? $user->first_name;
                $l = $data['last_name'] ?? $user->last_name;
                $updateData['name'] = trim($f . ' ' . $l) ?: ($f ?? ($data['email'] ?? $user->email));
            }

            // Remove keys for columns that don't exist in the current DB
            if (Schema::hasTable('users')) {
                foreach (array_keys($updateData) as $column) {
                    if (!Schema::hasColumn('users', $column)) {
                        unset($updateData[$column]);
                    }
                }
            }

            // Only include profile_img if a new file was uploaded
            if (!empty($data['profile_img'])) {
                $updateData['profile_img'] = $data['profile_img'];
            } else {
                if ($isRemove == true) {
                    $updateData['profile_img'] = null;
                }
            }

            // Update user
            $user->update($updateData);

            // Detach and re-attach roles ONLY IF 'roles' was provided in the input.
            // This prevents accidental role resets when only updating personal info.
            if (isset($data['roles'])) {
                $isTargetSuperAdmin = strtolower((string) ($user->account_type ?? '')) === 'super-admin';
                if (!$isTargetSuperAdmin) {
                    DB::table('model_has_roles')
                        ->where('model_id', $user->id)
                        ->where('model_type', User::class)
                        ->delete(); // clear old roles

                    $roleIds = is_array($data['roles']) ? $data['roles'] : [$data['roles']];
                    foreach ($roleIds as $roleId) {
                        $roleId = (int) $roleId;
                        if ($roleId < 1) {
                            continue;
                        }
                        DB::table('model_has_roles')->insert([
                            'role_id' => $roleId,
                            'model_id' => $user->id,
                            'model_type' => User::class,
                            'team_id' => $teamId,
                        ]);
                    }
                }
            }

            // Update or create host user info
            HostUser::updateOrCreate(
                [
                    // use edited user's host to avoid mismatch
                    'host_id' => $user->host_id ?? $hostId,
                    'user_id' => $user->id,
                ],
                [
                    // avoid missing-key issues
                    'short_bio' => $data['short_bio'] ?? null,
                    'location' => $data['location'] ?? null,
                ]
            );

            DB::commit();

            // Post-commit enrichment should never fail the request.
            // If this fails, user/profile data is already persisted.
            try {
                $registrar = app(\Spatie\Permission\PermissionRegistrar::class);
                $previousTeamId = $registrar->getPermissionsTeamId();
                $registrar->setPermissionsTeamId($teamId);
                $user->unsetRelation('roles');
                $user->load('roles');
                // Do NOT overwrite $user->roles with plucked names — UserResource handles formatting.
                $registrar->setPermissionsTeamId($previousTeamId);
            } catch (Throwable $enrichmentError) {
                Log::warning('User update post-commit enrichment failed', [
                    'user_id' => $user->id,
                    'error' => $enrichmentError->getMessage(),
                ]);
            }

            if ($authUser->hasRole('admin') || $authUser->hasRole('super-admin')) {
                $user->bank = $user->bank ?? [];
                $user->stripe = $user->HostUserStripe ?? [];
            }

            return $user;
        } catch (Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('User update failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            throw new \Exception('Failed to update user. Please try again later.');
        }
    }

    public function changeCompanyData(array $data)
    {
        try {
            /** @var User|null $authUser */
            $authUser = auth()->user();
            // Use active company host when in company context; otherwise personal host.
            $hostId = $this->resolveTargetHostId($authUser);
            $isCompanyContext = (string) ($authUser->active_context_type ?? '') === 'company'
                || (empty($authUser->active_context_type) && strtolower((string) ($authUser->account_type ?? '')) === 'company');

            // Always resolve the authenticated identity row by user id.
            // In company context, target host can differ from users.host_id.
            $user = User::query()
                ->where('id', $authUser->id)
                ->firstOrFail();

            // Ensure we always have a valid target host_id for company-scoped tables.
            // Do not overwrite an already resolved active-company host context.
            if (empty($hostId)) {
                $defaultHost = Host::orderBy('id')->first();
                if (! $defaultHost) {
                    $defaultHost = Host::create(['name' => $data['company_name'] ?? 'Default Host']);
                }
                $hostId = $defaultHost->id;
            }

            // For SSO users, company profile should be shared at team level.
            // Persist company details under the effective team owner record.
            $isSsoUser = !empty($user->sso_id);
            $effectiveCompanyDetailsUserId = $user->id;
            if ($isSsoUser && !empty($user->team_id)) {
                $teamOwner = User::query()
                    ->where('host_id', $hostId)
                    ->where('team_id', $user->team_id)
                    ->orderByRaw("CASE LOWER(COALESCE(account_type,'')) WHEN 'company' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END")
                    ->orderBy('id')
                    ->first();
                if ($teamOwner) {
                    $effectiveCompanyDetailsUserId = (int) $teamOwner->id;
                }
            }

            DB::beginTransaction();
            /**
             * ------------------------------------------
             * 1️⃣ Strict context isolation
             * ------------------------------------------
             * Personal context:
             * - update personal bank only (user_banks)
             * Company context:
             * - update active company details only
             */

            if (array_key_exists('account_name', $data) || array_key_exists('account_number', $data) || array_key_exists('sort_code', $data)) {
                // Sub-users cannot update bank details — only admins/owners can
                // Sub-users cannot update bank details unless they have company.change permission.
                // Detect sub-users by structure (host_id + not primary), not by role name.
                $authHostId = (int) ($authUser->host_id ?? 0);
                $authPrimary = $authHostId > 0 ? User::primaryBillingUserForHost($authHostId) : null;
                $authIsSubUser = $authHostId > 0 && (!$authPrimary || (int) $authPrimary->id !== (int) $authUser->id);
                if ($authIsSubUser && !$authUser->can('company.change')) {
                    unset($data['account_name'], $data['account_number'], $data['sort_code']);
                } elseif (!$isCompanyContext) {
                    // Personal context: update only the user's private bank row.
                    UserBank::updateOrCreate(
                        ['user_id' => $user->id],
                        [
                            'account_name' => $data['account_name'] ?? null,
                            'account_number' => $data['account_number'] ?? null,
                            'sort_code' => $data['sort_code'] ?? null,
                        ]
                    );
                } else {
                    // Company context: update both InvoiceCompany and Company tables.
                    $activeCompanyId = (int) ($authUser->active_company_id ?? 0);
                    
                    // Update InvoiceCompany table
                    InvoiceCompany::updateOrCreate(
                        ['host_id' => $hostId, 'company_id' => $activeCompanyId ?: null],
                        [
                            'account_name' => $data['account_name'] ?? null,
                            'account_number' => $data['account_number'] ?? null,
                            'sort_code' => $data['sort_code'] ?? null,
                        ]
                    );

                    // Also update Company table
                    $company = Company::where('host_id', $hostId)
                        ->where('owner_user_id', $authUser->id)
                        ->first();
                    if ($company) {
                        $company->update([
                            'account_name' => $data['account_name'] ?? null,
                            'account_number' => $data['account_number'] ?? null,
                            'sort_code' => $data['sort_code'] ?? null,
                        ]);
                    }
                }
            }

            // Handle profile_img upload (especially for personal context)
            if (request()->hasFile('profile_img')) {
                $file = request()->file('profile_img');
                $fileName = 'prof_img_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $filePath = $file->storeAs('profile_img', $fileName, 'public');
                $user->update(['profile_img' => $filePath]);

                // Clear any cached details
                $user->unsetRelation('companyDetails');
            }

            if ($isCompanyContext) {
                /**
                 * ------------------------------------------
                 * 2️⃣ Update Host Name (company context only)
                 * ------------------------------------------
                 */
                if (!empty($data['company_name'])) {
                    $host = Host::find($hostId);
                    if ($host) {
                        $host->update(['name' => $data['company_name']]);
                    }
                }

                $nullableFields = [
                    'office_hours',
                    'years_in_business',
                    'business_registration_number',
                    'business_email',
                    'company_address',
                    'company_address_nr',
                    'company_address_street',
                    'company_address_city',
                    'company_address_town',
                    'company_address_postcode',
                    'company_address_county',
                    'company_address_country',
                ];

                /**
                 * ------------------------------------------
                 * 3️⃣ Handle Company Details + File Upload
                 * ------------------------------------------
                 */
                $companyDetailsKeys = [
                    'company_name',
                    'company_logo',
                    'business_registration_number',
                    'years_in_business',
                    'vat_no',
                    'partnerships',
                    'service_areas',
                    'company_address',
                    'company_address_nr',
                    'company_address_street',
                    'company_address_city',
                    'company_address_town',
                    'company_address_postcode',
                    'company_address_county',
                    'company_address_country',
                    'business_email',
                    'office_hours',
                    'phone_number',
                    'company_website',
                    'social_media_links_facebook',
                    'social_media_links_instagram',
                    'social_media_links_linkedin',
                    'social_media_links_twitter',
                    'business_highlights',
                    'mission_statement',
                    'about_the_company',
                    'company_currency'
                ];

                $hasCompanyLogoFile = request()->hasFile('company_logo');

                foreach ($companyDetailsKeys as $key) {
                    $value = $data[$key] ?? null;
                    $filePath = null;

                    if ($key === 'company_logo') {
                        // Only touch company_logo when a real uploaded file is present.
                        // This prevents nulling logo path during text-only updates.
                        if (!$hasCompanyLogoFile) {
                            continue;
                        }
                        $file = request()->file('company_logo');
                        $fileName = 'comp_logo_' . $hostId . '.' . time() . '.' . $file->getClientOriginalExtension();

                        $filePath = $file->storeAs('company_logo', $fileName, 'public');
                        if (!$filePath) {
                            throw new \Exception('File upload failed for company_logo.');
                        }

                        HostUserDetail::updateOrCreate(
                            [
                                'host_id' => $hostId,
                                'user_id' => $effectiveCompanyDetailsUserId,
                                'type' => 'company_details',
                                'name' => 'company_logo',
                            ],
                            [
                                'values' => null,
                                'files' => $filePath,
                                'details' => null,
                            ]
                        );
                        continue;
                    }

                    // Save when key is present in the request (allows empty-string to clear)
                    // or when an upload file path was resolved.
                    if (array_key_exists($key, $data) || !empty($filePath)) {
                        HostUserDetail::updateOrCreate(
                            [
                                'host_id' => $hostId,
                                'user_id' => $effectiveCompanyDetailsUserId,
                                'type' => 'company_details',
                                'name' => $key,
                            ],
                            [
                                'values' => $key === 'company_logo' ? null : ($value === '' ? null : $value),
                                'files' => $filePath,
                                'details' => null,
                            ]
                        );
                    }
                }

                /**
                 * ------------------------------------------
                 * 4️⃣ Stripe Configuration (company context only)
                 * ------------------------------------------
                 */
                if (array_key_exists('stripe_secret_key', $data) || array_key_exists('stripe_published_key', $data)) {
                    // Sub-users cannot update Stripe configuration — only admins/owners can.
                    // Sub-users cannot update Stripe configuration unless they have company.change permission.
                    // Detect sub-users by structure, not by role name.
                    $stripeAuthHostId = (int) ($authUser->host_id ?? 0);
                    $stripeAuthPrimary = $stripeAuthHostId > 0 ? User::primaryBillingUserForHost($stripeAuthHostId) : null;
                    $stripeAuthIsSubUser = $stripeAuthHostId > 0 && (!$stripeAuthPrimary || (int) $stripeAuthPrimary->id !== (int) $authUser->id);
                    if (!$stripeAuthIsSubUser || $authUser->can('company.change')) {
                        HostUserStripe::updateOrCreate(
                            [
                                'host_id'      => $hostId,
                                'host_user_id' => $user->id,
                            ],
                            [
                                'secret_key'  => $data['stripe_secret_key'] ?? null,
                                'publish_key' => $data['stripe_published_key'] ?? null,
                            ]
                        );
                    }
                }

            } else {
                /**
                 * ------------------------------------------
                 * Personal context / Super-admin profile save
                 * ------------------------------------------
                 * Super-admin has no company context but can still save social links
                 * and basic profile fields under the resolved hostId.
                 * Personal-context users likewise store their profile here.
                 */

                // Handle company_logo upload for personal context (same logic as company context).
                if ($hostId > 0 && request()->hasFile('company_logo')) {
                    $logoFile = request()->file('company_logo');
                    $logoFileName = 'comp_logo_' . $hostId . '.' . time() . '.' . $logoFile->getClientOriginalExtension();
                    $logoFilePath = $logoFile->storeAs('company_logo', $logoFileName, 'public');
                    if ($logoFilePath) {
                        HostUserDetail::updateOrCreate(
                            [
                                'host_id' => $hostId,
                                'user_id' => $effectiveCompanyDetailsUserId,
                                'type'    => 'company_details',
                                'name'    => 'company_logo',
                            ],
                            [
                                'values'  => null,
                                'files'   => $logoFilePath,
                                'details' => null,
                            ]
                        );
                    }
                }

                if ($hostId > 0) {
                    $personalProfileKeys = [
                        'company_name',
                        'company_currency',
                        'phone_number',
                        'company_address',
                        'business_email',
                        'company_website',
                        'social_media_links_facebook',
                        'social_media_links_instagram',
                        'social_media_links_linkedin',
                        'social_media_links_twitter',
                    ];

                    foreach ($personalProfileKeys as $key) {
                        if (!array_key_exists($key, $data)) {
                            continue;
                        }
                        $value = $data[$key];
                        HostUserDetail::updateOrCreate(
                            [
                                'host_id' => $hostId,
                                'user_id' => $effectiveCompanyDetailsUserId,
                                'type'    => 'company_details',
                                'name'    => $key,
                            ],
                            [
                                'values'  => $value === '' ? null : $value,
                                'files'   => null,
                                'details' => null,
                            ]
                        );
                    }
                }

                // Stripe keys — personal context (super-admin / personal account).
                // The company-context branch handles the same for company users.
                // Sub-users without company.change permission are blocked from updating.
                if (array_key_exists('stripe_secret_key', $data) || array_key_exists('stripe_published_key', $data)) {
                    $stripeAuthHostId  = (int) ($authUser->host_id ?? 0);
                    $stripeAuthPrimary = $stripeAuthHostId > 0 ? User::primaryBillingUserForHost($stripeAuthHostId) : null;
                    $stripeAuthIsSub   = $stripeAuthHostId > 0 && (!$stripeAuthPrimary || (int) $stripeAuthPrimary->id !== (int) $authUser->id);
                    if (!$stripeAuthIsSub || $authUser->can('company.change')) {
                        if ($hostId > 0) {
                            HostUserStripe::updateOrCreate(
                                [
                                    'host_id'      => $hostId,
                                    'host_user_id' => $user->id,
                                ],
                                [
                                    'secret_key'  => $data['stripe_secret_key'] ?? null,
                                    'publish_key' => $data['stripe_published_key'] ?? null,
                                ]
                            );
                        }
                    }
                }
            }

            /**
             * ------------------------------------------
             *   Stripe fee config (all contexts)
             * ------------------------------------------
             */
            if (array_key_exists('stripe_fee_percentage', $data)) {
                UserStripeFeeSetting::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'stripe_fee_percentage' => $data['stripe_fee_percentage'],
                        'stripe_fixed_fee'      => $data['stripe_fixed_fee']
                    ]
                );
            }


            DB::commit();

            /**
             * ------------------------------------------
             * 5️⃣ Return Updated User
             * ------------------------------------------
             */
            $user->load([
                'roles',
                'bank',
                'HostUserStripe',
                'host',
                'companyDetails'
            ]);

            return $user;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('User update failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'data' => $data,
                'auth_user_id' => auth()->id(),
                'auth_user_host_id' => auth()->user()->host_id ?? null,
            ]);
            throw $e;
        }
    }

    public function delete($id, $action = 'deactivate')
    {
        $authUser = auth()->user();
        $hostId = $this->resolveTargetHostId($authUser);

        $query = User::where('id', $id);

        $isSuperAdmin = strtolower((string) ($authUser->account_type ?? '')) === 'super-admin'
            || $authUser->hasRole('super-admin');
        if (!$isSuperAdmin && $hostId > 0) {
            $query->where('host_id', $hostId);
        }

        $user = $query->first();

        if (!$user) {
            throw new ModelNotFoundException(
                'User not found or you do not have permission to perform this action.'
            );
        }

        if (!in_array($action, ['deactivate', 'delete'])) {
            throw new \InvalidArgumentException(
                'Invalid action. Allowed values: deactivate, delete.'
            );
        }

        if ($action === 'deactivate') {
            // ✅ Deactivate account
            $user->update([
                'is_active' => 0,
            ]);
        } else {
            // 🗑️ Cascade delete all related data before permanently deleting the user
            // Reconnect to avoid "MySQL server has gone away" on long transactions
            DB::reconnect();
            DB::beginTransaction();
            try {
                // 1. Delete activity logs
                ActivityLog::where('user_id', $id)->delete();

                // 2. Delete invoices and their child records
                $invoiceIds = \App\Models\Invoice::where('created_by', $id)->pluck('id');
                if ($invoiceIds->isNotEmpty()) {
                    InvoiceItem::whereIn('invoice_id', $invoiceIds)->delete();
                    Receipt::whereIn('invoice_id', $invoiceIds)->delete();
                    \App\Models\Invoice::whereIn('id', $invoiceIds)->delete();
                }

                // 3. Delete Stripe details
                HostUserStripe::where('host_user_id', $id)->delete();

                // 4. Delete host user detail records
                HostUserDetail::where('user_id', $id)->delete();

                // 5. Delete host user record
                HostUser::where('user_id', $id)->delete();

                // 6. Revoke all Spatie roles
                $user->roles()->detach();

                // 7. Permanently delete the user
                $user->forceDelete();

                DB::commit();
            } catch (Throwable $e) {
                DB::rollBack();
                throw $e;
            }
        }

        return true;
    }

    public function removeCompanyLogo()
    {
        try {
            $user = auth()->user();
            $hostId = $this->resolveTargetHostId($user);

            // Reload user from module model so update() uses the correct class
            $moduleUser = User::find($user->id);

            DB::beginTransaction();

            // Find the company logo record in host_user_details
            $logoRecord = HostUserDetail::where('host_id', $hostId)
                ->where('type', 'company_details')
                ->where('name', 'company_logo')
                ->first();

            if ($logoRecord && $logoRecord->files) {
                // Delete the physical file from storage
                if (Storage::disk('public')->exists($logoRecord->files)) {
                    Storage::disk('public')->delete($logoRecord->files);
                }

                // Set files to null
                $logoRecord->update(['files' => null]);
            }

            // For personal/super-admin context, the branding logo is stored
            // as profile_img on the users table. Clear it as well.
            $isPersonalContext = (string) ($user->active_context_type ?? '') === 'personal'
                || strtolower((string) ($user->account_type ?? '')) === 'super-admin'
                || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'personal');

            if ($isPersonalContext && $moduleUser && $moduleUser->profile_img) {
                // Delete the physical profile image file from storage
                if (Storage::disk('public')->exists($moduleUser->profile_img)) {
                    Storage::disk('public')->delete($moduleUser->profile_img);
                }

                $moduleUser->update(['profile_img' => null]);
            }

            DB::commit();

            return $moduleUser ? $moduleUser->fresh() : $user->fresh();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Remove company logo failed: ' . $e->getMessage());
            throw new \Exception('Failed to remove company logo. Please try again.');
        }
    }

    /**
     * Public wrapper used by UserController and similar callers that need
     * the active host_id scoped to the user's current context (personal or company).
     */
    public function resolveHostIdForUser(User $user): int
    {
        return $this->resolveTargetHostId($user);
    }

    private function resolveTargetHostId(User $user): int
    {
        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
        if (
            $isCompanyContext
            && !empty($user->active_company_id)
        ) {
            // Owner lookup (admin / personal user / super-admin — all use owner_user_id on their companies)
            $activeCompany = Company::query()
                ->where('id', (int) $user->active_company_id)
                ->where('owner_user_id', (int) $user->id)
                ->first();
            // Sub-user lookup: company belongs to the same host
            if (!$activeCompany && !empty($user->host_id)) {
                $activeCompany = Company::query()
                    ->where('id', (int) $user->active_company_id)
                    ->where('host_id', (int) $user->host_id)
                    ->first();
            }
            if ($activeCompany && !empty($activeCompany->host_id)) {
                return (int) $activeCompany->host_id;
            }
        }

        // Company account without active_company_id: try first active company
        if ($isCompanyContext && empty($user->active_company_id)) {
            // Owner lookup
            $firstCompany = Company::query()
                ->where('owner_user_id', (int) $user->id)
                ->where('is_active', true)
                ->orderByDesc('id')
                ->first();
            // Sub-user lookup: any company under the same host
            if (!$firstCompany && !empty($user->host_id)) {
                $firstCompany = Company::query()
                    ->where('host_id', (int) $user->host_id)
                    ->where('is_active', true)
                    ->orderByDesc('id')
                    ->first();
            }
            if ($firstCompany && !empty($firstCompany->host_id)) {
                return (int) $firstCompany->host_id;
            }
        }

        return (int) ($user->host_id ?? 0);
    }
}
