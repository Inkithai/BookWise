<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fiscal / financial years per tenant. Exactly one may be current.
     */
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id')->index();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 16)->default('open')->comment('open|closed');
            $table->boolean('is_current')->default(false);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('host_id')->references('id')->on('hosts')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_years');
    }
};
