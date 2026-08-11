<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id')->index();
            $table->unsignedBigInteger('bill_id');
            $table->text('description');
            $table->decimal('quantity', 16, 2)->default(1);
            $table->decimal('unit_price', 16, 2)->default(0);
            $table->decimal('tax_rate', 8, 4)->default(0);
            $table->decimal('amount', 16, 2)->default(0);
            $table->unsignedBigInteger('account_id')->nullable()->comment('expense account');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('host_id')->references('id')->on('hosts')->onDelete('cascade');
            $table->foreign('bill_id')->references('id')->on('bills')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_items');
    }
};
