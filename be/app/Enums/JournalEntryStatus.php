<?php

namespace App\Enums;

/**
 * Lifecycle of a journal entry (the atomic unit of the general ledger).
 */
enum JournalEntryStatus: string
{
    case Draft = 'draft';
    case Posted = 'posted';
    case Reversed = 'reversed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Posted => 'Posted',
            self::Reversed => 'Reversed',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
