<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clarity_snapshots', function (Blueprint $table) {
            $table->id();
            $table->json('payload')->nullable();
            $table->timestamp('last_fetched_at')->nullable();
            $table->date('snapshot_date')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clarity_snapshots');
    }
};
