<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clarity_traffic', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->unsignedInteger('total_session_count')->default(0);
            $table->unsignedInteger('total_bot_session_count')->default(0);
            $table->unsignedInteger('distinct_user_count')->default(0);
            $table->decimal('pages_per_session_percentage', 10, 6)->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_engagement_time', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->unsignedInteger('total_time')->default(0);
            $table->unsignedInteger('active_time')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_scroll_depth', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->decimal('average_scroll_depth', 6, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_browsers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->unsignedInteger('sessions_count')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->unsignedInteger('sessions_count')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_oses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->unsignedInteger('sessions_count')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_countries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->unsignedInteger('sessions_count')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_referrers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->text('name')->nullable();
            $table->unsignedInteger('sessions_count')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_popular_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->text('url');
            $table->unsignedInteger('visits_count')->default(0);
            $table->timestamps();
        });

        Schema::create('clarity_engagement_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('clarity_snapshots')->cascadeOnDelete();
            $table->string('metric_name');
            $table->unsignedInteger('sessions_count')->default(0);
            $table->decimal('sessions_with_metric_percentage', 6, 2)->nullable();
            $table->decimal('sessions_without_metric_percentage', 6, 2)->nullable();
            $table->unsignedInteger('pages_views')->nullable();
            $table->unsignedInteger('sub_total')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clarity_engagement_events');
        Schema::dropIfExists('clarity_popular_pages');
        Schema::dropIfExists('clarity_referrers');
        Schema::dropIfExists('clarity_countries');
        Schema::dropIfExists('clarity_oses');
        Schema::dropIfExists('clarity_devices');
        Schema::dropIfExists('clarity_browsers');
        Schema::dropIfExists('clarity_scroll_depth');
        Schema::dropIfExists('clarity_engagement_time');
        Schema::dropIfExists('clarity_traffic');
    }
};
