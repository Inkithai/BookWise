<?php

namespace App\Enums;

/**
 * The five foundational account categories of double-entry bookkeeping.
 * The "normal balance" of each category determines whether a debit or a
 * credit increases the account.
 */
enum AccountType: string
{
    case Asset = 'asset';
    case Liability = 'liability';
    case Equity = 'equity';
    case Income = 'income';
    case Expense = 'expense';

    public function label(): string
    {
        return match ($this) {
            self::Asset => 'Asset',
            self::Liability => 'Liability',
            self::Equity => 'Equity',
            self::Income => 'Income',
            self::Expense => 'Expense',
        };
    }

    /**
     * The normal (increasing) balance side for the category.
     */
    public function normalBalance(): string
    {
        return match ($this) {
            self::Asset, self::Expense => 'debit',
            self::Liability, self::Equity, self::Income => 'credit',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
