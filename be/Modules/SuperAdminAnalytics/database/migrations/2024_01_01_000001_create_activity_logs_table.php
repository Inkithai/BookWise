<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Only create if no activity table exists at all
        if (
            Schema::hasTable('activity_logs') ||
            Schema::hasTable('user_activity_logs') ||
            Schema::hasTable('audit_logs') ||
            Schema::hasTable('login_logs')
        ) {
            return;
        }

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type')->default('login');         // login|register|verify_otp|forget_password|update_info
            $table->string('status')->default('success');     // success|failed|pending
            $table->string('action')->nullable();
            $table->text('details')->nullable();
            $table->text('error')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('request_data')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
