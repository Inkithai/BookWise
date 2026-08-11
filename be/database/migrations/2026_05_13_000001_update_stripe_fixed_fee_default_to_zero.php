<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Change the stripe_fixed_fee column to be nullable with no default value.
     * Also resets any rows still holding the old default (0.30) to null
     * so that users who never explicitly configured the fee start with no value.
     */
    public function up(): void
    {
        Schema::table('user_stripe_fee_settings', function (Blueprint $table) {
            $table->decimal('stripe_fixed_fee', 8, 2)->nullable()->default(null)->change();
        });

        DB::table('user_stripe_fee_settings')
            ->where('stripe_fixed_fee', 0.30)
            ->update(['stripe_fixed_fee' => null]);
    }

    public function down(): void
    {
        Schema::table('user_stripe_fee_settings', function (Blueprint $table) {
            $table->decimal('stripe_fixed_fee', 8, 2)->default(0.30)->change();
        });
    }
};
