<?php

namespace App\Mixins;

use Carbon\Carbon;

/**
 * Class DateMixin.
 */
class DateMixin
{
    public static function formatToMySqlDate()
    {
        return function ($date) {
            if (isset($this)) {
                throw new \RuntimeException('Carbon::formatToMySqlDate() must be called statically.');
            }

            $format = 'd/m/Y';

            try {
                $parsedDate = Carbon::createFromFormat($format, $date);
                if ($parsedDate && $parsedDate->format($format) === $date) {
                    return Carbon::createFromFormat($format, $date)->format('Y-m-d');
                }

                return Carbon::parse($date)->format('Y-m-d');
            } catch (\Throwable $th) {
                return Carbon::parse($date)->format('Y-m-d');
            }
        };
    }

    public static function formatToPreviewDate()
    {
        return function ($date) {
            if (isset($this)) {
                throw new \RuntimeException('Carbon::formatToPreviewDate() must be called statically.');
            }

            return Carbon::parse($date)->format('d/m/Y');
        };
    }

    public static function formatToMonthDate()
    {
        return function ($date) {
            if (isset($this)) {
                throw new \RuntimeException('Carbon::formatToPreviewDate() must be called statically.');
            }

            return Carbon::parse($date)->format('M Y');
        };
    }

    public static function formatToFullMonthDate()
    {
        return function ($date) {
            if (isset($this)) {
                throw new \RuntimeException('Carbon::formatToPreviewDate() must be called statically.');
            }

            return Carbon::parse($date)->format('F Y');
        };
    }
}
