<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_subscriptions')) {
            return;
        }

        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('user_subscriptions', 'plan_id')) {
                $table->foreignId('plan_id')->nullable()->after('user_id')->constrained('plans')->nullOnDelete();
            }
            if (! Schema::hasColumn('user_subscriptions', 'stripe_payment_method_id')) {
                if (Schema::hasColumn('user_subscriptions', 'stripe_customer_id')) {
                    $table->string('stripe_payment_method_id')->nullable()->after('stripe_customer_id');
                } else {
                    $table->string('stripe_payment_method_id')->nullable();
                }
            }
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
        if (! Schema::hasTable('user_subscriptions')) {
            return;
        }

        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('user_subscriptions', 'plan_id')) {
                $table->dropConstrainedForeignId('plan_id');
            }
            if (Schema::hasColumn('user_subscriptions', 'stripe_payment_method_id')) {
                $table->dropColumn('stripe_payment_method_id');
            }
            if (Schema::hasColumn('user_subscriptions', 'trial_reminders_sent')) {
                $table->dropColumn('trial_reminders_sent');
            }
        });
    }
};
