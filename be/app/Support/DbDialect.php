<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Small SQL-dialect helpers so raw expressions keep working on both
 * MySQL (local development) and PostgreSQL (production, e.g. Supabase).
 *
 * Every method returns a raw SQL fragment compatible with the connection
 * that is currently configured.
 */
final class DbDialect
{
    public static function driver(): string
    {
        return DB::connection()->getDriverName();
    }

    public static function isPostgres(): bool
    {
        return self::driver() === 'pgsql';
    }

    /**
     * 'YYYY-MM' month key for a datetime column,
     * e.g. DbDialect::monthKey('created_at') or DbDialect::monthKey('ic.created_at').
     */
    public static function monthKey(string $column): string
    {
        return self::isPostgres()
            ? "to_char({$column}, 'YYYY-MM')"
            : "DATE_FORMAT({$column}, '%Y-%m')";
    }

    /**
     * Format a datetime column with driver-specific format strings.
     * $mysqlFormat uses MySQL tokens (%b %d, %Y), $pgFormat uses to_char tokens.
     */
    public static function dateFormat(string $column, string $mysqlFormat, string $pgFormat): string
    {
        return self::isPostgres()
            ? "to_char({$column}, '{$pgFormat}')"
            : "DATE_FORMAT({$column}, '{$mysqlFormat}')";
    }

    /**
     * Comma-joined aggregate over a column (GROUP_CONCAT vs string_agg).
     */
    public static function groupConcat(string $expression, string $separator = ','): string
    {
        return self::isPostgres()
            ? "string_agg({$expression}::text, '{$separator}')"
            : "GROUP_CONCAT({$expression})";
    }

    /**
     * Boolean expression: "column holds valid JSON".
     * PostgreSQL json/jsonb columns are always valid JSON, so only NULL matters.
     */
    public static function jsonValid(string $column): string
    {
        return self::isPostgres()
            ? "({$column} IS NOT NULL)"
            : "JSON_VALID({$column})";
    }

    /**
     * Lowercased top-level JSON string value,
     * e.g. DbDialect::jsonValueLower('al.details', 'status').
     */
    public static function jsonValueLower(string $column, string $key): string
    {
        return self::isPostgres()
            ? "LOWER({$column}->>'{$key}')"
            : "LOWER(JSON_UNQUOTE(JSON_EXTRACT({$column}, '$.{$key}')))";
    }

    /**
     * TIMESTAMPDIFF(unit, from, to) equivalent (unit: MINUTE|HOUR|DAY).
     */
    public static function timestampDiff(string $unit, string $from, string $to): string
    {
        if (! self::isPostgres()) {
            return "TIMESTAMPDIFF({$unit}, {$from}, {$to})";
        }

        $divisor = match (strtoupper($unit)) {
            'MINUTE' => 60,
            'HOUR'   => 3600,
            'DAY'    => 86400,
            default  => 1,
        };

        return "FLOOR(EXTRACT(EPOCH FROM ({$to} - {$from})) / {$divisor})";
    }

    /**
     * NOW() minus an interval, e.g. DbDialect::nowMinusInterval(1, 'MINUTE').
     */
    public static function nowMinusInterval(int $amount, string $unit): string
    {
        return self::isPostgres()
            ? "(NOW() - INTERVAL '{$amount} {$unit}')"
            : "(NOW() - INTERVAL {$amount} {$unit})";
    }

    /**
     * Expression usable with LIKE over a column that may be JSON typed.
     * PostgreSQL needs an explicit ::text cast; MySQL coerces implicitly.
     */
    public static function likeableText(string $column): string
    {
        return self::isPostgres() ? "{$column}::text" : $column;
    }

    /**
     * Normalise a boolean-ish value coming from the database.
     * PostgreSQL (PDO) returns 't'/'f' strings for boolean columns,
     * MySQL returns 1/0 integers.
     */
    public static function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return ! in_array(strtolower($value), ['', 'f', 'false', '0', 'n', 'no'], true);
        }

        return (bool) $value;
    }
}
