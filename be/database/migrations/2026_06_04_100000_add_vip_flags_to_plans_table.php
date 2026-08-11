<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->string('name');
                $table->text('description')->nullable();
                $table->decimal('monthly_price', 10, 2)->default(0);
                $table->decimal('yearly_price', 10, 2)->default(0);
                $table->string('currency', 3)->default('GBP');
                $table->boolean('is_free')->default(false);
                $table->boolean('is_vip')->default(false);
                $table->boolean('is_public')->default(true);
                $table->boolean('is_active')->default(true);
                $table->boolean('trial_eligible')->default(false);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->json('features')->nullable();
                $table->json('limits')->nullable();
                $table->timestamps();
            });
        } else {
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'is_vip')) {
                $table->boolean('is_vip')->default(false)->after('is_free');
            }
            if (! Schema::hasColumn('plans', 'is_public')) {
                $table->boolean('is_public')->default(true)->after('is_vip');
            }
        });
        }

        $this->ensureUserSubscriptionsPlanId();
    }

    private function ensureUserSubscriptionsPlanId(): void
    {
        if (! Schema::hasTable('user_subscriptions') || ! Schema::hasTable('plans')) {
            return;
        }

        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('user_subscriptions', 'plan_id')) {
                $table->foreignId('plan_id')->nullable()->after('user_id')->constrained('plans')->nullOnDelete();
            }
            if (! Schema::hasColumn('user_subscriptions', 'stripe_payment_method_id')) {
                $table->string('stripe_payment_method_id')->nullable()->after('stripe_customer_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'is_public')) {
                $table->dropColumn('is_public');
            }
            if (Schema::hasColumn('plans', 'is_vip')) {
                $table->dropColumn('is_vip');
            }
        });
    }
};
