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
        Schema::table('host_user_stripes', function (Blueprint $table) {
            $table->text('secret_key')->nullable()->change();
            $table->text('publish_key')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('host_user_stripes', function (Blueprint $table) {
            $table->text('secret_key')->nullable(false)->change();
            $table->text('publish_key')->nullable(false)->change();
        });
    }
};
