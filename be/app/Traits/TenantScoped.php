<?php

namespace App\Traits;

use App\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;

/**
 * Row-level multi-tenancy for a shared database.
 *
 * Responsibilities:
 *  - Applies a global scope restricting every query to the resolved tenant
 *    (host_id) whenever one is available. When no tenant is resolved
 *    (console/seeders, or super-admin without X-Host-Id) the scope is inert
 *    so administrative / cross-tenant work can run explicitly.
 *  - On create, stamps host_id from the resolved tenant and enforces that a
 *    tenant boundary is always present. This mirrors the Invoice module's
 *    hard requirement that host_id is set on every record.
 */
trait TenantScoped
{
    public function scopeForTenant(Builder $query, ?int $hostId): Builder
    {
        return $query->where($this->getTenantColumn(), $hostId);
    }

    public function getTenantColumn(): string
    {
        return property_exists($this, 'tenantColumn') ? $this->tenantColumn : 'host_id';
    }

    protected static function bootTenantScoped(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            $column = (new static)->getTenantColumn();
            $hostId = TenantManager::id();

            if ($hostId !== null) {
                $query->where($column, $hostId);
            }
        });

        static::creating(function ($model) {
            $column = $model->getTenantColumn();

            if (empty($model->{$column})) {
                $model->{$column} = TenantManager::id();
            }

            if (empty($model->{$column}) && ! app()->runningInConsole()) {
                throw new \DomainException(
                    $column.' is required for all '.class_basename($model).' records'
                );
            }
        });
    }
}
