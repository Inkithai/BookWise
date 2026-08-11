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
                $table->boolean('is_active')->default(true);
                $table->boolean('trial_eligible')->default(false);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->json('features')->nullable();
                $table->json('limits')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('plans', function (Blueprint $table) {
                if (! Schema::hasColumn('plans', 'slug')) {
                    $table->string('slug')->nullable()->unique()->after('id');
                }
                if (! Schema::hasColumn('plans', 'monthly_price')) {
                    $table->decimal('monthly_price', 10, 2)->default(0)->after('price');
                }
                if (! Schema::hasColumn('plans', 'yearly_price')) {
                    $table->decimal('yearly_price', 10, 2)->default(0)->after('monthly_price');
                }
                if (! Schema::hasColumn('plans', 'currency')) {
                    $table->string('currency', 3)->default('GBP')->after('yearly_price');
                }
                if (! Schema::hasColumn('plans', 'is_free')) {
                    $table->boolean('is_free')->default(false)->after('currency');
                }
                if (! Schema::hasColumn('plans', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('is_free');
                }
                if (! Schema::hasColumn('plans', 'trial_eligible')) {
                    $table->boolean('trial_eligible')->default(false)->after('is_active');
                }
                if (! Schema::hasColumn('plans', 'sort_order')) {
                    $table->unsignedSmallInteger('sort_order')->default(0)->after('trial_eligible');
                }
                if (! Schema::hasColumn('plans', 'features')) {
                    $table->json('features')->nullable()->after('sort_order');
                }
                if (! Schema::hasColumn('plans', 'limits')) {
                    $table->json('limits')->nullable()->after('features');
                }
            });
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
        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('user_subscriptions', 'plan_id')) {
                $table->dropConstrainedForeignId('plan_id');
            }
            if (Schema::hasColumn('user_subscriptions', 'stripe_payment_method_id')) {
                $table->dropColumn('stripe_payment_method_id');
            }
        });
    }
};
