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
        Schema::dropIfExists('ga_events');
        Schema::dropIfExists('ga_popular_pages');
        Schema::dropIfExists('ga_demographics');
        Schema::dropIfExists('ga_devices');
        Schema::dropIfExists('ga_traffic_sources');
        Schema::dropIfExists('ga_sessions_users');
        Schema::dropIfExists('google_analytics_snapshots');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally recreate tables if needed
    }
};
