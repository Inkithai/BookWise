<?php

namespace Modules\Expenses\Database\Seeders;

use App\Services\TenantManager;
use Illuminate\Database\Seeder;
use Modules\Expenses\Models\ExpenseCategory;

class ExpensesDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $hostId = TenantManager::id();

        if ($hostId === null) {
            $this->command?->warn('ExpensesDatabaseSeeder requires a resolved tenant.');

            return;
        }

        $defaults = [
            ['name' => 'Office Supplies', 'account_id' => null],
            ['name' => 'Travel', 'account_id' => null],
            ['name' => 'Utilities', 'account_id' => null],
            ['name' => 'Salaries & Wages', 'account_id' => null],
        ];

        foreach ($defaults as $d) {
            ExpenseCategory::firstOrCreate(
                ['host_id' => $hostId, 'name' => $d['name']],
                ['description' => null]
            );
        }

        $this->command?->info("Seeded expense categories for host #{$hostId}.");
    }
}
