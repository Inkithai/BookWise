<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-tenant accounting preferences (base currency, fiscal calendar, lock date).
     */
    public function up(): void
    {
        Schema::create('accounting_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id')->index();
            $table->string('base_currency', 3)->default('GBP');
            $table->tinyInteger('fiscal_year_start_month')->default(1);
            $table->string('date_format', 32)->default('Y-m-d');
            $table->tinyInteger('decimal_precision')->default(2);
            $table->date('lock_date')->nullable()->comment('Transactions on or before this date are closed');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('host_id')->references('id')->on('hosts')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_settings');
    }
};
