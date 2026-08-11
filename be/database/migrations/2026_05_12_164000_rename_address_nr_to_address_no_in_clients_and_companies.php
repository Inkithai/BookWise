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
        if (Schema::hasColumn('invoices_clients', 'address_nr')) {
            Schema::table('invoices_clients', function (Blueprint $table) {
                $table->renameColumn('address_nr', 'address_no');
            });
        }

        if (Schema::hasColumn('invoices_companies', 'address_nr')) {
            Schema::table('invoices_companies', function (Blueprint $table) {
                $table->renameColumn('address_nr', 'address_no');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('invoices_clients', 'address_no')) {
            Schema::table('invoices_clients', function (Blueprint $table) {
                $table->renameColumn('address_no', 'address_nr');
            });
        }

        if (Schema::hasColumn('invoices_companies', 'address_no')) {
            Schema::table('invoices_companies', function (Blueprint $table) {
                $table->renameColumn('address_no', 'address_nr');
            });
        }
    }
};
