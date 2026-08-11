<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Super-admin's team_id on the user row must stay NULL so that
 * SetSpatieTeamFromUser falls through to the pivot-row fallback and
 * correctly sets the global (team_id=1 seeder) permission context.
 *
 * Data operations (role listing, sub-user creation) use
 *   Team::where('host_id', $user->host_id)->value('id')
 * which correctly returns the dedicated Super Admin Team regardless of
 * whether user.team_id is null.
 */
return new class extends Migration
{
    public function up(): void
    {
        $superAdmin = DB::table('users')
            ->where('account_type', 'super-admin')
            ->orderBy('id')
            ->first();

        if (!$superAdmin) {
            return;
        }

        // Reset team_id to null — Spatie middleware will fall back to the
        // role-assignment pivot row (team_id=1 from seeder) for permission checks.
        DB::table('users')
            ->where('id', $superAdmin->id)
            ->update([
                'team_id'    => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Intentionally empty.
    }
};
