<?php

namespace Modules\Invoice\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Models\InvoiceClient;
use Modules\Invoice\Models\InvoiceItem;
use Throwable;

/**
 * Invoice Domain Service with Enforced Tenant Context
 * 
 * DEF_113: This service ensures ALL invoice operations are scoped to the authenticated user's tenant.
 * This prevents accidental tenant boundary bypass and makes tenant context explicit.
 * 
 * Usage:
 *   app(InvoiceService::class)->create($data);
 *   app(InvoiceService::class)->getAll($filters);
 */
class InvoiceService
{
    public function __construct(
        private InvoiceItem $invoiceItem
    ) {}

    /**
     * Create invoice with business workflow
     * 
     * NOTE: Tenant enforcement is handled at model level (Invoice::booted).
     * This service exists for business logic (items, PDF generation), not tenant enforcement.
     * 
     * @param array $data Invoice data (WITHOUT tenant fields)
     * @return Invoice
     */
    public function create(array $data): Invoice
    {
        $user = Auth::user();
        
        if (!$user) {
            throw new \Exception('Authentication required to create invoice');
        }

        return DB::transaction(function () use ($data, $user) {
            $clientName = null;
            if (!empty($data['client_id'])) {
                $client = InvoiceClient::findOrFail($data['client_id']);
                $clientName = $client->name;
            }

            // Tenant fields set explicitly at boundary
            $invoice = Invoice::create([
                'host_id' => $user->host_id,
                'team_id' => $user->team_id ?? null,
                'created_by' => $user->id,
                'client_id' => $data['client_id'] ?? null,
                'client_name' => $clientName,
                'code' => $data['invoice_code'],
                'type_id' => $data['type_id'] ?? null,
                'pdf_type' => $data['pdf_type'] ?? 'classic',
                'status' => $data['status'] ?? 'Created',
                'invoice_date' => $data['invoice_date'],
                'due_date' => $data['due_date'] ?? null,
                'total_discount' => (float) ($data['total_discount'] ?? 0),
                'total_vat' => (float) ($data['total_vat'] ?? 0),
                'total_amount' => (float) ($data['total_amount'] ?? 0),
                'final_amount' => (float) ($data['final_amount'] ?? 0),
                'quotation_title' => $data['quotation_title'] ?? '',
                'quotation_content' => $data['quotation_content'] ?? '',
                'payment_link' => $data['payment_link'] ?? false,
                'bank_payment' => $data['bank_payment'] ?? false,
                'cis_tax' => $data['cis_tax'] ?? null,
                'client_utr' => $data['client_utr'] ?? null,
                'cis_enabled' => $data['cis_enabled'] ?? false,
            ]);

            $this->saveInvoiceItems($invoice, $data['items'] ?? []);

            $this->syncInvoiceToLedger($invoice);

            return $invoice->fresh(['client', 'user', 'items']);
        });
    }

    /**
     * Post an issued invoice to the general ledger when the Accounting module
     * integration is enabled. Never throws - ledger sync must not break invoicing.
     */
    protected function syncInvoiceToLedger(Invoice $invoice): void
    {
        if (! config('accounting.post_invoices_to_ledger', false)) {
            return;
        }

        if (! interface_exists(InvoiceAccountingServiceInterface::class)) {
            return;
        }

        $status = (string) ($invoice->status ?? '');
        if (in_array($status, ['Draft', 'Created'], true)) {
            return;
        }

        try {
            app(InvoiceAccountingServiceInterface::class)->sync($invoice);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Create draft invoice
     */
    public function createDraft(array $data): Invoice
    {
        $user = Auth::user();
        
        if (!$user) {
            throw new \Exception('Authentication required');
        }

        return DB::transaction(function () use ($data, $user) {
            $clientName = null;
            if (!empty($data['client_id'])) {
                $client = InvoiceClient::findOrFail($data['client_id']);
                $clientName = $client->name;
            }

            $invoice = Invoice::create([
                'host_id' => $user->host_id,
                'team_id' => $user->team_id ?? null,
                'created_by' => $user->id,
                'client_id' => $data['client_id'] ?? null,
                'client_name' => $clientName,
                'code' => $data['invoice_code'] ?? null,
                'type_id' => $data['type_id'] ?? null,
                'pdf_type' => $data['pdf_type'] ?? 'classic',
                'status' => 'Draft',
                'invoice_date' => $data['invoice_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'total_discount' => (float) ($data['total_discount'] ?? 0),
                'total_vat' => (float) ($data['total_vat'] ?? 0),
                'total_amount' => (float) ($data['total_amount'] ?? 0),
                'final_amount' => (float) ($data['final_amount'] ?? 0),
                'quotation_title' => $data['quotation_title'] ?? '',
                'quotation_content' => $data['quotation_content'] ?? '',
                'cis_tax' => $data['cis_tax'] ?? null,
                'client_utr' => $data['client_utr'] ?? null,
                'cis_enabled' => $data['cis_enabled'] ?? false,
            ]);

            if (!empty($data['items']) && is_array($data['items'])) {
                $this->saveInvoiceItems($invoice, $data['items']);
            }

            return $invoice->fresh(['client', 'user', 'items']);
        });
    }

    /**
     * Get all invoices for current user's host
     */
    public function getAll(array $filters = [])
    {
        $user = Auth::user();
        
        if (!$user) {
            throw new \Exception('Authentication required');
        }

        $query = Invoice::with(['client', 'user', 'items'])
            ->where('host_id', $user->host_id);

        if (!empty($user->team_id)) {
            $query->where(function ($q) use ($user) {
                $q->where('team_id', $user->team_id)
                  ->orWhereNull('team_id');
            });
        }

        // Apply filters
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        return $query->get();
    }

    /**
     * Save invoice items (helper)
     */
    protected function saveInvoiceItems(Invoice $invoice, array $items): void
    {
        $invoice->items()->delete();

        if (empty($items) || !is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $customFields = $item['custom_fields'] ?? null;
            if (is_string($customFields)) {
                $decoded = json_decode($customFields, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $customFields = $decoded;
                }
            }

            $this->invoiceItem::create([
                'invoice_id' => $invoice->id,
                'item_name' => $item['item_name'] ?? null,
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'] ?? 1,
                'unit_price' => (float) ($item['unit_price'] ?? 0),
                'amount' => (float) ($item['amount'] ?? 0),
                'vat' => (float) ($item['vat'] ?? 0),
                'discount' => (float) ($item['discount'] ?? 0),
                'total' => (float) ($item['total'] ?? 0),
                'item_currency' => $item['item_currency'] ?? null,
                'proj_ref' => $item['proj_ref'] ?? null,
                'custom_fields' => $customFields,
            ]);
        }
    }
}
