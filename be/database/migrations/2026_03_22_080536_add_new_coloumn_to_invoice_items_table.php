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
        if (!Schema::hasColumn('invoice_items', 'project_reference')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->string('project_reference')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('invoice_items', 'project_reference')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->dropColumn('project_reference');
            });
        }
    }
};
