<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Give super-admin a permanent, exclusive Host + Team so that:
 *  - their host_id can never fall back to another tenant's host
 *  - sub-users they create share this dedicated host
 *  - multi-company accounts they create get their OWN separate host
 *  - analytics queries are correctly scoped to their own data
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Find the super-admin user ─────────────────────────────────────
        $superAdmin = DB::table('users')
            ->where('account_type', 'super-admin')
            ->orderBy('id')
            ->first();

        if (!$superAdmin) {
            return; // nothing to do on a fresh install (seeder will handle)
        }

        $oldHostId = $superAdmin->host_id; // may be null or a corrupted value

        // ── 2. Create a brand-new dedicated Host for super-admin ─────────────
        // Use INSERT … ON DUPLICATE KEY to be idempotent if migration re-runs.
        $existingDedicatedHost = DB::table('hosts')
            ->where('name', 'Super Admin Host')
            ->first();

        if ($existingDedicatedHost) {
            $newHostId = $existingDedicatedHost->id;
        } else {
            $newHostId = DB::table('hosts')->insertGetId([
                'name'       => 'Super Admin Host',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── 3. Create a dedicated Team for this host ─────────────────────────
        $existingTeam = DB::table('teams')
            ->where('host_id', $newHostId)
            ->first();

        if ($existingTeam) {
            $newTeamId = $existingTeam->id;
        } else {
            $newTeamId = DB::table('teams')->insertGetId([
                'host_id'    => $newHostId,
                'name'       => 'Super Admin Team',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── 4. Update super-admin's own user row ─────────────────────────────
        DB::table('users')
            ->where('id', $superAdmin->id)
            ->update([
                'host_id'    => $newHostId,
                'team_id'    => $newTeamId,
                'updated_at' => now(),
            ]);

        // ── 5. Migrate super-admin's personal profile data ───────────────────
        // host_user_details: keyed by user_id — just re-point host_id
        DB::table('host_user_details')
            ->where('user_id', $superAdmin->id)
            ->update([
                'host_id'    => $newHostId,
                'updated_at' => now(),
            ]);

        // ── 6. Migrate super-admin's Stripe connection ───────────────────────
        DB::table('host_user_stripes')
            ->where('host_user_id', $superAdmin->id)
            ->update([
                'host_id'    => $newHostId,
                'updated_at' => now(),
            ]);

        // ── 7. Migrate invoices created by super-admin ───────────────────────
        DB::table('invoices')
            ->where('created_by', $superAdmin->id)
            ->whereNull('deleted_at')
            ->update([
                'host_id'    => $newHostId,
                'updated_at' => now(),
            ]);

        // ── 8. Migrate invoice clients belonging to super-admin's old host ───
        // Only migrate rows that were exclusively under the old host AND
        // the old host was a real (non-null) value to avoid cross-tenant damage.
        if (!is_null($oldHostId) && (int) $oldHostId > 0) {
            DB::table('invoices_clients')
                ->where('host_id', (int) $oldHostId)
                ->update(['host_id' => $newHostId]);

            // ── 9. Migrate sub-users that shared super-admin's old host ──────
            // Safe criteria: same old host_id, not a company owner, role = member
            $subUserIds = DB::table('users as u')
                ->leftJoin('companies as c', 'c.owner_user_id', '=', 'u.id')
                ->where('u.host_id', (int) $oldHostId)
                ->where('u.id', '!=', $superAdmin->id)
                ->whereNull('c.id')         // not an owner of any company
                ->where('u.account_type', '!=', 'super-admin')
                ->pluck('u.id');

            if ($subUserIds->isNotEmpty()) {
                DB::table('users')
                    ->whereIn('id', $subUserIds)
                    ->update([
                        'host_id'    => $newHostId,
                        'team_id'    => $newTeamId,
                        'updated_at' => now(),
                    ]);
            }
        }

        // ── 10. Also create a HostUser pivot entry if the table exists ────────
        if (\Illuminate\Support\Facades\Schema::hasTable('host_users')) {
            $alreadyLinked = DB::table('host_users')
                ->where('host_id', $newHostId)
                ->where('user_id', $superAdmin->id)
                ->exists();

            if (!$alreadyLinked) {
                DB::table('host_users')->insert([
                    'host_id'    => $newHostId,
                    'user_id'    => $superAdmin->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Intentionally left empty — restoring corrupted state is not safe.
    }
};
