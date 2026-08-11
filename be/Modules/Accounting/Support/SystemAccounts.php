<?php

namespace Modules\Accounting\Support;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use Modules\Accounting\Models\Account;

/**
 * Canonical "system" accounts every SMB ledger needs. These back the
 * AR / AP / revenue / expense workflows and must never be deleted.
 */
final class SystemAccounts
{
    public const AR = '1200';
    public const AP = '2000';
    public const CASH = '1000';
    public const SALES = '4000';
    public const COS = '5000';
    public const EXPENSE = '6000';

    /**
     * @return array<string, array{name:string,type:AccountType,normal_balance:NormalBalance}>
     */
    public static function definitions(): array
    {
        return [
            self::CASH => ['name' => 'Cash / Undeposited Funds', 'type' => AccountType::Asset, 'normal_balance' => NormalBalance::Debit],
            self::AR => ['name' => 'Accounts Receivable', 'type' => AccountType::Asset, 'normal_balance' => NormalBalance::Debit],
            self::AP => ['name' => 'Accounts Payable', 'type' => AccountType::Liability, 'normal_balance' => NormalBalance::Credit],
            self::SALES => ['name' => 'Sales Revenue', 'type' => AccountType::Income, 'normal_balance' => NormalBalance::Credit],
            self::COS => ['name' => 'Cost of Goods Sold', 'type' => AccountType::Expense, 'normal_balance' => NormalBalance::Debit],
            self::EXPENSE => ['name' => 'Operating Expenses', 'type' => AccountType::Expense, 'normal_balance' => NormalBalance::Debit],
        ];
    }

    /**
     * Idempotently create the system accounts for a tenant and return code => id map.
     *
     * @return array<string, int>
     */
    public static function ensureForHost(int $hostId): array
    {
        $map = [];

        foreach (self::definitions() as $code => $def) {
            $account = Account::query()->firstOrCreate(
                ['host_id' => $hostId, 'code' => $code],
                [
                    'name' => $def['name'],
                    'type' => $def['type']->value,
                    'normal_balance' => $def['normal_balance']->value,
                    'is_system' => true,
                    'is_active' => true,
                    'opening_balance' => 0,
                    'current_balance' => 0,
                    'account_group' => 'system',
                ]
            );
            $map[$code] = $account->id;
        }

        return $map;
    }
}
