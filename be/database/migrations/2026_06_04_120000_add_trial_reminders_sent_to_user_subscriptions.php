<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('user_subscriptions', 'trial_reminders_sent')) {
                if (Schema::hasColumn('user_subscriptions', 'grace_ends_at')) {
                    $table->json('trial_reminders_sent')->nullable()->after('grace_ends_at');
                } else {
                    $table->json('trial_reminders_sent')->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('user_subscriptions', 'trial_reminders_sent')) {
                $table->dropColumn('trial_reminders_sent');
            }
        });
    }
};
