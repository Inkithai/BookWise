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
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('total_amount', 18, 2)->nullable()->change();
            $table->decimal('total_vat', 12, 2)->nullable()->change();
            $table->decimal('total_discount', 12, 2)->nullable()->change();
            $table->decimal('final_amount', 18, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('total_amount', 10, 2)->nullable()->change();
            $table->decimal('total_vat', 10, 2)->nullable()->change();
            $table->decimal('total_discount', 10, 2)->nullable()->change();
            $table->decimal('final_amount', 10, 2)->nullable()->change();
        });
    }
};
