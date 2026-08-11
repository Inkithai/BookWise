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
        if (!Schema::hasTable('invoices')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'account_name')) {
                $table->string('account_name', 100)->nullable()->after('bank_payment');
            }
            if (!Schema::hasColumn('invoices', 'account_number')) {
                $table->string('account_number', 100)->nullable()->after('account_name');
            }
            if (!Schema::hasColumn('invoices', 'sort_code')) {
                $table->string('sort_code', 100)->nullable()->after('account_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('invoices')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('invoices', 'account_name')) {
                $drop[] = 'account_name';
            }
            if (Schema::hasColumn('invoices', 'account_number')) {
                $drop[] = 'account_number';
            }
            if (Schema::hasColumn('invoices', 'sort_code')) {
                $drop[] = 'sort_code';
            }

            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
