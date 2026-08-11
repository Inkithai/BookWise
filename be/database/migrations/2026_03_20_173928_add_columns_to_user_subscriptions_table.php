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
        Schema::table('user_subscriptions', function (Blueprint $table) {

            if (!Schema::hasColumn('user_subscriptions', 'plan_name')) {
                $table->string('plan_name')->nullable()->after('plan_type');
            }

            if (Schema::hasColumn('user_subscriptions', 'status')) {

                $table->dropColumn('status');
            }
            //    $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'inactive'])->default('trialing');
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'inactive', 'trial_end'])->default('trialing');



            if (!Schema::hasColumn('user_subscriptions', 'payment_intent_id')) {
                $table->string('payment_intent_id')->nullable()->after('plan_name');
            }

            if (!Schema::hasColumn('user_subscriptions', 'grace_ends_at')) {
                $table->string('grace_ends_at')->nullable()->after('payment_intent_id');
            }

            if (!Schema::hasColumn('user_subscriptions', 'stripe_customer_id')) {
                $table->string('stripe_customer_id')->nullable()->after('grace_ends_at');
            }

            // Add paid_at column to track when the subscription was paid
            if (!Schema::hasColumn('user_subscriptions', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('stripe_customer_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_subscriptions', function (Blueprint $table) {

            if (Schema::hasColumn('user_subscriptions', 'plan_name')) {
                $table->dropColumn('plan_name');
            }

            if (Schema::hasColumn('user_subscriptions', 'payment_intent_id')) {
                $table->dropColumn('payment_intent_id');
            }

            if (Schema::hasColumn('user_subscriptions', 'grace_ends_at')) {
                $table->dropColumn('grace_ends_at');
            }

            if (Schema::hasColumn('user_subscriptions', 'stripe_customer_id')) {
                $table->dropColumn('stripe_customer_id');
            }
        });
    }
};
