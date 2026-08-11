<?php

namespace Modules\Invoice\Repositories;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Modules\User\Models\User as InvoiceUser;
use Modules\User\Models\UserBank;
use App\Models\Company;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Models\InvoiceClient;
use Modules\Invoice\Models\InvoiceCompany;
use Modules\Invoice\Models\InvoiceItem;
use Modules\Invoice\Models\InvoiceType;
use Throwable;

class InvoiceRepository implements InvoiceInterface
{
    public function __construct(
        private Invoice $_invoice,
        private InvoiceCompany $_invoiceCompany,
        private InvoiceClient $_invoiceClient,
        private InvoiceType $_invoiceType,
        private InvoiceItem $_invoiceItem
    ) {}

    private function resolveActiveHostId(?array $data = null): int
    {
        $user = Auth::user();

        // 2026-04-29 — ALL-Accounts View: derive host_id from company_id in payload
        if ($data && !empty($data['all_accounts_view'])) {
            $requestedRef = (int) ($data['company_id'] ?? 0);
            if ($requestedRef > 0) {
                // Try personal host_id match
                $personalHostId = (int) ($user->host_id ?? 0);
                if ($personalHostId > 0 && $requestedRef === $personalHostId) {
                    return $personalHostId;
                }
                // Try company match
                $company = Company::where('id', $requestedRef)
                    ->where('owner_user_id', $user->id)
                    ->first();
                if ($company && $company->host_id) {
                    return (int) $company->host_id;
                }
            }
        }

        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
        if (
            $isCompanyContext
            && !empty($user->active_company_id)
        ) {
            // Owner lookup (admin/personal/super-admin — all have owner_user_id set on companies they created)
            $company = Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            // Sub-user lookup: company belongs to the same host
            if (!$company && !empty($user->host_id)) {
                $company = Company::where('id', (int) $user->active_company_id)
                    ->where('host_id', (int) $user->host_id)
                    ->first();
            }
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        // Company account without active_company_id: try first active company
        if ($isCompanyContext && empty($user->active_company_id)) {
            // Owner lookup
            $firstCompany = Company::where('owner_user_id', $user->id)
                ->where('is_active', true)
                ->orderByDesc('id')
                ->first();
            // Sub-user lookup: any company under the same host
            if (!$firstCompany && !empty($user->host_id)) {
                $firstCompany = Company::where('host_id', (int) $user->host_id)
                    ->where('is_active', true)
                    ->orderByDesc('id')
                    ->first();
            }
            if ($firstCompany && $firstCompany->host_id) {
                return (int) $firstCompany->host_id;
            }
        }
        return $this->resolveUserHostIdWithFallback($user);
    }

    private function resolveUserHostIdWithFallback($user): int
    {
        $hostId = (int) ($user->host_id ?? 0);
        if ($hostId > 0) {
            return $hostId;
        }

        if (is_null($user->host_id) || strtolower((string) ($user->account_type ?? '')) === 'super-admin') {
            $hostId = (int) (\App\Models\Host::query()->orderBy('id')->value('id') ?? 0);
        }

        if ($hostId <= 0) {
            throw ValidationException::withMessages([
                'host' => ['No host account exists. Seed hosts or assign a host_id to your user.'],
            ]);
        }

        return $hostId;
    }

    /**
     * Returns the company_id to scope data queries for sub-users.
     * - Admin/Owner: null (sees all data under host_id)
     * - Sub-user in company context: active_company_id (sees only that company's data)
     * - Sub-user in personal context: personal host_id (sees only personal data)
     */
    private function resolveCompanyScope(): ?int
    {
        $user = Auth::user();
        if (!$user) {
            return null;
        }

        // Super-admin (host_id = null) and rootless accounts: no company scope restriction.
        if (is_null($user->host_id)) {
            return null;
        }

        // Identify sub-users by structure, NOT by role name.
        // Sub-users can have ANY role (admin, team-member, or custom).
        // A sub-user is any user who has a host_id AND is NOT the primary billing
        // user for that host (i.e. they were created under someone else's account).
        $hostId = (int) $user->host_id;
        $primary = \Modules\User\Models\User::primaryBillingUserForHost($hostId);
        $isSubUser = !$primary || (int) $primary->id !== (int) $user->id;

        if ($isSubUser) {
            // Sub-users see ALL invoices under their parent's host.
            // The host_id WHERE clause in getAllData() already ensures tenant isolation.
            // Adding a company_id restriction here would block parent invoices that were
            // created under a different company context — so we return null (no restriction).
            return null;
        }

        // Primary account owner: no extra scope — they own everything under their host.
        return null;
    }


    private function resolveWritableHostId(array $data): int
    {
        $requestedCompanyRef = (int) ($data['company_id'] ?? 0);
        if ($requestedCompanyRef <= 0) {
            throw ValidationException::withMessages([
                'company_id' => ['company_id is required and must be a positive integer.'],
            ]);
        }

        $user = Auth::user();
        $personalHostId = (int) ($user->host_id ?? 0);
        // Super-admin is rootless; fall back to first real host.
        if ($personalHostId <= 0 && is_null($user->host_id)) {
            $personalHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
        }

        // ALL-Accounts View: bypass session context, resolve host_id from company_id directly.
        if (!empty($data['all_accounts_view'])) {
            if ($personalHostId > 0 && $requestedCompanyRef === $personalHostId) {
                return $personalHostId;
            }
            $company = Company::query()
                ->where('owner_user_id', $user->id)
                ->where('id', $requestedCompanyRef)
                ->where('is_active', true)
                ->first();
            if ($company) {
                return (int) $company->host_id;
            }
            $company = Company::query()
                ->where('owner_user_id', $user->id)
                ->where('id', $requestedCompanyRef)
                ->first();
            if ($company) {
                return (int) ($company->host_id ?? $personalHostId);
            }
            throw ValidationException::withMessages([
                'company_id' => ['all_accounts_view: company_id does not match any account you own.'],
            ]);
        }

        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');

        if (!$isCompanyContext) {
            if ($personalHostId > 0 && $requestedCompanyRef === $personalHostId) {
                return $personalHostId;
            }

            throw ValidationException::withMessages([
                'company_id' => ['In personal context, company_id must be your personal host_id.'],
            ]);
        }

        $ownedCompanyById = Company::query()
            ->where('owner_user_id', $user->id)
            ->where('id', $requestedCompanyRef)
            ->where('is_active', true)
            ->first();
        if ($ownedCompanyById) {
            return (int) $ownedCompanyById->host_id;
        }

        // Sub-user fallback: the sub-user doesn't own the company but shares the parent's host.
        // Allow if the requested company belongs to the same host as the sub-user.
        if (!is_null($user->host_id)) {
            $subUserHostId = (int) $user->host_id;
            // Direct host_id match: sub-user is operating under their personal host
            // (no Company record needed — the host itself is the "company").
            if ($requestedCompanyRef === $subUserHostId) {
                return $subUserHostId;
            }
            $hostCompany = Company::query()
                ->where('host_id', $subUserHostId)
                ->where('id', $requestedCompanyRef)
                ->where('is_active', true)
                ->first();
            if ($hostCompany) {
                return (int) $hostCompany->host_id;
            }
        }

        throw ValidationException::withMessages([
            'company_id' => ['In company context, company_id must be an active company id owned by you.'],
        ]);
    }

    /**
     * Persisted company reference for invoice payload compatibility.
     * - personal selection => personal host_id
     * - company selection  => companies.id (normalized), with host_id still used for tenancy.
     */
    private function resolveWritableCompanyReference(array $data, int $resolvedHostId): int
    {
        $requestedCompanyRef = (int) ($data['company_id'] ?? 0);
        if ($requestedCompanyRef <= 0) {
            throw ValidationException::withMessages([
                'company_id' => ['company_id is required and must be a positive integer.'],
            ]);
        }

        $user = Auth::user();
        $personalHostId = (int) ($user->host_id ?? 0);
        // Super-admin is rootless; fall back to first real host.
        if ($personalHostId <= 0 && is_null($user->host_id)) {
            $personalHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
        }

        // ALL-Accounts View: resolve company reference without session context.
        if (!empty($data['all_accounts_view'])) {
            if ($personalHostId > 0 && $requestedCompanyRef === $personalHostId) {
                return $personalHostId;
            }
            $company = Company::query()
                ->where('owner_user_id', $user->id)
                ->where('id', $requestedCompanyRef)
                ->first();
            if ($company && (int) $company->host_id === $resolvedHostId) {
                return (int) $company->id;
            }
            return $personalHostId;
        }

        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');

        if (!$isCompanyContext) {
            if ($requestedCompanyRef === $personalHostId) {
                // In personal context company_id intentionally carries personal host_id.
                return $personalHostId;
            }
            throw ValidationException::withMessages([
                'company_id' => ['In personal context, company_id must be your personal host_id.'],
            ]);
        }

        $ownedById = Company::query()
            ->where('owner_user_id', (int) $user->id)
            ->where('id', $requestedCompanyRef)
            ->where('is_active', true)
            ->first();
        if ($ownedById && (int) $ownedById->host_id === $resolvedHostId) {
            return (int) $ownedById->id;
        }

        // Sub-user fallback: allow invoice creation under any active company
        // that belongs to the sub-user's shared host (parent's host_id).
        if (!is_null($user->host_id)) {
            $subUserHostId = (int) $user->host_id;
            // Direct host_id match: no Company record needed.
            if ($requestedCompanyRef === $subUserHostId && $subUserHostId === $resolvedHostId) {
                return $subUserHostId;
            }
            $hostCompany = Company::query()
                ->where('host_id', $subUserHostId)
                ->where('id', $requestedCompanyRef)
                ->where('is_active', true)
                ->first();
            if ($hostCompany && (int) $hostCompany->host_id === $resolvedHostId) {
                return (int) $hostCompany->id;
            }
        }

        throw ValidationException::withMessages([
            'company_id' => ['In company context, company_id must be an active company id owned by you.'],
        ]);
    }

    public function getAllData(array $filters)
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = \App\Models\Team::where('host_id', $hostId)->value('id');

        $query = Invoice::with(['client', 'user', 'items']);

        // Fix DEF_113: Use host_id for tenancy (not company_id)
        $query->where('host_id', $hostId);

        // Sub-user company scoping: only see data for their assigned company
        $companyScope = $this->resolveCompanyScope();
        if ($companyScope !== null) {
            $query->where('company_id', $companyScope);
        }

        // If a team ID is present, we can show both team-specific and company-wide (NULL) invoices
        if ($teamId) {
            $query->where(function ($q) use ($teamId) {
                $q->where('team_id', $teamId)
                  ->orWhereNull('team_id');
            });
        }

        // Apply filters if provided
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (! empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('telephone', 'like', "%{$search}%")
                    ->orWhere('address_no', 'like', "%{$search}%")
                    ->orWhere('address_street', 'like', "%{$search}%")
                    ->orWhere('address_city', 'like', "%{$search}%")
                    ->orWhere('address_town', 'like', "%{$search}%")
                    ->orWhere('address_postcode', 'like', "%{$search}%")
                    ->orWhere('address_county', 'like', "%{$search}%")
                    ->orWhere('address_country', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        return $query->get();
    }

    public function getAllInvoiceClients(): array
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = \App\Models\Team::where('host_id', $hostId)->value('id');

        $query = InvoiceClient::query();

        // Always filter by company (Host ID)
        $query->where('host_id', $hostId);

        // Sub-user company scoping: only see clients linked to their company's invoices
        $companyScope = $this->resolveCompanyScope();
        if ($companyScope !== null) {
            $clientIds = Invoice::where('host_id', $hostId)
                ->where('company_id', $companyScope)
                ->whereNotNull('client_id')
                ->pluck('client_id')
                ->unique()
                ->values()
                ->toArray();
            $query->whereIn('id', $clientIds);
        }

        // Allow seeing team-specific and company-wide clients
        if ($teamId) {
            $query->where(function ($q) use ($teamId) {
                $q->where('team_id', $teamId)
                  ->orWhereNull('team_id');
            });
        }

        return $query->get(['id', 'name', 'email', 'telephone', 'address', 'address_no', 'address_street', 'address_city', 'address_town', 'address_postcode', 'address_county', 'address_country', 'client_type', 'company_registration_number', 'vat_number', 'utr'])->toArray();
    }

    public function getAllInvoiceTypes(): array
    {
        return InvoiceType::all(['id', 'name'])->toArray();
    }

    public function generateInvoiceCode(int $hostId)
    {
        // Get latest invoice for this host
        $latestInvoice = Invoice::where('host_id', $hostId)
            ->orderByDesc('id')
            ->first();

        // Default invoice number
        $nextNumber = 1;

        // Match the last 4 digits from codes like: INV-01-0001
        if ($latestInvoice && preg_match('/INV-0' . $hostId . '-(\d{4})/', $latestInvoice->code, $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        }

        // Return invoice code e.g. INV-01-0001
        return 'INV-0' . $hostId . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    public function findById(int $id)
    {
        return $this->scopedInvoiceQuery()->findOrFail($id);
    }

    public function store(array $data)
    {
        $hostId = $this->resolveWritableHostId($data);
        $companyRef = $this->resolveWritableCompanyReference($data, $hostId);
        $bankSnapshot = $this->resolveContextBankSnapshot($hostId, $companyRef);

        // If context snapshot is empty, fall back to inline bank fields submitted with the request.
        // This handles company accounts that have no saved bank record but filled in details on the form.
        if (empty($bankSnapshot['account_name']) && empty($bankSnapshot['account_number']) && empty($bankSnapshot['sort_code'])) {
            $inlineName   = trim((string) ($data['account_name']   ?? ''));
            $inlineNumber = trim((string) ($data['account_number'] ?? ''));
            $inlineCode   = trim((string) ($data['sort_code']      ?? ''));
            if ($inlineName || $inlineNumber || $inlineCode) {
                $bankSnapshot = [
                    'account_name'   => $inlineName   ?: null,
                    'account_number' => $inlineNumber ?: null,
                    'sort_code'      => $inlineCode   ?: null,
                ];
            }
        }

        $pdfFieldVisibility = $this->normalizePdfFieldVisibility($data['pdf_field_visibility'] ?? null);

        return DB::transaction(function () use ($data, $hostId, $companyRef, $pdfFieldVisibility, $bankSnapshot) {
            $clientName = null;
            if (!empty($data['client_id'])) {
                $client = InvoiceClient::findOrFail($data['client_id']);
                $clientName = $client->name;
            }
            // ✅ Create main invoice record
            // Use provided invoice_code if supplied and not empty, otherwise generate next sequential number
            $invoiceCode = !empty($data['invoice_code']) 
                ? trim((string) $data['invoice_code']) 
                : $this->generateInvoiceCode($hostId);
            
            $invoice = Invoice::create([
                'host_id' => $hostId, // DEF_113: Single source of tenant truth
                'company_id' => $companyRef,
                'team_id' => \App\Models\Team::where('host_id', $hostId)->value('id'),
                'client_id' => $data['client_id'],
                'code' => $invoiceCode,
                'client_name' => $clientName ?? null,
                'type_id' => $data['type_id'] ?? null,
                'pdf_type' => $data['pdf_type'] ?? 'classic',
                'status' => $data['status'] ?? 'Created',
                'invoice_date' => $data['invoice_date'],
                'due_date' => $data['due_date'] ?? null,
                'total_discount' => (float) ($data['total_discount'] ?? 0),
                'total_vat' => (float) ($data['total_vat'] ?? 0),
                'total_amount' => (float) ($data['total_amount'] ?? 0),
                'final_amount' => (float) ($data['final_amount'] ?? 0),
                'created_by' => Auth::id(),
                'quotation_title' => $data['quotation_title'] ?? '',
                'quotation_content' => $data['quotation_content'] ?? '',
                'payment_link' => $data['payment_link'] ?? false,
                'bank_payment' => $data['bank_payment'] ?? false,
                'account_name' => $bankSnapshot['account_name'],
                'account_number' => $bankSnapshot['account_number'],
                'sort_code' => $bankSnapshot['sort_code'],
                'cis_tax' => $data['cis_tax'] ?? null,
                'client_utr' => $data['client_utr'] ?? null,
                'cis_enabled' => $data['cis_enabled'] ?? false,
                'pdf_field_visibility' => $pdfFieldVisibility,
                'notes' => $data['notes'] ?? null,
                'company_address' => $data['company_address'] ?? null,
            ]);

            // ✅ Save multiple invoice items
            $this->saveInvoiceItems($invoice, $data['items'] ?? []);

            // ✅ Generate and attach PDF
            $this->generateAndAttachPDF($invoice);

            return $invoice->fresh(['client', 'user', 'items']);
        });
    }

    public function storeDraft(array $data)
    {
        $hostId = $this->resolveWritableHostId($data);
        $companyRef = $this->resolveWritableCompanyReference($data, $hostId);
        $pdfFieldVisibility = $this->normalizePdfFieldVisibility($data['pdf_field_visibility'] ?? null);

        return DB::transaction(function () use ($data, $hostId, $companyRef, $pdfFieldVisibility) {
            $clientName = null;
            if (!empty($data['client_id'])) {
                $client = InvoiceClient::findOrFail($data['client_id']);
                $clientName = $client->name;
            }
            // Create draft invoice (minimal required data)
            $invoice = Invoice::create([
                'host_id' => $hostId, // DEF_113: Single source of tenant truth
                'company_id' => $companyRef,
                'team_id' => \App\Models\Team::where('host_id', $hostId)->value('id'),

                // nullable fields for draft
                'client_id' => $data['client_id'] ?? null,
                'code' => $data['invoice_code'] ?? null,
                'type_id' => $data['type_id'] ?? null,
                'pdf_type' => $data['pdf_type'] ?? 'classic',
                'client_name' => $clientName ?? null,
                // force Draft
                'status' => 'Draft',

                'invoice_date' => $data['invoice_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,

                'cis_enabled' => $data['cis_enabled'] ?? false,

                'cis_tax' => $data['cis_tax'] ?? null,
                'client_utr' => $data['client_utr'] ?? null,
                // 'cis_enabled' => $data['cis_enabled'] ?? false,

                // totals default to 0
                'total_discount' => (float) ($data['total_discount'] ?? 0),
                'total_vat' => (float) ($data['total_vat'] ?? 0),
                'total_amount' => (float) ($data['total_amount'] ?? 0),
                'final_amount' => (float) ($data['final_amount'] ?? 0),

                'created_by' => Auth::id(),
                'quotation_title' => $data['quotation_title'] ?? '',
                'quotation_content' => $data['quotation_content'] ?? '',
                'pdf_field_visibility' => $pdfFieldVisibility,
            ]);

            // Save items ONLY if provided
            if (!empty($data['items']) && is_array($data['items'])) {
                $this->saveInvoiceItems($invoice, $data['items']);
            }
            return $invoice->fresh(['client', 'user', 'items']);
        });
    }

    /**
     * ✅ Save or update invoice items (used for both store & update)
     */
    protected function saveInvoiceItems(Invoice $invoice, array $items)
    {
        Log::info('Saving invoice items', ['items' => $items]);
        // Always clear existing items before saving new ones (for updates)
        $invoice->items()->delete();

        // Ensure the items array is properly formatted
        if (empty($items) || ! is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            // Each item should be an array, skip invalid entries
            if (! is_array($item)) {
                continue;
            }

            $customFields = [];
            $incomingCustomFields = $item['custom_fields'] ?? null;
            if (is_string($incomingCustomFields)) {
                $decoded = json_decode($incomingCustomFields, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $incomingCustomFields = $decoded;
                }
            }

            if (!empty($incomingCustomFields) && is_array($incomingCustomFields)) {
                foreach ($incomingCustomFields as $field) {
                    if (!is_array($field)) {
                        continue;
                    }

                    $customFields[] = [
                        'key' => isset($field['key']) ? (string) $field['key'] : '',
                        'value' => isset($field['value']) ? (string) $field['value'] : '',
                    ];
                }
            }

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'item_name' => $item['name'] ?? 'N/A',
                'project_reference' => $item['project_reference'] ?? null,
                'custom_fields' => $customFields ?: null,

                'type' => $item['type'] ?? 'service',
                'item_currency' => $item['currency'] ?? 'GBP',
                'item_price' => isset($item['price']) ? (float) $item['price'] : 0,
                'item_quantity' => isset($item['quantity']) ? (float) $item['quantity'] : 1,
                'item_discount' => isset($item['discount']) ? (float) $item['discount'] : 0,
                'item_discount_value' => isset($item['discount_value']) ? (float) $item['discount_value'] : 0,
                'item_vat' => isset($item['vat']) ? (float) $item['vat'] : 0,
                'item_vat_value' => isset($item['vat_value']) ? (float) $item['vat_value'] : 0,
                'item_final_price' => isset($item['total_amount']) ? (float) $item['total_amount'] : 0,
            ]);
        }
    }

    /**
     * Generate and attach invoice PDF
     */
    protected function generateAndAttachPDF(Invoice $invoice)
    {
        try {
            $pdfContent = $this->printPDF($invoice->fresh(['client', 'items']), 0);
            $filename = "invoice_{$invoice->code}.pdf";
            $path = "invoices/{$filename}";

            if ($invoice->pdf_file && Storage::disk('public')->exists($invoice->pdf_file)) {
                Storage::disk('public')->delete($invoice->pdf_file);
            }

            Storage::disk('public')->put($path, $pdfContent);

            $invoice->forceFill(['pdf_file' => $path])->save();
        } catch (Throwable $e) {
            Log::error('PDF Generation Failed: ' . $e->getMessage());
        }
    }

    /**
     * Print invoice as PDF
     */
    private function printPDF(Invoice $invoice, int $preview = 0)
    {
        $billingUser = null;
        $pdfHostId = (int) ($invoice->host_id ?? $invoice->company_id ?? 0);
        if ($pdfHostId > 0) {
            $billingUser = InvoiceUser::primaryBillingUserForHost($pdfHostId);
        }
        if (!$billingUser) {
            $billingUser = $invoice->relationLoaded('user')
                ? $invoice->getRelation('user')
                : $invoice->user()->first();
        }
        $invoice->setRelation('user', $billingUser ?? auth()->user());
        $invoice->user = $invoice->created_by ?? 'System'; // Default fallback

        switch ($invoice->pdf_type) {
            case 'classic':
                $pdf = Pdf::loadView('invoice::pdf.template_classic', [
                    'invoice' => $invoice,
                    'pdfUser' => $invoice->user,
                ]);
                break;

            case 'minimal':
                $pdf = Pdf::loadView('invoice::pdf.template_minimal', [
                    'invoice' => $invoice,
                    'pdfUser' => $invoice->user,
                ]);
                break;

            case 'modern':
                $pdf = Pdf::loadView('invoice::pdf.template_modern', [
                    'invoice' => $invoice,
                    'pdfUser' => $invoice->user,
                ]);
                break;

            case 'modern1':
                $pdf = Pdf::loadView('invoice::pdf.template_modern1', [
                    'invoice' => $invoice,
                    'pdfUser' => $invoice->user,
                ]);
                break;

            default:
                $pdf = Pdf::loadView('invoice::pdf.general', [
                    'invoice' => $invoice,
                    'pdfUser' => $invoice->user,
                ]);
                break;
        }

        $pdf->setOption(['isFontSubSettingEnabled' => true])
            ->setPaper('a4', 'portrait');

        if ($preview) {
            return $pdf->stream($invoice->code . '.pdf');
        }

        return $pdf->output();
    }

    /**
     * Update existing invoice
     */
    public function update(int $id, array $data)
    {
        $hostId = $this->resolveWritableHostId($data);
        $companyRef = $this->resolveWritableCompanyReference($data, $hostId);
        $invoice = $this->scopedInvoiceQuery()->findOrFail($id);
        $pdfFieldVisibility = array_key_exists('pdf_field_visibility', $data)
            ? $this->normalizePdfFieldVisibility($data['pdf_field_visibility'])
            : $invoice->pdf_field_visibility;
        $bankPaymentEnabled = array_key_exists('bank_payment', $data)
            ? (bool) $data['bank_payment']
            : (bool) $invoice->bank_payment;
        $bankSnapshot = $bankPaymentEnabled
            ? $this->resolveContextBankSnapshot($hostId, $companyRef)
            : ['account_name' => null, 'account_number' => null, 'sort_code' => null];

        // Fall back to inline bank fields submitted with the request when snapshot is empty.
        if ($bankPaymentEnabled && empty($bankSnapshot['account_name']) && empty($bankSnapshot['account_number']) && empty($bankSnapshot['sort_code'])) {
            $inlineName   = trim((string) ($data['account_name']   ?? ''));
            $inlineNumber = trim((string) ($data['account_number'] ?? ''));
            $inlineCode   = trim((string) ($data['sort_code']      ?? ''));
            if ($inlineName || $inlineNumber || $inlineCode) {
                $bankSnapshot = [
                    'account_name'   => $inlineName   ?: null,
                    'account_number' => $inlineNumber ?: null,
                    'sort_code'      => $inlineCode   ?: null,
                ];
            }
        }

        return DB::transaction(function () use ($data, $hostId, $companyRef, $invoice, $pdfFieldVisibility, $bankSnapshot) {
            $clientName = null;
            if (!empty($data['client_id'])) {
                $client = InvoiceClient::findOrFail($data['client_id']);
                $clientName = $client->name;
            }
            // ✅ Update invoice main fields
            // Allow code updates, respecting user-provided changes
            $invoice->update([
                'host_id' => $hostId, // DEF_113: Single source of tenant truth
                'company_id' => $companyRef,
                'client_id' => $data['client_id'] ?? $invoice->client_id,
                'client_name' => $clientName,
                // Allow code to be updated if provided, otherwise keep existing
                'code' => !empty($data['invoice_code']) 
                    ? trim((string) $data['invoice_code']) 
                    : ($data['code'] ?? $invoice->code),
                'type_id' => $data['type_id'] ?? $invoice->type_id,
                'pdf_type' => $data['pdf_type'] ?? $invoice->pdf_type,
                'status' => $data['status'] ?? $invoice->status,
                'invoice_date' => $data['invoice_date'] ?? $invoice->invoice_date,
                'due_date' => $data['due_date'] ?? $invoice->due_date,
                'total_amount' => (float) ($data['total_amount'] ?? $invoice->total_amount),
                'total_vat' => (float) ($data['total_vat'] ?? $invoice->total_vat),
                'total_discount' => (float) ($data['total_discount'] ?? $invoice->total_discount),
                'final_amount' => (float) ($data['final_amount'] ?? $invoice->final_amount),
                'updated_by' => 1, // Default fallback
                'quotation_title' => $data['quotation_title'] ?? "",
                'quotation_content' => $data['quotation_content'] ?? "",

                'cis_enabled' => $data['cis_enabled'] ?? false,
                'cis_tax' => $data['cis_tax'] ?? null,
                'client_utr' => $data['client_utr'] ?? null,

                'notes' => $data['notes'] ?? null,
                'payment_link' => array_key_exists('payment_link', $data)
                    ? (bool) $data['payment_link']
                    : (bool) $invoice->payment_link,
                'bank_payment' => array_key_exists('bank_payment', $data)
                    ? (bool) $data['bank_payment']
                    : (bool) $invoice->bank_payment,
                'account_name' => $bankSnapshot['account_name'],
                'account_number' => $bankSnapshot['account_number'],
                'sort_code' => $bankSnapshot['sort_code'],
                'pdf_field_visibility' => $pdfFieldVisibility,
                'company_address' => array_key_exists('company_address', $data)
                    ? $data['company_address']
                    : $invoice->company_address,

            ]);

            // ✅ Update invoice items if provided
            $this->saveInvoiceItems($invoice, $data['items'] ?? []);

            // ✅ Regenerate PDF
            $this->generateAndAttachPDF($invoice);

            return $invoice->fresh(['client', 'user', 'items']);
        });
    }

    public function updateDraft(int $id, array $data)
    {
        $hostId = $this->resolveWritableHostId($data);
        $companyRef = $this->resolveWritableCompanyReference($data, $hostId);

        $invoice = $this->scopedInvoiceQuery()->findOrFail($id);
        $pdfFieldVisibility = array_key_exists('pdf_field_visibility', $data)
            ? $this->normalizePdfFieldVisibility($data['pdf_field_visibility'])
            : $invoice->pdf_field_visibility;

        return DB::transaction(function () use ($data, $hostId, $companyRef, $invoice, $pdfFieldVisibility) {
            $clientName = null;
            if (!empty($data['client_id'])) {
                $client = InvoiceClient::findOrFail($data['client_id']);
                $clientName = $client->name;
            }
            $updateData = [
                'host_id' => $hostId, // DEF_113: Single source of tenant truth
                'company_id' => $companyRef,
                'client_id'        => $data['client_id'] ?? null,
                'client_name'      => $clientName,
                'code'             => $data['invoice_code'] ?? null,
                'type_id'          => $data['type_id'] ?? null,
                'pdf_type'         => $data['pdf_type'] ?? null,
                'status'           => $data['status'] ?? null,
                'invoice_date'     => $data['invoice_date'] ?? null,
                'due_date'         => $data['due_date'] ?? null,
                'total_amount'     => isset($data['total_amount']) ? (float) $data['total_amount'] : null,
                'total_vat'        => isset($data['total_vat']) ? (float) $data['total_vat'] : null,
                'total_discount'   => isset($data['total_discount']) ? (float) $data['total_discount'] : null,
                'final_amount'     => isset($data['final_amount']) ? (float) $data['final_amount'] : null,
                'quotation_title'  => $data['quotation_title'] ?? null,
                'quotation_content' => $data['quotation_content'] ?? null,
                'updated_by'       => auth()->id(),
                'pdf_field_visibility' => $pdfFieldVisibility,


                'cis_enabled' => $data['cis_enabled'] ?? false,
                'cis_tax' => $data['cis_tax'] ?? null,
                'client_utr' => $data['client_utr'] ?? null,
            ];

            $invoice->update($updateData);
            if (array_key_exists('items', $data)) {
                $this->saveInvoiceItems($invoice, $data['items'] ?? []);
            } else {
                $this->deleteInvoiceItems($invoice);
            }

            if (($invoice->status ?? null) !== 'Draft') {
                $this->generateAndAttachPDF($invoice);
            }

            return $invoice->fresh(['client', 'user', 'items']);
        });
    }

    public function getInvoiceById(int $id, array $filters = [])
    {
        return $this->scopedInvoiceQuery($filters)->findOrFail($id);
    }

    public function updateInvoiceStatus(int $id, string $status)
    {
        $invoice = $this->scopedInvoiceQuery()->find($id);
        if (! $invoice) {
            throw new \Exception("Invoice with ID {$id} not found for status update.", 404);
        }
        $invoice->status = $status;
        $invoice->save();

        return $invoice;
    }

    public function previewStore(array $data)
    {
        $invoiceItems = [];
        $pdfFieldVisibility = $this->normalizePdfFieldVisibility($data['pdf_field_visibility'] ?? null);
        $invoice = new $this->_invoice([
            'code' => $data['invoice_code'],
            'property_id' => $data['property_id'],
            'company_id' => $data['company_id'],
            'client_id' => $data['client_id'],
            'type_id' => $data['type_id'],
            'invoice_date' => $data['invoice_date'],
            'due_date' => $data['due_date'],
            'total_amount' => $data['total_amount'],
            'total_vat' => $data['total_vat'],
            'total_discount' => $data['total_discount'],
            'final_amount' => $data['final_amount'],
            'created_by' => $data['created_by'],
            'pdf_field_visibility' => $pdfFieldVisibility,
            'company_address' => $data['company_address'] ?? null,
        ]);

        foreach ($data['products'] as $key => $value) {
            $invoiceItem = new $this->_invoiceItem([
                'item_name' => $value['name'],
                'type' => $value['type'],
                'item_currency' => $value['currency'] ?? 'GBP',
                'item_price' => $value['price'],
                'item_quantity' => $value['quantity'],
                'item_discount' => $value['discount'],
                'item_discount_value' => $value['discount_value'],
                'item_vat' => $value['vat'],
                'item_vat_value' => $value['vat_value'],
                'item_final_price' => $value['total_amount'],
                'custom_fields' => $value['custom_fields'] ?? null,
            ]);

            array_push($invoiceItems, $invoiceItem);
        }

        foreach ($data['services'] as $key => $value) {
            $invoiceItem = new $this->_invoiceItem([
                'invoice_id' => $invoice->id,
                'item_name' => $value['name'],
                'type' => $value['type'],
                'item_currency' => $value['currency'] ?? 'GBP',
                'item_price' => $value['price'],
                'item_quantity' => $value['quantity'],
                'item_discount' => $value['discount'],
                'item_discount_value' => $value['discount_value'],
                'item_vat' => $value['vat'],
                'item_vat_value' => $value['vat_value'],
                'item_final_price' => $value['total_amount'],
                'custom_fields' => $value['custom_fields'] ?? null,
            ]);
            array_push($invoiceItems, $invoiceItem);
        }

        foreach ($data['cleaning_fee'] as $key => $value) {
            $invoiceItem = new $this->_invoiceItem([
                'invoice_id' => $invoice->id,
                'item_name' => $value['name'],
                'type' => $value['type'],
                'item_currency' => $value['currency'] ?? 'GBP',
                'item_price' => $value['price'],
                'item_quantity' => $value['quantity'],
                'item_discount' => $value['discount'],
                'item_discount_value' => $value['discount_value'],
                'item_vat' => $value['vat'],
                'item_vat_value' => $value['vat_value'],
                'item_final_price' => $value['total_amount'],
                'custom_fields' => $value['custom_fields'] ?? null,
            ]);
            array_push($invoiceItems, $invoiceItem);
        }

        $invoice->setRelation('items', collect($invoiceItems));

        return $invoice;
    }

    protected function deleteInvoiceItems(Invoice $invoice)
    {

        $invoice->items()->delete();
    }

    /**
     * Unified invoice visibility scope for all invoice endpoints.
     * Rule: same company always, plus same team or company-wide records.
     */
    private function scopedInvoiceQuery(array $filters = [])
    {
        $hostId = $this->resolveActiveHostId($filters);
        $teamId = \App\Models\Team::where('host_id', $hostId)->value('id');

        $query = Invoice::with(['client', 'user', 'items'])
            ->where('host_id', $hostId); // DEF_113: Use host_id for tenancy

        // Sub-user company scoping: only see data for their assigned company
        $companyScope = $this->resolveCompanyScope();
        if ($companyScope !== null) {
            $query->where('company_id', $companyScope);
        }

        if ($teamId) {
            $query->where(function ($q) use ($teamId) {
                $q->where('team_id', $teamId)
                    ->orWhereNull('team_id');
            });
        }

        return $query;
    }

    private function normalizePdfFieldVisibility(mixed $value): ?array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $value = $decoded;
            }
        }

        if (!is_array($value)) {
            return null;
        }

        $normalized = [];
        foreach (['project_reference', 'quantity', 'price', 'discount', 'vat', 'total'] as $baseKey) {
            if (array_key_exists($baseKey, $value)) {
                $normalized[$baseKey] = (bool) $value[$baseKey];
            }
        }

        if (isset($value['custom_fields']) && is_array($value['custom_fields'])) {
            $normalizedCustomFields = [];
            foreach ($value['custom_fields'] as $key => $visible) {
                $trimmedKey = trim((string) $key);
                if ($trimmedKey === '') {
                    continue;
                }
                $normalizedCustomFields[$trimmedKey] = (bool) $visible;
            }
            $normalized['custom_fields'] = $normalizedCustomFields;
        }

        return $normalized;
    }

    private function resolveContextBankSnapshot(int $hostId, int $companyRef): array
    {
        $empty = ['account_name' => null, 'account_number' => null, 'sort_code' => null];

        $extract = function ($record) use ($empty): array {
            return [
                'account_name' => $record->account_name ?? null,
                'account_number' => $record->account_number ?? null,
                'sort_code' => $record->sort_code ?? null,
            ];
        };

        // Rootless super-admin: use their own bank directly so the correct details are saved.
        $authUserObj = \Illuminate\Support\Facades\Auth::user();
        if ($authUserObj && is_null($authUserObj->host_id)) {
            $authUserId = (int) $authUserObj->id;
            if ($authUserId > 0) {
                $authBank = UserBank::query()
                    ->where('user_id', $authUserId)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($authBank)) {
                    return $extract($authBank);
                }
            }
            return $empty;
        }

        if ($hostId > 0) {
            // Try per-company bank details first (company_id match)
            $companyBank = $this->_invoiceCompany->newQuery()
                ->where('host_id', $hostId)
                ->where('company_id', $companyRef)
                ->first(['account_name', 'account_number', 'sort_code']);
            if ($this->hasAnyBankValue($companyBank)) {
                return $extract($companyBank);
            }

            // Fallback: host-level bank details (no company_id or company_id is null)
            $companyBank = $this->_invoiceCompany->newQuery()
                ->where('host_id', $hostId)
                ->whereNull('company_id')
                ->first(['account_name', 'account_number', 'sort_code']);
            if ($this->hasAnyBankValue($companyBank)) {
                return $extract($companyBank);
            }

            // Fallback: any row for this host
            $companyBank = $this->_invoiceCompany->newQuery()
                ->where('host_id', $hostId)
                ->first(['account_name', 'account_number', 'sort_code']);
            if ($this->hasAnyBankValue($companyBank)) {
                return $extract($companyBank);
            }

            $billingUser = InvoiceUser::primaryBillingUserForHost($hostId);
            if ($billingUser) {
                $billingBank = UserBank::query()
                    ->where('user_id', (int) $billingUser->id)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($billingBank)) {
                    return $extract($billingBank);
                }
            }
        }

        if ($companyRef > 0 && $companyRef !== $hostId) {
            $companyById = Company::query()->where('id', $companyRef)->first();
            $mappedHostId = (int) ($companyById?->host_id ?? $companyRef);
            if ($mappedHostId > 0) {
                $companyBank = $this->_invoiceCompany->newQuery()
                    ->where('host_id', $mappedHostId)
                    ->where('company_id', $companyRef)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($companyBank)) {
                    return $extract($companyBank);
                }

                $companyBank = $this->_invoiceCompany->newQuery()
                    ->where('host_id', $mappedHostId)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($companyBank)) {
                    return $extract($companyBank);
                }
            }
        }

        // Last resort: auth user's own personal bank — ONLY for personal-context invoices.
        // For company invoices (hostId belongs to a company, not the auth user's personal host),
        // do NOT fall back to personal bank — return empty so the invoice stores no bank snapshot.
        $authUserFallback = \Illuminate\Support\Facades\Auth::user();
        $isPersonalContextInvoice = $authUserFallback
            && (int) ($authUserFallback->host_id ?? 0) === $hostId;
        if ($isPersonalContextInvoice) {
            $authUserId = (int) $authUserFallback->id;
            if ($authUserId > 0) {
                $authBank = UserBank::query()
                    ->where('user_id', $authUserId)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($authBank)) {
                    return $extract($authBank);
                }
            }
        }

        return $empty;
    }

    private function hasAnyBankValue($bank): bool
    {
        return (bool) ($bank && (
            !empty($bank->account_name)
            || !empty($bank->account_number)
            || !empty($bank->sort_code)
        ));
    }
}
