<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_statements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id')->index();
            $table->unsignedBigInteger('team_id')->nullable()->index();
            $table->unsignedBigInteger('client_id')->nullable()->index();
            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->string('title');
            $table->string('frequency', 32)->default('monthly');
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('currency', 3)->default('GBP');
            $table->string('pdf_type', 32)->default('classic');
            $table->date('next_run_at');
            $table->date('last_run_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('client_id')
                ->references('id')
                ->on('invoices_clients')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_statements');
    }
};
