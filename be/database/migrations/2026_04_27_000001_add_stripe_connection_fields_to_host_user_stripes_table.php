<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('host_user_stripes', function (Blueprint $table) {
            $table->string('stripe_account_id')->nullable()->after('publish_key');
            $table->string('stripe_connection_status')->nullable()->default('not_connected')->after('stripe_account_id');
            $table->timestamp('stripe_connected_at')->nullable()->after('stripe_connection_status');
        });
    }

    public function down(): void
    {
        Schema::table('host_user_stripes', function (Blueprint $table) {
            $table->dropColumn(['stripe_account_id', 'stripe_connection_status', 'stripe_connected_at']);
        });
    }
};
