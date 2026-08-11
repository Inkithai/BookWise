<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices_companies', function (Blueprint $table) {
            // Add new address columns
            $table->string('address_no', 50)->nullable()->after('address');
            $table->string('address_street', 255)->nullable()->after('address_no');
            $table->string('address_city', 100)->nullable()->after('address_street');
            $table->string('address_town', 100)->nullable()->after('address_city');
            $table->string('address_postcode', 20)->nullable()->after('address_town');
            $table->string('address_county', 100)->nullable()->after('address_postcode');
            $table->string('address_country', 100)->nullable()->after('address_county');
        });

        // Migrate existing address data
        DB::table('invoices_companies')
            ->whereNotNull('address')
            ->where('address', '!=', '')
            ->orderBy('id')
            ->chunk(100, function ($companies) {
                foreach ($companies as $company) {
                    $parts = $this->parseAddress($company->address);
                    
                    DB::table('invoices_companies')
                        ->where('id', $company->id)
                        ->update([
                            'address_no' => $parts['nr'],
                            'address_street' => $parts['street'],
                            'address_city' => $parts['city'],
                            'address_town' => $parts['town'],
                            'address_postcode' => $parts['postcode'],
                            'address_county' => $parts['county'],
                            'address_country' => $parts['country'],
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices_companies', function (Blueprint $table) {
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

    /**
     * Parse address string into components
     */
    private function parseAddress(string $address): array
    {
        $parts = [
            'nr' => null,
            'street' => null,
            'city' => null,
            'town' => null,
            'postcode' => null,
            'county' => null,
            'country' => null
        ];

        // Basic parsing logic - split by commas and newlines
        $lines = preg_split('/[,\\n]+/', $address);
        $lines = array_map('trim', $lines);
        $lines = array_filter($lines);

        if (empty($lines)) {
            return $parts;
        }

        // Try to extract postcode from last line
        $lastLine = end($lines);
        if (preg_match('/([A-Za-z]{1,2}[A-Za-z0-9]{1,4}\\s[A-Za-z0-9]{1,3})/', $lastLine, $matches)) {
            $parts['postcode'] = $matches[1];
            array_pop($lines); // Remove the line that contained postcode
        }

        // First line might contain house number and street
        if (!empty($lines)) {
            $firstLine = array_shift($lines);
            if (preg_match('/^(\\d+[a-zA-Z]?)\\s+(.+)$/', $firstLine, $matches)) {
                $parts['nr'] = $matches[1];
                $parts['street'] = $matches[2];
            } else {
                $parts['street'] = $firstLine;
            }
        }

        // Remaining lines: city, town, county, country
        if (!empty($lines)) {
            // Last remaining line is likely country
            $parts['country'] = array_pop($lines);
            
            // If we still have lines, assign them
            if (!empty($lines)) {
                // Next to last might be county
                if (count($lines) >= 2) {
                    $parts['county'] = array_pop($lines);
                }
                
                // First remaining is city
                $parts['city'] = array_shift($lines);
                
                // If there's still one left, it's town
                if (!empty($lines)) {
                    $parts['town'] = array_shift($lines);
                }
            }
        }

        return $parts;
    }
};
