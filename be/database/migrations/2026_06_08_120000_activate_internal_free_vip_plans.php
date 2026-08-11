<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Free and VIP plans must stay active for trial downgrade, VIP assignment, and sync —
 * but remain hidden from the public upgrade page via is_public = false.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('plans')
            ->whereIn('slug', ['free', 'vip'])
            ->update([
                'is_active' => true,
                'is_public' => false,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('plans')
            ->whereIn('slug', ['free', 'vip'])
            ->update([
                'is_active' => false,
                'is_public' => false,
                'updated_at' => now(),
            ]);
    }
};
