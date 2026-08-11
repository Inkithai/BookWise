<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * FIX DEF_114: Add foreign key constraint and NOT NULL to invoices_clients.host_id
     * 
     * Root Cause: host_id column exists but has no foreign key constraint and allows NULL,
     * allowing potential data integrity issues (orphaned records, invalid host references).
     * 
     * Solution: Add explicit foreign key constraint + NOT NULL to enforce tenant boundary.
     * This converts DEF_114 from "correct by convention" to "correct by database invariant".
     */
    public function up()
    {
        // Step 1: Ensure there are no NULL or orphaned records
        // Delete any clients with NULL host_id
        DB::table('invoices_clients')
            ->whereNull('host_id')
            ->delete();

        // Delete any clients with invalid host_id references
        DB::table('invoices_clients')
            ->whereNotIn('host_id', function ($query) {
                $query->select('id')->from('hosts');
            })
            ->delete();

        // Step 2: Make host_id NOT NULL
        Schema::table('invoices_clients', function (Blueprint $table) {
            $table->unsignedBigInteger('host_id')->nullable(false)->change();
        });

        // Step 3: Add the foreign key constraint
        Schema::table('invoices_clients', function (Blueprint $table) {
            $table->foreign('host_id')
                ->references('id')
                ->on('hosts')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('invoices_clients', function (Blueprint $table) {
            $table->dropForeign(['host_id']);
        });
    }
};
