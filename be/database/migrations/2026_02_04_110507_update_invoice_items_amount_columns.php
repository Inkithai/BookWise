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
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('item_price', 18, 2)->nullable()->change();
            $table->decimal('item_quantity', 12, 2)->nullable()->change();
            $table->decimal('item_discount', 12, 2)->nullable()->change();
            $table->decimal('item_discount_value', 12, 2)->nullable()->change();
            $table->decimal('item_vat', 12, 2)->nullable()->change();
            $table->decimal('item_vat_value', 12, 2)->nullable()->change();
            $table->decimal('item_final_price', 18, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('item_price', 10, 2)->nullable()->change();
            $table->decimal('item_quantity', 10, 2)->nullable()->change();
            $table->decimal('item_discount', 10, 2)->nullable()->change();
            $table->decimal('item_discount_value', 10, 2)->nullable()->change();
            $table->decimal('item_vat', 10, 2)->nullable()->change();
            $table->decimal('item_vat_value', 10, 2)->nullable()->change();
            $table->decimal('item_final_price', 10, 2)->nullable()->change();
        });
    }
};
