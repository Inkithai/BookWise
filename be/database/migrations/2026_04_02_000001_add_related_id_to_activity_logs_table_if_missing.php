<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Older activity_logs schema may not include related_id, but app/Traits/LogsActivity.php
     * always inserts related_id.
     */
    public function up(): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        if (Schema::hasColumn('activity_logs', 'related_id')) {
            return;
        }

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('related_id')->nullable()->after('action');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        if (! Schema::hasColumn('activity_logs', 'related_id')) {
            return;
        }

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn('related_id');
        });
    }
};

