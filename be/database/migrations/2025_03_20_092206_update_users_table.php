<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // Add columns only if they don't exist (safe approach)
            if (!Schema::hasColumn('users', 'user_name')) {
                $table->string('user_name', 255)->after('email');
            }

            if (!Schema::hasColumn('users', 'permissions')) {
                $table->text('permissions')->nullable();
            }

            if (!Schema::hasColumn('users', 'last_login')) {
                $table->timestamp('last_login')->nullable();
            }

            if (!Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name', 255)->nullable();
            }

            if (!Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name', 255)->nullable();
            }

            if (!Schema::hasColumn('users', 'is_temp_password')) {
                $table->smallInteger('is_temp_password')->default(0);
            }

            if (!Schema::hasColumn('users', 'phone_number')) {
                $table->string('phone_number', 100)->nullable();
            }

            if (!Schema::hasColumn('users', 'real_state_designation')) {
                $table->string('real_state_designation', 100)->nullable();
            }

            if (!Schema::hasColumn('users', 'company_designation')) {
                $table->string('company_designation', 100)->nullable();
            }

            if (!Schema::hasColumn('users', 'is_active')) {
                $table->smallInteger('is_active')->default(1);
            }

            if (!Schema::hasColumn('users', 'deleted_at')) {
                $table->timestamp('deleted_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {

            $columns = [
                'user_name',
                'permissions',
                'last_login',
                'first_name',
                'last_name',
                'is_temp_password',
                'phone_number',
                'real_state_designation',
                'company_designation',
                'is_active',
                'deleted_at'
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};