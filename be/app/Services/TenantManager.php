<?php

namespace App\Services;

use App\Models\Host;

/**
 * Resolves and stores the "current tenant" (organization / SMB account) for
 * the duration of a request.
 *
 * Tenant boundary for ALL accounting data is the {@see Host} row (host_id),
 * matching the existing SaaS model where a Host represents the subscribing
 * SMB organization. Every tenant-scoped model applies a global scope that
 * reads the id resolved here.
 */
class TenantManager
{
    private static ?int $hostId = null;

    private static ?Host $model = null;

    public static function setId(?int $hostId): void
    {
        static::$hostId = $hostId ? (int) $hostId : null;
        static::$model = null;
    }

    public static function id(): ?int
    {
        return static::$hostId;
    }

    public static function isResolved(): bool
    {
        return static::$hostId !== null;
    }

    public static function model(): ?Host
    {
        if (static::$hostId === null) {
            return null;
        }

        if (static::$model === null) {
            static::$model = Host::find(static::$hostId);
        }

        return static::$model;
    }

    public static function reset(): void
    {
        static::$hostId = null;
        static::$model = null;
    }
}
