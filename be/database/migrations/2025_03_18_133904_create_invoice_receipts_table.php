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
        Schema::create('invoice_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->nullable();
            $table->integer('invoice_id')->nullable();
            $table->string('status', 100)->nullable();
            $table->decimal('total_amount', 10, 2)->nullable();
            $table->decimal('amount_paid', 10, 2)->nullable();
            $table->decimal('total_amount_paid', 10, 2)->nullable();
            $table->decimal('total_amount_due', 10, 2)->nullable();
            $table->date('date')->nullable();
            $table->string('payment_method', 100)->nullable();
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
        Schema::dropIfExists('invoice_receipts');
    }
};
