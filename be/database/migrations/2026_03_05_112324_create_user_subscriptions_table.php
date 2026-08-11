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
        Schema::create('user_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->decimal('amount')->nullable();
            $table->string('plan_type')->nullable(); // monthly, yearly, etc.
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'inactive'])->default('trialing');

            $table->dateTime('trial_ends_at')->nullable();
            $table->dateTime('next_payment_at')->nullable();

            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_subscription_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
    }
};
