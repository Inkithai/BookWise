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

        if (!Schema::hasTable('user_onboarding_states')) {

            Schema::create('user_onboarding_states', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id');
                $table->boolean('first_login')->nullable();
                $table->boolean('has_seen_pricing')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_onboarding_states');
    }
};
