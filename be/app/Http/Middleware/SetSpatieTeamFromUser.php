<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets Spatie Permission's team context from the authenticated user so that
 * role/permission checks (e.g. $user->can('invoice.view')) see the user's roles.
 * Uses user.team_id, or the first role-assignment pivot team_id if user.team_id is null.
 */
class SetSpatieTeamFromUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null) {
            $teamId = null;

            // Company context: permissions must be resolved by active company's team.
            $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
                || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
            if (
                $isCompanyContext
                && !empty($user->active_company_id)
            ) {
                // Owner lookup (admin)
                $company = Company::query()
                    ->where('id', (int) $user->active_company_id)
                    ->where('owner_user_id', $user->id)
                    ->first();
                // Sub-user lookup: company belongs to the same host
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
                }
            }

            if ($teamId === null) {
                $teamId = $user->team_id ?? null;
            }

            // When user has no team_id, get team from first role assignment (per user per team)
            // so Spatie's team-scoped role/permission checks see the correct context.
            // IMPORTANT: check both model types because the auth guard resolves App\Models\User
            // but role inserts from module code use Modules\User\Models\User.
            if ($teamId === null) {
                $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
                $modelTypes = array_values(array_unique([
                    get_class($user),
                    \Modules\User\Models\User::class,
                    \App\Models\User::class,
                ]));
                $row = DB::table($pivotTable)
                    ->where('model_id', $user->id)
                    ->whereIn('model_type', $modelTypes)
                    ->orderByRaw('team_id IS NOT NULL DESC') // prefer non-null team, then null (global)
                    ->value('team_id');
                if ($row !== null) {
                    $teamId = (int) $row;
                }
            }

            app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($teamId);
        }

        return $next($request);
    }
}
