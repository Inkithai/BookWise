<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix DEF_113: Add host_id to invoices for proper multi-tenant analytics.
     *
     * Important: Some environments previously had this migration that *did not*
     * actually add the column and therefore failed during backfill.
     */
    public function up(): void
    {
        if (!Schema::hasTable('invoices')) {
            return;
        }

        // Ensure column exists before any backfill queries reference it.
        if (!Schema::hasColumn('invoices', 'host_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->unsignedBigInteger('host_id')->nullable()->after('company_id');
                $table->index('host_id');
            });
        }

        // Backfill host_id from users table (only where NULL).
        // Driver-aware: MySQL uses UPDATE..JOIN, PostgreSQL uses UPDATE..FROM.
        DB::transaction(function () {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement("
                    UPDATE invoices
                    SET host_id = u.host_id
                    FROM users u
                    WHERE invoices.created_by = u.id
                      AND invoices.host_id IS NULL
                      AND invoices.created_by IS NOT NULL
                      AND u.host_id IS NOT NULL
                ");
            } else {
                DB::statement("
                    UPDATE invoices i
                    INNER JOIN users u ON i.created_by = u.id
                    SET i.host_id = u.host_id
                    WHERE i.host_id IS NULL
                      AND i.created_by IS NOT NULL
                      AND u.host_id IS NOT NULL
                ");
            }
        });

        // Composite index helps tenancy queries and soft deletes.
        try {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('CREATE INDEX IF NOT EXISTS idx_invoices_host_deleted ON invoices (host_id, deleted_at)');
            } else {
                DB::statement('ALTER TABLE invoices ADD INDEX idx_invoices_host_deleted (host_id, deleted_at)');
            }
        } catch (\Throwable $e) {
            // Ignore if index already exists.
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('invoices') || !Schema::hasColumn('invoices', 'host_id')) {
            return;
        }

        try {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('DROP INDEX IF EXISTS idx_invoices_host_deleted');
            } else {
                DB::statement('ALTER TABLE invoices DROP INDEX idx_invoices_host_deleted');
            }
        } catch (\Throwable $e) {
            // Ignore if index does not exist.
        }

        Schema::table('invoices', function (Blueprint $table) {
            try {
                $table->dropIndex(['host_id']);
            } catch (\Throwable $e) {
                // Ignore if index does not exist.
            }
            $table->dropColumn('host_id');
        });
    }
};

