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
        Schema::table('companies', function (Blueprint $table) {
            if (!Schema::hasColumn('companies', 'account_name')) {
                $table->string('account_name', 100)->nullable()->after('company_address');
            }
            if (!Schema::hasColumn('companies', 'account_number')) {
                $table->string('account_number', 100)->nullable()->after('account_name');
            }
            if (!Schema::hasColumn('companies', 'sort_code')) {
                $table->string('sort_code', 100)->nullable()->after('account_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('companies', 'account_name')) {
                $drop[] = 'account_name';
            }
            if (Schema::hasColumn('companies', 'account_number')) {
                $drop[] = 'account_number';
            }
            if (Schema::hasColumn('companies', 'sort_code')) {
                $drop[] = 'sort_code';
            }

            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
