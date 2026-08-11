<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chart of Accounts. Self-referencing hierarchy (parent_id).
     * `current_balance` is the live running balance maintained by the ledger.
     */
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('host_id')->index();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('code');
            $table->string('name');
            $table->string('type', 16)->comment('asset|liability|equity|income|expense');
            $table->string('sub_type')->nullable();
            $table->string('normal_balance', 8)->default('debit')->comment('debit|credit');
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false)->comment('reserved system account (AR/AP/Sales)');
            $table->boolean('is_active')->default(true);
            $table->decimal('opening_balance', 16, 2)->default(0);
            $table->decimal('current_balance', 16, 2)->default(0);
            $table->decimal('tax_rate', 8, 4)->nullable();
            $table->string('account_group')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('host_id')->references('id')->on('hosts')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('accounts')->onDelete('set null');
            $table->unique(['host_id', 'code']);
            $table->index(['host_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
