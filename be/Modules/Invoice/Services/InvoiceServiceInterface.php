<?php

namespace Modules\Invoice\Services;

use Modules\Invoice\Models\Invoice;

/**
 * Invoice Service Interface
 * 
 * DEF_113: Enforces tenant context for all invoice operations.
 * Implementations must derive tenant from authenticated user context.
 */
interface InvoiceServiceInterface
{
    /**
     * Create invoice with enforced tenant context
     * 
     * @param array $data Invoice data (WITHOUT tenant fields)
     * @return Invoice
     */
    public function create(array $data): Invoice;

    /**
     * Create draft invoice with enforced tenant context
     * 
     * @param array $data Invoice data (WITHOUT tenant fields)
     * @return Invoice
     */
    public function createDraft(array $data): Invoice;

    /**
     * Get all invoices for current tenant
     * 
     * @param array $filters Optional filters
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getAll(array $filters = []);
}
