<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * FIX DEF_115: Add explicit ownership role field to users table
     * 
     * Root Cause: Sub-user calculation was inferring ownership via account_type,
     * which is a role classification, not an ownership marker.
     * 
     * Solution: Add host_role enum to make ownership explicit, extensible, and deterministic.
     * 
     * Why host_role (not is_owner boolean):
     * - Boolean creates trap: what if multiple owners, ownership transfer, role hierarchy?
     * - Enum is extensible: owner, admin, member (future: manager, viewer, etc.)
     * - Ownership is a role dimension of the host, not a binary flag
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Use string enum instead of boolean for extensibility
            $table->string('host_role', 20)->default('member')->after('host_id')
                  ->comment('owner | admin | member');
            
            // Index for performance on sub-user queries
            $table->index(['host_id', 'host_role'], 'idx_host_role');
        });

        // Backfill host_role for existing users
        // Use the same logic as User::primaryBillingUserForHost()
        // Owner = first user with account_type priority: company > admin > others
        $hosts = DB::table('users')
            ->whereNotNull('host_id')
            ->distinct()
            ->pluck('host_id');

        foreach ($hosts as $hostId) {
            // Find the primary user for this host
            $primaryUser = DB::table('users')
                ->where('host_id', $hostId)
                ->whereNull('deleted_at')
                ->orderByRaw("CASE LOWER(COALESCE(account_type,'')) 
                    WHEN 'company' THEN 0 
                    WHEN 'admin' THEN 1 
                    ELSE 2 END")
                ->orderBy('id', 'asc')
                ->first();

            if ($primaryUser) {
                // Mark this user as the owner
                DB::table('users')
                    ->where('id', $primaryUser->id)
                    ->update(['host_role' => 'owner']);
            }
        }

        // Handle super-admin users (host_id = null)
        // They own themselves, so mark as owner
        DB::table('users')
            ->whereNull('host_id')
            ->where('account_type', 'super-admin')
            ->update(['host_role' => 'owner']);
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_host_role');
            $table->dropColumn('host_role');
        });
    }
};
