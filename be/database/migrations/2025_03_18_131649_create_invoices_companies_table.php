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
        Schema::create('invoices_companies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id');
            $table->string('code', 100)->nullable();
            $table->string('name', 100)->nullable();
            $table->string('address', 100)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('account_name', 100)->nullable();
            $table->string('account_number', 100)->nullable();
            $table->string('sort_code', 100)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices_companies');
    }
};
