<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('invoices_companies', 'company_id')) {
            Schema::table('invoices_companies', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->after('host_id');
                $table->index('company_id');
            });
        }

        // Backfill: set company_id from companies table using host_id match
        // (skip if the companies table doesn't exist in this environment)
        if (Schema::hasTable('companies')) {
            DB::statement('UPDATE invoices_companies ic SET company_id = (SELECT c.id FROM companies c WHERE c.host_id = ic.host_id ORDER BY c.id DESC LIMIT 1) WHERE ic.company_id IS NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices_companies', function (Blueprint $table) {
            $table->dropIndex(['company_id']);
            $table->dropColumn('company_id');
        });
    }
};
