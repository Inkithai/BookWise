<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'is_otp_verified')) {
            Schema::table('users', function (Blueprint $table) {
                // Use a boolean default (not int 1) so PostgreSQL accepts it.
                $table->boolean('is_otp_verified')->default(true)->after('is_active');
            });
        }

        // Boolean true binds correctly on both MySQL (tinyint) and PostgreSQL (boolean).
        DB::table('users')->update(['is_otp_verified' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_otp_verified');
        });
    }
};
