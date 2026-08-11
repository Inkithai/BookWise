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
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id');
            $table->string('item_name', 100)->nullable();
            $table->string('type', 100)->nullable();
            $table->decimal('item_price', 10, 2)->nullable();
            $table->decimal('item_quantity', 10, 2)->nullable();
            $table->decimal('item_discount', 10, 2)->nullable();
            $table->decimal('item_discount_value', 10, 2)->nullable();
            $table->decimal('item_vat', 10, 2)->nullable();
            $table->decimal('item_vat_value', 10, 2)->nullable();
            $table->decimal('item_final_price', 10, 2)->nullable();
            $table->integer('created_by')->nullable();
            $table->integer('updated_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable();
            $table->timestamp('deleted_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
