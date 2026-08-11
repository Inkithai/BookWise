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
        Schema::table('users', function (Blueprint $table) {


            if (!Schema::hasColumn('users', 'stripe_account_id')) {
                $table->string('stripe_account_id')->nullable()->after('email');
            }

            if (!Schema::hasColumn('users', 'stripe_connection_status')) {
                $table->string('stripe_connection_status')
                    ->default('not_connected')
                    ->after('stripe_account_id');
            }

            if (!Schema::hasColumn('users', 'stripe_connected_at')) {
                $table->timestamp('stripe_connected_at')
                    ->nullable()
                    ->after('stripe_connection_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'stripe_account_id',
                'stripe_connection_status',
                'stripe_connected_at',
            ]);
        });
    }
};
