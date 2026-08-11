<?php

namespace App\Console\Commands;

use App\Services\TenantManager;
use Illuminate\Console\Command;
use Modules\Accounting\Database\Seeders\AccountingDatabaseSeeder;

class SeedAccountingDefaults extends Command
{
    protected $signature = 'accounting:seed-defaults {host_id : The host (tenant) id to seed}';

    protected $description = 'Seed accounting settings, system accounts and a sample chart of accounts for a tenant.';

    public function handle(): int
    {
        $hostId = (int) $this->argument('host_id');

        TenantManager::setId($hostId);
        $this->info("Seeding accounting defaults for host #{$hostId}...");
        $this->call(AccountingDatabaseSeeder::class);
        TenantManager::reset();

        return self::SUCCESS;
    }
}
