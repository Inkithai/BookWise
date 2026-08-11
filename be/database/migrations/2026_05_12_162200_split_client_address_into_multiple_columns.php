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
        Schema::table('invoices_clients', function (Blueprint $table) {
            // Add new address columns
            $table->string('address_no', 50)->nullable()->after('address');
            $table->string('address_street', 255)->nullable()->after('address_no');
            $table->string('address_city', 100)->nullable()->after('address_street');
            $table->string('address_town', 100)->nullable()->after('address_city');
            $table->string('address_postcode', 20)->nullable()->after('address_town');
            $table->string('address_county', 100)->nullable()->after('address_postcode');
            $table->string('address_country', 100)->nullable()->after('address_county');
        });

        // Migrate existing address data (optional - you can handle this manually)
        // This is a basic migration - you might want to improve the parsing logic
        \Illuminate\Support\Facades\DB::table('invoices_clients')->whereNotNull('address')->get()->each(function ($client) {
            $parts = explode(',', $client->address);
            $updateData = [];
            
            // Basic parsing - you may want to improve this
            if (count($parts) >= 1) $updateData['address_street'] = trim($parts[0]);
            if (count($parts) >= 2) $updateData['address_city'] = trim($parts[1]);
            if (count($parts) >= 3) $updateData['address_country'] = trim($parts[2]);
            
            if (!empty($updateData)) {
                \Illuminate\Support\Facades\DB::table('invoices_clients')
                    ->where('id', $client->id)
                    ->update($updateData);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices_clients', function (Blueprint $table) {
            $table->dropColumn([
                'address_no',
                'address_street', 
                'address_city',
                'address_town',
                'address_postcode',
                'address_county',
                'address_country'
            ]);
        });
    }
};
