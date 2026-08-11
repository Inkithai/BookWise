<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('invoice_items')) {
            return;
        }

        if (Schema::hasColumn('invoice_items', 'custom_fields')) {
            return;
        }

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->json('custom_fields')->nullable()->after('project_reference');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('invoice_items') || ! Schema::hasColumn('invoice_items', 'custom_fields')) {
            return;
        }

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn('custom_fields');
        });
    }
};

