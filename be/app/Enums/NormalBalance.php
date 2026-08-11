<?php

namespace App\Enums;

enum NormalBalance: string
{
    case Debit = 'debit';
    case Credit = 'credit';

    public function label(): string
    {
        return $this->value === 'debit' ? 'Debit' : 'Credit';
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
