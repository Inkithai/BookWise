<?php

namespace Modules\Banking\Database\Seeders;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Services\TenantManager;
use Illuminate\Database\Seeder;
use Modules\Accounting\Models\Account;
use Modules\Banking\Models\BankAccount;

class BankingDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $hostId = TenantManager::id();

        if ($hostId === null) {
            $this->command?->warn('BankingDatabaseSeeder requires a resolved tenant.');

            return;
        }

        if (BankAccount::where('host_id', $hostId)->exists()) {
            return;
        }

        $coa = Account::create([
            'host_id' => $hostId,
            'code' => '1100',
            'name' => 'Bank - Current Account',
            'type' => AccountType::Asset->value,
            'normal_balance' => NormalBalance::Debit->value,
            'sub_type' => 'bank',
            'account_group' => 'cash',
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_active' => true,
        ]);

        BankAccount::create([
            'host_id' => $hostId,
            'account_id' => $coa->id,
            'name' => 'Primary Business Account',
            'bank_name' => 'High Street Bank',
            'currency' => 'GBP',
            'account_type' => 'checking',
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_active' => true,
        ]);

        $this->command?->info("Seeded a sample bank account for host #{$hostId}.");
    }
}
