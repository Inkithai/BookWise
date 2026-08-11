<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_statements', function (Blueprint $table) {
            $table->unsignedBigInteger('last_invoice_id')->nullable()->after('last_run_at');
            $table->timestamp('last_processed_at')->nullable()->after('last_invoice_id');
            $table->text('last_error')->nullable()->after('last_processed_at');
        });
    }

    public function down(): void
    {
        Schema::table('recurring_statements', function (Blueprint $table) {
            $table->dropColumn(['last_invoice_id', 'last_processed_at', 'last_error']);
        });
    }
};
