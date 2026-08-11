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
            $table->string('sso_id', 255)->nullable()->change();
        });

        Schema::table('hosts', function (Blueprint $table) {
            $table->string('sso_id', 255)->nullable()->change();
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->string('sso_id', 255)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('sso_id')->nullable()->change();
        });

        Schema::table('hosts', function (Blueprint $table) {
            $table->unsignedBigInteger('sso_id')->nullable()->change();
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->unsignedBigInteger('sso_id')->nullable()->change();
        });
    }
};
