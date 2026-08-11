<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The step-1 migration was too broad — it moved ALL host_user_details WHERE
 * user_id = super_admin_id to host_id=5, including rows that belonged to
 * multi-company hosts created by super-admin (e.g. nextTravel).
 *
 * This migration removes those pollutant rows from host_id=5, keeping only
 * records that are uniquely the super-admin's personal/workspace profile.
 *
 * Logic: keep the OLDEST row for each (host_id, user_id, type, name) combination
 * (i.e. the original profile row, id=1) and delete any duplicate rows for the
 * same key that were created later (id=22+).
 */
return new class extends Migration
{
    public function up(): void
    {
        $sa = DB::table('users')->where('account_type', 'super-admin')->orderBy('id')->first();
        if (!$sa) {
            return;
        }

        $hostId = (int) $sa->host_id;
        if ($hostId <= 0) {
            return;
        }

        // For each (host_id, user_id, type, name) group, keep only the OLDEST row (min id).
        // Any extra duplicates are leftover company-specific data from before the migration.
        $groups = DB::table('host_user_details')
            ->where('host_id', $hostId)
            ->where('user_id', $sa->id)
            ->select('type', 'name', DB::raw('MIN(id) as keep_id'))
            ->groupBy('type', 'name')
            ->get();

        $keepIds = $groups->pluck('keep_id')->toArray();

        if (!empty($keepIds)) {
            DB::table('host_user_details')
                ->where('host_id', $hostId)
                ->where('user_id', $sa->id)
                ->whereNotIn('id', $keepIds)
                ->delete();
        }
    }

    public function down(): void
    {
        // Intentionally empty.
    }
};
