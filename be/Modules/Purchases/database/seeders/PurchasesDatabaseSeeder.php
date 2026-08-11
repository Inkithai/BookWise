<?php

namespace Modules\Purchases\Database\Seeders;

use App\Services\TenantManager;
use Illuminate\Database\Seeder;
use Modules\Purchases\Models\Vendor;

class PurchasesDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $hostId = TenantManager::id();

        if ($hostId === null) {
            $this->command?->warn('PurchasesDatabaseSeeder requires a resolved tenant.');

            return;
        }

        if (Vendor::where('host_id', $hostId)->exists()) {
            return;
        }

        Vendor::create([
            'host_id' => $hostId,
            'name' => 'Sample Supplier Ltd',
            'email' => 'accounts@samplesupplier.example',
            'currency' => 'GBP',
            'opening_balance' => 0,
        ]);

        $this->command?->info("Seeded a sample vendor for host #{$hostId}.");
    }
}
