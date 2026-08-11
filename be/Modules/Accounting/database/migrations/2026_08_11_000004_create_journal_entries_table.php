<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Journal entries: the atomic, double-entry unit of the general ledger.
     * Each entry must have balanced debit/credit lines once posted.
     */
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id')->index();
            $table->string('entry_number');
            $table->date('entry_date');
            $table->unsignedBigInteger('fiscal_year_id')->nullable();
            $table->string('reference_type')->nullable()->comment('invoice|bill|expense|manual|bank|adjustment');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('description')->nullable();
            $table->string('status', 16)->default('draft')->comment('draft|posted|reversed');
            $table->decimal('total_amount', 16, 2)->default(0);
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('reversed_entry_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('host_id')->references('id')->on('hosts')->onDelete('cascade');
            $table->foreign('fiscal_year_id')->references('id')->on('fiscal_years')->onDelete('set null');
            $table->foreign('reversed_entry_id')->references('id')->on('journal_entries')->onDelete('set null');
            $table->index(['host_id', 'entry_date']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
