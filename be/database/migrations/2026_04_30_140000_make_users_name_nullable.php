<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'name')) {
            // Add the column if it was somehow dropped or never existed
            Schema::table('users', function (Blueprint $table) {
                $table->string('name')->nullable()->after('id');
            });

            // Backfill from first_name + last_name or email
            DB::statement("UPDATE users SET name = CONCAT(TRIM(COALESCE(first_name, '')), ' ', TRIM(COALESCE(last_name, ''))) WHERE name IS NULL OR TRIM(name) = ''");
            DB::statement("UPDATE users SET name = email WHERE name IS NULL OR TRIM(name) = ''");
            return;
        }

        // Backfill any NULL name rows so the column change succeeds
        DB::statement("UPDATE users SET name = CONCAT(TRIM(COALESCE(first_name, '')), ' ', TRIM(COALESCE(last_name, ''))) WHERE name IS NULL OR TRIM(name) = ''");
        DB::statement("UPDATE users SET name = email WHERE name IS NULL OR TRIM(name) = ''");

        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'name')) {
            return;
        }

        // Backfill any NULL name rows before making NOT NULL
        DB::statement("UPDATE users SET name = CONCAT(TRIM(COALESCE(first_name, '')), ' ', TRIM(COALESCE(last_name, ''))) WHERE name IS NULL OR TRIM(name) = ''");
        DB::statement("UPDATE users SET name = email WHERE name IS NULL OR TRIM(name) = ''");

        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
        });
    }
};
