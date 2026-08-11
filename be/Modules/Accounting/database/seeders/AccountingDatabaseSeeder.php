<?php

namespace Modules\Accounting\Database\Seeders;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Services\TenantManager;
use Illuminate\Database\Seeder;
use Modules\Accounting\Models\Account;
use Modules\Accounting\Models\AccountingSetting;
use Modules\Accounting\Support\SystemAccounts;

class AccountingDatabaseSeeder extends Seeder
{
    /**
     * Seed accounting settings, reserved system accounts and a small sample
     * chart of accounts for the resolved tenant. Safe to run repeatedly.
     */
    public function run(): void
    {
        $hostId = TenantManager::id();

        if ($hostId === null) {
            $this->command?->warn(
                'AccountingDatabaseSeeder requires a resolved tenant. '.'
                Run via `php artisan accounting:seed-defaults {host_id}`.'
            );

            return;
        }

        AccountingSetting::firstOrCreate(['host_id' => $hostId], [
            'base_currency' => config('accounting.default_currency', 'GBP'),
            'fiscal_year_start_month' => 1,
            'decimal_precision' => 2,
        ]);

        SystemAccounts::ensureForHost($hostId);

        $samples = [
            ['code' => '1100', 'name' => 'Bank - Current Account', 'type' => AccountType::Asset, 'normal_balance' => NormalBalance::Debit, 'sub_type' => 'bank'],
            ['code' => '1300', 'name' => 'VAT / GST Payable', 'type' => AccountType::Liability, 'normal_balance' => NormalBalance::Credit, 'sub_type' => 'tax'],
            ['code' => '3000', 'name' => "Owner's Equity", 'type' => AccountType::Equity, 'normal_balance' => NormalBalance::Credit],
            ['code' => '3100', 'name' => 'Retained Earnings', 'type' => AccountType::Equity, 'normal_balance' => NormalBalance::Credit],
            ['code' => '6100', 'name' => 'Office Supplies', 'type' => AccountType::Expense, 'normal_balance' => NormalBalance::Debit],
            ['code' => '6200', 'name' => 'Salaries & Wages', 'type' => AccountType::Expense, 'normal_balance' => NormalBalance::Debit],
        ];

        foreach ($samples as $s) {
            Account::firstOrCreate(
                ['host_id' => $hostId, 'code' => $s['code']],
                array_merge($s, ['is_active' => true, 'opening_balance' => 0, 'current_balance' => 0])
            );
        }

        $this->command?->info("Seeded accounting defaults for host #{$hostId}.");
    }
}
