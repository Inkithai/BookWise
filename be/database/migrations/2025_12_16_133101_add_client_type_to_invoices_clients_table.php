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
        Schema::table('invoices_clients', function (Blueprint $table) {
             $table->string('client_type', 100);
             $table->string('company_registration_number', 100)->nullable();
             $table->string('vat_number', 100)->nullable();
             $table->string('utr', 100)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices_clients', function (Blueprint $table) {
            $table->dropColumn('client_type');
        });
    }
};
