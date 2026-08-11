<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use App\Models\Host;
use App\Models\Team;
use App\Support\TenantRole;

class SyncOAuth2User
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $request->bearerToken();

        if (!$user || !$token) {
            return $next($request);
        }

        $mainBackendUrl = rtrim((string) env('MAIN_BACKEND_URL', ''), '/');
        $appUrl = rtrim((string) env('APP_URL', ''), '/');

        // ── Self-call guard ──────────────────────────────────────────────
        // If MAIN_BACKEND_URL is empty, not configured, or points to the
        // same origin as this application, skip the HTTP call entirely to
        // avoid a circular request loop that blocks for 8-16 seconds.
        if (
            empty($mainBackendUrl) ||
            strcasecmp($mainBackendUrl, $appUrl) === 0 ||
            strcasecmp(
                parse_url($mainBackendUrl, PHP_URL_HOST) . ':' . (parse_url($mainBackendUrl, PHP_URL_PORT) ?: '80'),
                parse_url($appUrl, PHP_URL_HOST) . ':' . (parse_url($appUrl, PHP_URL_PORT) ?: '80')
            ) === 0
        ) {
            Log::warning('SyncOAuth2User: MAIN_BACKEND_URL points to self or is empty — skipping external sync', [
                'MAIN_BACKEND_URL' => $mainBackendUrl,
                'APP_URL'          => $appUrl,
            ]);
            return $next($request);
        }

        $candidatePaths = array_values(array_filter([
            env('MAIN_BACKEND_ME_PATH'),
            '/api/v1/admin/auth/me',
            '/api/v1/auth/me',
        ]));

        $payload = null;
        foreach ($candidatePaths as $path) {
            $url = $mainBackendUrl.$path;

            try {
                $response = Http::timeout(8)
                    ->withHeaders(['X-Sso-Sync-Internal' => '1'])
                    ->withToken($token)
                    ->get($url);
                if ($response->successful()) {
                    $payload = $response->json('data') ?? $response->json();
                    if (is_array($payload) && !empty($payload)) {
                        break;
                    }
                }
            } catch (\Exception $e) {
                Log::warning('SyncOAuth2User: Path failed', ['url' => $url, 'exception' => $e->getMessage()]);
            }
        }

        if (!is_array($payload) || empty($payload)) {
            Log::warning('SyncOAuth2User: No payload received from main backend');
            return $next($request);
        }

        // --- 1. PRE-RESOLVE HOST AND TEAM (Mapping SSO IDs to Local IDs) ---
        $ssoHostId = $payload['host_id']
            ?? data_get($payload, 'team.host_id')
            ?? null;

        $ssoTeamId = $payload['team_id']
            ?? data_get($payload, 'team.id')
            ?? null;

        $localHostId = null;
        $localTeamId = null;

        if (!$ssoHostId && $ssoTeamId) {
            $existingTeam = Team::where('sso_id', (string) $ssoTeamId)->first();
            if ($existingTeam) {
                $localTeamId = $existingTeam->id;
                $localHostId = $existingTeam->host_id;
                $ssoHostId = Host::where('id', $existingTeam->host_id)->value('sso_id');
            }
        }

        if (!$ssoHostId && !data_get($payload, 'team.id') && empty($payload['team']) && isset($payload['id'])) {
            $ssoHostId = 'personal-' . $payload['id'];
        }

        if ($ssoHostId) {
            $hostDisplayName = data_get($payload, 'team.name')
                ?? (($payload['user_name'] ?? $payload['username'] ?? 'SSO') . ' Host');
            $host = Host::where('sso_id', (string) $ssoHostId)->first();
            if ($host) {
                $localHostId = $host->id;
            } else {
                $host = Host::create([
                    'sso_id' => (string) $ssoHostId,
                    'name' => $hostDisplayName,
                ]);
                $localHostId = $host->id;
            }
        }

        if (!$ssoTeamId && $localHostId) {
            $ssoTeamId = 'default-' . $localHostId;
        }

        if ($ssoTeamId) {
            $teamName = data_get($payload, 'team.name') ?? 'Team ' . $ssoTeamId;
            $team = Team::firstOrCreate(
                ['sso_id' => (string) $ssoTeamId],
                [
                    'host_id' => $localHostId ?? 1,
                    'name' => $teamName,
                ]
            );
            $localTeamId = $team->id;
            if (!$localHostId) {
                $localHostId = $team->host_id;
            }
        }

        // --- 2. IDENTITY RESOLUTION ---
        $payloadEmail = strtolower((string) ($payload['email'] ?? ''));
        $localEmail = strtolower((string) ($user->email ?? ''));
        $identityMismatch = !empty($payloadEmail) && !empty($localEmail) && $payloadEmail !== $localEmail;

        if ($identityMismatch) {
            $targetUser = \Modules\User\Models\User::where('email', $payloadEmail)->first();
            if (!$targetUser) {
                $firstName = $payload['first_name'] ?? 'SSO';
                $lastName = $payload['last_name'] ?? 'User';
                $targetUser = \Modules\User\Models\User::create([
                    'email' => $payloadEmail,
                    'name' => trim(($payload['first_name'] ?? 'SSO') . ' ' . ($payload['last_name'] ?? 'User')),
                    'user_name' => $payload['user_name'] ?? $payload['username'] ?? $payloadEmail,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'name' => "{$firstName} {$lastName}",
                    'phone_number' => $payload['phone_number'] ?? null,
                    'account_type' => $payload['account_type'] ?? 'admin',
                    'password' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
                    'host_id' => $localHostId,
                    'team_id' => $localTeamId,
                    'sso_id' => $payload['id'] ?? null,
                    'is_active' => 1,
                    'is_otp_verified' => 1,
                ]);
            }
            Auth::setUser($targetUser);
            $user = $targetUser;
        }

        $needsTeamHostRefresh = (
            (!empty($localHostId) && (int) ($user->host_id ?? 0) !== (int) $localHostId) ||
            (!empty($localTeamId) && (int) ($user->team_id ?? 0) !== (int) $localTeamId) ||
            (empty($user->host_id) && !empty($localHostId)) ||
            (empty($user->team_id) && !empty($localTeamId))
        );

        $isSuperAdmin = strtolower((string) ($user->account_type ?? '')) === 'super-admin';
        if ($needsTeamHostRefresh && !$isSuperAdmin) {
            $user->host_id = $localHostId ?? $user->host_id;
            $user->team_id = $localTeamId ?? $user->team_id;
            $user->sso_id = $payload['id'] ?? $user->sso_id;
            $user->save();
        }

        // --- 3. SYNCHRONIZATION ---
        $shouldSync = $identityMismatch
            || Str::endsWith((string) $user->email, '@sso.local')
            || ($user->roles()->count() === 0)
            || $needsTeamHostRefresh;

        if ($shouldSync) {
            $updates = [
                'email' => $payloadEmail,
                'user_name' => $payload['user_name'] ?? $payload['username'] ?? $payloadEmail,
                'first_name' => $payload['first_name'] ?? $user->first_name ?? '',
                'last_name' => $payload['last_name'] ?? $user->last_name ?? '',
                'phone_number' => $payload['phone_number'] ?? $user->phone_number ?? null,
                'account_type' => $payload['account_type'] ?? $user->account_type ?? 'admin',
                'host_id' => $localHostId,
                'team_id' => $localTeamId,
                'sso_id' => $payload['id'] ?? $user->sso_id,
            ];

            $user->fill($updates);
            $user->save();

            // Role and Permission Sync
            $isPayloadSuper = in_array(strtolower((string) ($payload['account_type'] ?? '')), ['super-admin', 'superadmin'], true);
            $roleNames = $this->normalizeInvoiceRoles(
                $this->extractRoleNames($payload['roles'] ?? null),
                $isPayloadSuper
            );

            $syncedRoles = [];
            foreach ($roleNames as $roleName) {
                $isSuper = in_array(strtolower($roleName), ['super-admin', 'superadmin'], true);
                $actualName = $isSuper ? 'super-admin' : $roleName;

                $role = TenantRole::firstOrCreateScoped(
                    $actualName,
                    'api',
                    $localHostId ? (int) $localHostId : null,
                    $localTeamId !== null ? (int) $localTeamId : null
                );
                if ($role->wasRecentlyCreated || $role->permissions()->count() === 0) {
                    $role->syncPermissions(Permission::where('guard_name', 'api')->pluck('id')->toArray());
                }
                $syncedRoles[] = $role;
            }

            if (!empty($syncedRoles)) {
                $roles = collect($syncedRoles);
                $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
                $modelType = get_class($user);

                DB::table($pivotTable)->where('model_id', $user->id)->where('model_type', $modelType)->delete();

                $pivotData = $roles->map(fn ($role) => [
                    'role_id' => (int) $role->id,
                    'model_id' => (int) $user->id,
                    'model_type' => $modelType,
                    'team_id' => (int) ($role->team_id ?? $localTeamId),
                ])->toArray();

                DB::table($pivotTable)->insert($pivotData);

                $user->unsetRelation('roles');
                $user->unsetRelation('permissions');
                app(PermissionRegistrar::class)->forgetCachedPermissions();
            }
        }
        
        return $next($request);
    }

    /**
     * Supports roles coming from main backend as:
     * - ["admin", "team-member"]
     * - [{"name":"admin"}, {"name":"team-member"}]
     */
    private function extractRoleNames(mixed $roles): array
    {
        if (!is_array($roles)) {
            return [];
        }

        $names = [];
        foreach ($roles as $role) {
            if (is_string($role) && $role !== '') {
                $names[] = $role;
                continue;
            }

            if (is_array($role) && !empty($role['name'])) {
                $names[] = (string) $role['name'];
                continue;
            }
        }

        return array_values(array_unique(array_filter($names)));
    }

    /**
     * Invoice app: assign one Spatie role per user to avoid stacked admin + invoice roles from platform.
     */
    private function normalizeInvoiceRoles(array $names, bool $isPayloadSuper): array
    {
        if ($isPayloadSuper) {
            return ['super-admin'];
        }

        $lower = array_map('strtolower', $names);
        if (in_array('super-admin', $lower, true) || in_array('superadmin', $lower, true)) {
            return ['super-admin'];
        }
        if (in_array('admin', $lower, true)) {
            return ['admin'];
        }

        if (!empty($names)) {
            return [reset($names)];
        }

        return ['admin'];
    }

    private function isSameOrigin(string $leftUrl, string $rightUrl): bool
    {
        if ($leftUrl === '' || $rightUrl === '') {
            return false;
        }

        $left = parse_url($leftUrl);
        $right = parse_url($rightUrl);

        if (! $left || ! $right) {
            return false;
        }

        $leftScheme = strtolower((string) ($left['scheme'] ?? 'http'));
        $rightScheme = strtolower((string) ($right['scheme'] ?? 'http'));
        $leftHost = strtolower((string) ($left['host'] ?? ''));
        $rightHost = strtolower((string) ($right['host'] ?? ''));
        $leftPort = (int) ($left['port'] ?? ($leftScheme === 'https' ? 443 : 80));
        $rightPort = (int) ($right['port'] ?? ($rightScheme === 'https' ? 443 : 80));

        return $leftScheme === $rightScheme
            && $leftHost !== ''
            && $leftHost === $rightHost
            && $leftPort === $rightPort;
    }
}
