@php
    use Carbon\Carbon;
    use App\Models\HostUserDetail;
    use App\Models\UserStripeFeeSetting;
    use App\Models\Host;

    $pdfThemeUser = $invoice->user ?? auth()->user();
    $pdfAuthUser = auth()->user();
    $pdfIsRootless = is_null($pdfAuthUser?->host_id);
    $pdfHostId = (int) ($invoice->host_id ?? 0);
    if ($pdfHostId <= 0 && !empty($invoice->company_id)) {
        $companyHostId = (int) (\App\Models\Company::query()
            ->where('id', (int) $invoice->company_id)
            ->value('host_id') ?? 0);
        if ($companyHostId > 0) {
            $pdfHostId = $companyHostId;
        }
    }
    if ($pdfHostId <= 0) {
        $pdfHostId = (int) ($pdfThemeUser?->host_id ?? 0);
    }
    // Super-admin (rootless) fallback: resolve to first real host when host_id is still 0.
    if ($pdfHostId <= 0 && $pdfIsRootless) {
        $pdfHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
    }
    $pdfHost = $pdfHostId > 0 ? \App\Models\Host::find($pdfHostId) : null;
    $themeColor = $pdfHost?->invoice_theme_color ?? $pdfThemeUser?->invoice_theme_color ?? auth()->user()?->invoice_theme_color ?? '#1e88e5';

    // Title: keep normal title casing
    $isCIS = (bool) ($invoice->cis_enabled ?? false);
    $invoiceTypeName = $isCIS
        ? 'Invoice'
        : ucwords(strtolower((string) ($invoice->type->name ?? 'Invoice')));

    $companyNameRaw = $pdfHostId > 0
        ? HostUserDetail::where('host_id', $pdfHostId)
            ->where('type', 'company_details')
            ->where('name', 'company_name')
            ->value('values')
        : null;
    $companyName = is_string($companyNameRaw) ? trim($companyNameRaw) : '';
    if (strcasecmp($companyName, 'null') === 0) {
        $companyName = '';
    }
    $hasInvoicePdfCompanyName = $companyName !== '';

    $companyAddressRaw =
        $invoice->company_address ??
        ($pdfHostId > 0
            ? HostUserDetail::where('host_id', $pdfHostId)
                ->where('type', 'company_details')
                ->whereIn('name', ['address', 'company_address'])
                ->value('values') ?? ''
            : '');
    if (is_string($companyAddressRaw) && strcasecmp(trim($companyAddressRaw), 'null') === 0) {
        $companyAddressRaw = '';
    }
    $companyAddressLines = [];
    foreach (preg_split('/[\r\n,]+/', (string) $companyAddressRaw) ?: [] as $line) {
        $line = trim((string) $line);
        if ($line !== '') {
            $companyAddressLines[] = $line;
        }
    }
    if (empty($companyAddressLines) && $pdfHostId > 0) {
        $invoiceCompanyRow = \Modules\Invoice\Models\InvoiceCompany::query()
            ->where('host_id', $pdfHostId)
            ->when($invoice->company_id, fn ($q) => $q->where('company_id', $invoice->company_id))
            ->first(['address_no', 'address_street', 'address_city', 'address_town', 'address_county', 'address_postcode', 'address_country', 'address']);
        if ($invoiceCompanyRow) {
            foreach ([
                $invoiceCompanyRow->address_no ?? '',
                $invoiceCompanyRow->address_street ?? '',
                $invoiceCompanyRow->address_city ?? '',
                $invoiceCompanyRow->address_town ?? '',
                $invoiceCompanyRow->address_county ?? '',
                $invoiceCompanyRow->address_postcode ?? '',
                $invoiceCompanyRow->address_country ?? '',
            ] as $part) {
                $part = trim((string) $part);
                if ($part !== '') {
                    $companyAddressLines[] = $part;
                }
            }
            if (empty($companyAddressLines) && !empty($invoiceCompanyRow->address)) {
                foreach (preg_split('/[\r\n,]+/', (string) $invoiceCompanyRow->address) ?: [] as $line) {
                    $line = trim((string) $line);
                    if ($line !== '') {
                        $companyAddressLines[] = $line;
                    }
                }
            }
        }
    }

    $company_image =
        $pdfHostId > 0
            ? HostUserDetail::where('host_id', $pdfHostId)
                ->where('type', 'company_details')
                ->whereIn('name', ['company_logo'])
                // Rootless users (super-admin) share host_id with real hosts; filter by
                // user_id to get their own logo rather than the real host owner's logo.
                ->when($pdfIsRootless && $pdfAuthUser, fn ($q) => $q->where('user_id', $pdfAuthUser->id))
                ->value('files') ?? ''
            : '';

    $personal_image = trim((string) ($pdfThemeUser?->profile_img ?? ''));
    $resolved_logo_image = '';
    if (!empty($company_image) && \Illuminate\Support\Facades\Storage::disk('public')->exists($company_image)) {
        $resolved_logo_image = $company_image;
    }
    // Only use profile_img when billing user's own host matches this invoice's host.
    // Prevents multi-company invoices falling back to creator's personal profile image.
    $pdfUserIsInvoiceOwner = (int) ($pdfThemeUser?->host_id ?? 0) === $pdfHostId;
    if (empty($resolved_logo_image) && $pdfUserIsInvoiceOwner && !empty($personal_image)
        && \Illuminate\Support\Facades\Storage::disk('public')->exists($personal_image)) {
        $resolved_logo_image = $personal_image;
    }
    // Convert to base64 so DomPDF embeds the image reliably (avoids OS path issues).
    $logoBase64 = '';
    if (!empty($resolved_logo_image)) {
        $logoAbsPath = \Illuminate\Support\Facades\Storage::disk('public')->path($resolved_logo_image);
        if (file_exists($logoAbsPath)) {
            $logoContent = @file_get_contents($logoAbsPath);
            if ($logoContent !== false) {
                $logoMime = @mime_content_type($logoAbsPath) ?: 'image/jpeg';
                $logoBase64 = 'data:' . $logoMime . ';base64,' . base64_encode($logoContent);
            }
        }
    }

    // ACCOUNT DETAILS: use invoice snapshot only — no cross-account fallback.
    $accountName = $invoice->account_name ?? '';
    $sortCode = $invoice->sort_code ?? '';
    $accountNumber = $invoice->account_number ?? '';

    // INVOICE
    $code = $invoice->code ?? $code;
    $invoice_date = $invoice->invoice_date ?? now();
    $due_date = $invoice->due_date ?? '';
    $currency = $invoice->items->first()->item_currency ?? 'GBP';

    // CLIENT
    $clientName = $invoice->client->name ?? $clientName;
    $clientEmail = $invoice->client->email ?? $clientEmail;
    // Format client address as line-by-line parts
    $clientAddressLines = [];
    foreach ([
        $invoice->client->address_no ?? '',
        $invoice->client->address_street ?? '',
        $invoice->client->address_city ?? '',
        $invoice->client->address_town ?? '',
        $invoice->client->address_county ?? '',
        $invoice->client->address_postcode ?? '',
        $invoice->client->address_country ?? '',
    ] as $part) {
        $part = trim((string) $part);
        if ($part !== '') {
            $clientAddressLines[] = $part;
        }
    }
    if (empty($clientAddressLines) && !empty($invoice->client->address)) {
        $clientAddressLines = preg_split('/[\n,]+/', (string) $invoice->client->address);
        $clientAddressLines = array_values(array_filter(array_map('trim', $clientAddressLines), fn ($line) => $line !== ''));
    }

    // ITEMS
    $items = ($invoice->items ?? ($items ?? collect()))
        ->sort(function ($a, $b) {
            return strnatcasecmp($a->item_name, $b->item_name);
        })
        ->values();
    $rawPdfFieldVisibility = $invoice->pdf_field_visibility ?? [];
    if (is_string($rawPdfFieldVisibility)) {
        $decodedPdfFieldVisibility = json_decode($rawPdfFieldVisibility, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $rawPdfFieldVisibility = $decodedPdfFieldVisibility;
        }
    }
    $pdfFieldVisibility = is_array($rawPdfFieldVisibility) ? $rawPdfFieldVisibility : [];
    $showProjectReference = array_key_exists('project_reference', $pdfFieldVisibility) ? (bool) $pdfFieldVisibility['project_reference'] : true;
    $showQuantity = array_key_exists('quantity', $pdfFieldVisibility) ? (bool) $pdfFieldVisibility['quantity'] : true;
    $showPrice = array_key_exists('price', $pdfFieldVisibility) ? (bool) $pdfFieldVisibility['price'] : true;
    $showDiscount = array_key_exists('discount', $pdfFieldVisibility) ? (bool) $pdfFieldVisibility['discount'] : true;
    $showVat = array_key_exists('vat', $pdfFieldVisibility) ? (bool) $pdfFieldVisibility['vat'] : true;
    $showTotal = array_key_exists('total', $pdfFieldVisibility) ? (bool) $pdfFieldVisibility['total'] : true;
    $customFieldVisibilityConfig = is_array($pdfFieldVisibility['custom_fields'] ?? null)
        ? $pdfFieldVisibility['custom_fields']
        : null;
    $hasCustomFieldVisibilityConfig = is_array($customFieldVisibilityConfig);
    $visibleCustomFieldKeys = [];
    if ($hasCustomFieldVisibilityConfig) {
        foreach ($customFieldVisibilityConfig as $visibilityKey => $isVisible) {
            $normalizedVisibilityKey = strtolower(trim((string) $visibilityKey));
            if ($normalizedVisibilityKey === '') {
                continue;
            }
            if ((bool) $isVisible) {
                $visibleCustomFieldKeys[$normalizedVisibilityKey] = true;
            }
        }
    }
    $customFieldColumns = [];
    $customFieldColumnLookup = [];
    foreach ($items as $item) {
        $rawFields = $item->custom_fields ?? [];
        if (!is_array($rawFields)) {
            continue;
        }
        foreach ($rawFields as $field) {
            $fieldData = is_array($field) ? $field : (array) $field;
            $key = trim((string) ($fieldData['key'] ?? ''));
            if ($key === '') {
                continue;
            }
            $normalizedKey = strtolower($key);
            if ($hasCustomFieldVisibilityConfig && !array_key_exists($normalizedKey, $visibleCustomFieldKeys)) {
                continue;
            }
            if (!array_key_exists($normalizedKey, $customFieldColumnLookup)) {
                $customFieldColumnLookup[$normalizedKey] = true;
                $customFieldColumns[] = $key;
            }
        }
    }
    $renderCustomFieldColumns = count($customFieldColumns) > 0 && count($customFieldColumns) <= 2;
    $customFieldColumnCount = $renderCustomFieldColumns ? count($customFieldColumns) : 0;

    // CALCULATE TOTAL
    $final_amount = $invoice->final_amount ?? $final_amount;
    $total_amount = (float) ($invoice->total_amount ?? 0);
    $total_discount = (float) ($invoice->total_discount ?? 0);
    $total_vat = (float) ($invoice->total_vat ?? 0);
    // Verify: if breakdown doesn't add up, recalculate from items
    $calculatedFinal = $total_amount - $total_discount + $total_vat;
    if (abs($calculatedFinal - $final_amount) > 0.01 && $items->count() > 0) {
        $final_amount = round($calculatedFinal, 2);
    }
    $showBreakdown = ($total_discount > 0 || $total_vat > 0);

    // HELPER FUNCTIONS
    function formatCurrency($amount, $currency = 'GBP')
    {
        return number_format((float) $amount, 2) . ' ' . $currency;
    }

    function formatDate($date)
    {
        return $date ? \Carbon\Carbon::parse($date)->format('d/m/Y') : '-';
    }

    // QUOTATION
    $quotationTitle = $invoice->quotation_title ?? null;
    $quotationContent = $invoice->quotation_content ?? null;

    // ── CIS CALCULATION ──────────────────────────────────────────────

    // (already set above)
    $cisRateValue = !empty($invoice->cis_tax) && $invoice->cis_tax > 0 ? (float) $invoice->cis_tax : 20; // default 20%
    $cisRateDecimal = $cisRateValue / 100;

    $cisTax = $isCIS ? round($final_amount * $cisRateDecimal, 2) : 0;
    $cisNet = $isCIS ? round($final_amount - $cisTax, 2) : $final_amount;
    $clientUtr = $isCIS ? $invoice->client_utr ?? '' : '';

    // STRIPE CALCULATION
    $userStripeFee = \App\Models\UserStripeFeeSetting::where('user_id', $invoice->user?->id ?? auth()->id())->first();
    $percentage = $userStripeFee?->stripe_fee_percentage ?? 0;
    $fixedFee = $userStripeFee?->stripe_fixed_fee ?? 0;

    $netAmount = $cisNet;
    $percentageDecimal = $percentage / 100;

    if ($percentage > 0 || $fixedFee > 0) {
        $grossAmount = ($netAmount + $fixedFee) / (1 - $percentageDecimal);
    } else {
        $grossAmount = $netAmount;
    }

    $grossAmount = round($grossAmount, 2);
    $stripeFeeAmount = round($grossAmount - $netAmount, 2);
@endphp



<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $hasInvoicePdfCompanyName ? $companyName.' | ' : '' }}Invoice {{ $code }}</title>
    <style>
        /* This is a Laravel Blade template - Blade syntax is valid and will be rendered by Laravel */
        :root {
            --theme-color: {{ $themeColor }};
        }

        body {
            font-family: DejaVu Sans, Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #000;
            margin: 0;
            padding: 0;
        }

        .page {
            width: 740px;
            margin: 0 auto;
            padding: 30px 10px 30px 10px;
            position: relative;
            min-height: 100vh;
        }

        .invoice-title {
            font-size: 42px;
            font-weight: 800;
            color: var(--theme-color);
            margin-bottom: 14px;
        }

        .company-block,
        .account-block {
            line-height: 1.6;
            margin-bottom: 14px;
        }

        .label {
            font-weight: 700;
            color: var(--theme-color);
            margin-bottom: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        .meta td {
            padding: 3px 0;
            font-size: 13px;
            vertical-align: middle;
        }

        .meta strong {
            color: var(--theme-color);
            padding-right: 8px;
        }

        /* ITEMS TABLE */
        .items {
            padding-right: 10px;
        }

        .items th {
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 2px solid var(--theme-color);
        }

        .items td {
            border-bottom: 1px solid #ddd;
            padding: 8px 6px;
        }

        /* COLUMN ALIGNMENTS */
        .qty {
            text-align: center;
            vertical-align: middle;
        }

        .description {
            text-align: left;
            vertical-align: middle;
        }

        .unit-price,
        .amount {
            text-align: right;
        }

        /* TOTAL ROW */
        .total-row td {
            font-weight: 700;
            padding-top: 12px;
        }

        .total-word {
            color: var(--theme-color);
            font-weight: bold;
            text-align: right;
        }

        .total-amount {
            color: var(--theme-color);
            font-weight: bold;
            font-size: 15px;
            white-space: nowrap;
            text-align: right;
        }

        .btn {
            background: var(--theme-color);
            padding: 8px 10px;
            color: white;
            font-size: 12px;
            border: 0;
            text-decoration: none;
            border-radius: 4px;
        }

        .btn:hover {
            opacity: 0.8;
        }

        /* FOOTER */
        .footer {
            position: absolute;
            bottom: 30px;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 12px;
            color: #666;
        }

        .footer .thank-you {
            font-family: 'Brush Script MT', cursive;
            font-size: 28px;
            color: var(--theme-color);
            margin-bottom: 5px;
        }

        /* PAGE BREAKS */
        .page-break {
            page-break-before: always;
        }

        @page {
            margin: 20px;
        }
    </style>
</head>

<body>

    <!-- PAGE 1 — INVOICE -->
    <div class="page">
        <!-- HEADER -->
        <div class="invoice-title">{{ $invoiceTypeName }}</div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">

            <!-- LEFT: Company Info -->
            <div style="flex: 1 1 auto; max-width: 60%;">
                @if ($hasInvoicePdfCompanyName)
                    <strong style="font-size: 16px;">{{ $companyName }}</strong><br>
                @endif
                @if (!empty($companyAddressLines))
                    @foreach ($companyAddressLines as $line)
                        <span style="font-size: 12px;">{{ trim($line) }}</span><br>
                    @endforeach
                @endif
            </div>

            <!-- RIGHT: Logo -->
            @if (!empty($logoBase64))
                <div style="flex: 0 0 auto; text-align: right; margin-top: -105px; padding-right: 10px;">
                    <img src="{{ $logoBase64 }}" alt="{{ $hasInvoicePdfCompanyName ? $companyName : 'Logo' }}"
                        style="width: 100px; height: 100px; object-fit: contain; display: block; margin-left: auto;">
                </div>
            @endif
        </div>



        @if ($invoice->bank_payment)
            <div class="account-block">
                <strong>Account details</strong><br>
                Account Name: {{ $accountName }}<br>
                Sort Code: {{ $sortCode }}<br>
                Account Number: {{ $accountNumber }}
            </div>
        @endif


        <!-- BILL TO + META -->
        <table>
            <tr>
                <td style="width:60%;">
                    <div class="label">Invoice To</div>
                    Email: {{ $clientEmail }}<br>
                    Company: {{ $clientName }}<br>
                    @if (!empty($clientAddressLines))
                        Address: {{ $clientAddressLines[0] }}<br>
                        @foreach (array_slice($clientAddressLines, 1) as $line)
                            {{ $line }}<br>
                        @endforeach
                    @endif
                </td>
                <td style="width:40%; text-align:right;">
                    <table class="meta">
                        <tr>
                            <td><strong>{{ $invoiceTypeName }} #</strong></td>
                            <td>{{ $code }}</td>
                        </tr>
                        <tr>
                            <td><strong>{{ $invoiceTypeName }} Date</strong></td>
                            <td>{{ formatDate($invoice_date) }}</td>
                        </tr>
                        @if ($due_date != null)
                            <tr>
                                <td><strong>Due Date</strong></td>
                                <td>{{ formatDate($due_date) }}</td>
                            </tr>
                        @endif
                    </table>
                </td>
            </tr>
        </table>

        <br>

        {{-- ── ITEMS TABLE ─────────────────────────────────────────────────────────
             CIS invoices: 3 columns only — Description | Project Ref | Amount
             All other types: original 6-column layout
        ──────────────────────────────────────────────────────────────────────── --}}
        @if ($isCIS)

            {{-- ── CIS: 3-column items table ─────────────────────────────────── --}}
            <table class="items">
                <thead>
                    <tr>
                        @if ($showProjectReference)
                            <th class="description" style="width:28%;">Project Reference</th>
                        @endif
                        <th class="description">Description</th>
                        @if ($renderCustomFieldColumns)
                            @foreach ($customFieldColumns as $customFieldColumn)
                                <th class="description">{{ $customFieldColumn }}</th>
                            @endforeach
                        @endif
                        @if ($showTotal)
                            <th class="amount" style="width:20%;">Amount Claimed</th>
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @forelse($items as $item)
                        @php
                            $itemCustomValues = [];
                            $itemInlineCustomFields = [];
                            $inlineCustomFieldLookup = [];
                            $rawFields = $item->custom_fields ?? [];
                            if (is_array($rawFields)) {
                                foreach ($rawFields as $field) {
                                    $fieldData = is_array($field) ? $field : (array) $field;
                                    $cfKey = trim((string) ($fieldData['key'] ?? ''));
                                    $cfValue = trim((string) ($fieldData['value'] ?? ''));
                                    $normalizedKey = strtolower($cfKey);
                                    if ($cfKey !== '' && $hasCustomFieldVisibilityConfig && !array_key_exists($normalizedKey, $visibleCustomFieldKeys)) {
                                        continue;
                                    }
                                    if ($cfKey !== '' && $cfValue !== '') {
                                        $itemCustomValues[$normalizedKey] = $cfValue;
                                    }
                                    if ($cfKey !== '') {
                                        if (!array_key_exists($normalizedKey, $inlineCustomFieldLookup)) {
                                            $inlineCustomFieldLookup[$normalizedKey] = true;
                                            $itemInlineCustomFields[] = [
                                                'key' => $cfKey,
                                                'value' => $cfValue !== '' ? $cfValue : '-',
                                            ];
                                        }
                                    }
                                }
                            }
                        @endphp
                        <tr>
                            @if ($showProjectReference)
                                <td class="description" style="color:#6B7280;">
                                    {{ $item->project_reference ?? 'NA' }}
                                </td>
                            @endif
                            <td class="description">
                                {{ $item->item_name }}
                                @if (! $renderCustomFieldColumns && !empty($itemInlineCustomFields))
                                    @foreach ($itemInlineCustomFields as $inlineCustomField)
                                        <br><small style="color:#6B7280; font-size:11px;">{{ $inlineCustomField['key'] }}: {{ $inlineCustomField['value'] }}</small>
                                    @endforeach
                                @endif
                            </td>
                            @if ($renderCustomFieldColumns)
                                @foreach ($customFieldColumns as $customFieldColumn)
                                    <td class="description" style="color:#6B7280; font-size:11px;">
                                        {{ $itemCustomValues[strtolower($customFieldColumn)] ?? '-' }}
                                    </td>
                                @endforeach
                            @endif
                            @if ($showTotal)
                                <td class="amount">
                                    {{ formatCurrency($item->item_final_price ?? ($item->item_price ?? 0), $currency) }}
                                </td>
                            @endif
                        </tr>
                    @empty
                        <tr>
                            <td class="description" colspan="{{ 1 + ($showProjectReference ? 1 : 0) + $customFieldColumnCount + ($showTotal ? 1 : 0) }}">No projects</td>
                        </tr>
                    @endforelse
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="{{ 1 + ($showProjectReference ? 1 : 0) + $customFieldColumnCount }}" class="total-word">Total</td>
                        @if ($showTotal)
                            <td class="total-amount">{{ formatCurrency($final_amount, $currency) }}</td>
                        @endif
                    </tr>
                </tfoot>
            </table>
        @else
            {{-- ── Standard: original 6-column items table ───────────────────── --}}
            <table class="items">
                <thead>
                    <tr>
                        <th class="description">Description</th>
                        @if ($showQuantity)
                            <th class="qty" style="width:8%;">Qty</th>
                        @endif
                        @if ($showPrice)
                            <th class="unit-price" style="width:15%;">Price</th>
                        @endif
                        @if ($showDiscount)
                            <th class="unit-price" style="width:15%;">Discount</th>
                        @endif
                        @if ($showVat)
                            <th class="unit-price" style="width:15%;">VAT</th>
                        @endif
                        @if ($renderCustomFieldColumns)
                            @foreach ($customFieldColumns as $customFieldColumn)
                                <th class="description">{{ $customFieldColumn }}</th>
                            @endforeach
                        @endif
                        @if ($showTotal)
                            <th class="amount" style="width:15%;">Amount Claimed</th>
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @forelse($items as $item)
                        @php
                            $quantity = $item->item_quantity ?? 1;
                            $unitPrice = $item->item_price ?? 0;
                            $amount = $item->item_final_price;
                            $itemCustomValues = [];
                            $itemInlineCustomFields = [];
                            $inlineCustomFieldLookup = [];
                            $rawFields = $item->custom_fields ?? [];
                            if (is_array($rawFields)) {
                                foreach ($rawFields as $field) {
                                    $fieldData = is_array($field) ? $field : (array) $field;
                                    $cfKey = trim((string) ($fieldData['key'] ?? ''));
                                    $cfValue = trim((string) ($fieldData['value'] ?? ''));
                                    $normalizedKey = strtolower($cfKey);
                                    if ($cfKey !== '' && $hasCustomFieldVisibilityConfig && !array_key_exists($normalizedKey, $visibleCustomFieldKeys)) {
                                        continue;
                                    }
                                    if ($cfKey !== '' && $cfValue !== '') {
                                        $itemCustomValues[$normalizedKey] = $cfValue;
                                    }
                                    if ($cfKey !== '') {
                                        if (!array_key_exists($normalizedKey, $inlineCustomFieldLookup)) {
                                            $inlineCustomFieldLookup[$normalizedKey] = true;
                                            $itemInlineCustomFields[] = [
                                                'key' => $cfKey,
                                                'value' => $cfValue !== '' ? $cfValue : '-',
                                            ];
                                        }
                                    }
                                }
                            }
                        @endphp
                        <tr>
                            <td class="description">{{ $item->item_name }}
                                @if (!empty($item->type))
                                    <br><small
                                        style="color:#6B7280; font-size:11px;">{{ ucfirst($item->type) }}</small>
                                @endif
                                @if (! $renderCustomFieldColumns && !empty($itemInlineCustomFields))
                                    @foreach ($itemInlineCustomFields as $inlineCustomField)
                                        <br><small style="color:#6B7280; font-size:11px;">{{ $inlineCustomField['key'] }}: {{ $inlineCustomField['value'] }}</small>
                                    @endforeach
                                @endif
                            </td>
                            @if ($showQuantity)
                                <td class="qty">
                                    @if (strtolower($item->type) === 'service')
                                        -
                                    @else
                                        {{ $quantity }}
                                    @endif
                                </td>
                            @endif
                            @if ($showPrice)
                                <td class="unit-price">{{ formatCurrency($unitPrice, $currency) }}</td>
                            @endif
                            @if ($showDiscount)
                                <td class="unit-price">{{ $item->item_discount ?? '-' }}%</td>
                            @endif
                            @if ($showVat)
                                <td class="unit-price">{{ $item->item_vat ?? '-' }}%</td>
                            @endif
                            @if ($renderCustomFieldColumns)
                                @foreach ($customFieldColumns as $customFieldColumn)
                                    <td class="description" style="color:#6B7280; font-size:11px;">
                                        {{ $itemCustomValues[strtolower($customFieldColumn)] ?? '-' }}
                                    </td>
                                @endforeach
                            @endif
                            @if ($showTotal)
                                <td class="amount">{{ formatCurrency($amount, $currency) }}</td>
                            @endif
                        </tr>
                    @empty
                        <tr>
                            <td class="description"
                                colspan="{{ 1 + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) + ($showDiscount ? 1 : 0) + ($showVat ? 1 : 0) + $customFieldColumnCount + ($showTotal ? 1 : 0) }}">
                                No items
                            </td>
                        </tr>
                    @endforelse
                </tbody>
                <tfoot>
                    @if ($showBreakdown)
                        <tr>
                            <td colspan="{{ 1 + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) + ($showDiscount ? 1 : 0) + ($showVat ? 1 : 0) + $customFieldColumnCount }}"
                                style="text-align:right; padding-top:8px;">Subtotal</td>
                            @if ($showTotal)
                                <td style="text-align:right; padding-top:8px;">{{ formatCurrency($total_amount, $currency) }}</td>
                            @endif
                        </tr>
                        @if ($total_discount > 0)
                            <tr>
                                <td colspan="{{ 1 + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) + ($showDiscount ? 1 : 0) + ($showVat ? 1 : 0) + $customFieldColumnCount }}"
                                    style="text-align:right; color:#dc2626;">Discount</td>
                                @if ($showTotal)
                                    <td style="text-align:right; color:#dc2626;">- {{ formatCurrency($total_discount, $currency) }}</td>
                                @endif
                            </tr>
                        @endif
                        @if ($total_vat > 0)
                            <tr>
                                <td colspan="{{ 1 + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) + ($showDiscount ? 1 : 0) + ($showVat ? 1 : 0) + $customFieldColumnCount }}"
                                    style="text-align:right;">VAT</td>
                                @if ($showTotal)
                                    <td style="text-align:right;">+ {{ formatCurrency($total_vat, $currency) }}</td>
                                @endif
                            </tr>
                        @endif
                    @endif
                    <tr class="total-row">
                        <td colspan="{{ 1 + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) + ($showDiscount ? 1 : 0) + ($showVat ? 1 : 0) + $customFieldColumnCount }}"
                            class="total-word">Total</td>
                        @if ($showTotal)
                            <td class="total-amount">{{ formatCurrency($final_amount, $currency) }}</td>
                        @endif
                    </tr>
                </tfoot>
            </table>

        {{-- If stripe payment  add this --}}
        @endif

        {{-- ── CIS TAX DEDUCTION BLOCK ──────────────────────────────────────────
             Only shown when invoice type is CIS and final_amount > 0.
             Uses $cisRateValue (from invoice->cis_tax_value or 20% default).
        ──────────────────────────────────────────────────────────────────────── --}}
        @if ($isCIS && $final_amount > 0)
            <hr style="margin:15px 0;">

            <strong>CIS Tax Deduction</strong><br>

            <table width="100%" style="font-size:13px;">
                <tr>
                    <td>Gross Amount (before CIS):</td>
                    <td style="text-align:right;">
                        {{ number_format($final_amount, 2) }} {{ $currency }}
                    </td>
                </tr>

                <tr>
                    <td>CIS Deduction ({{ $cisRateValue }}%):</td>
                    <td style="text-align:right; color:#dc2626;">
                        - {{ number_format($cisTax, 2) }} {{ $currency }}
                    </td>
                </tr>

                <tr style="font-weight:bold;">
                    <td>Net Amount (after CIS):</td>
                    <td style="text-align:right;">
                        {{ number_format($cisNet, 2) }} {{ $currency }}
                    </td>
                </tr>
            </table>

            <br>
        @endif


        {{-- If stripe payment add this — unchanged --}}
        @if ($invoice->payment_link)
            <hr style="margin:15px 0;">

            <strong>Stripe charges</strong><br>

            <table width="100%" style="font-size:13px;">
                <tr>
                    <td>Invoice Amount:</td>
                    <td style="text-align:right;">
                        {{ number_format($netAmount, 2) }} {{ $currency }}
                    </td>
                </tr>

                @if ($stripeFeeAmount > 0)
                    <tr>
                        <td>
                            Processing Fee
                            ({{ $percentage }}%
                            @if ($fixedFee > 0)
                                + {{ number_format($fixedFee, 2) }} {{ $currency }}
                            @endif
                            )
                        </td>
                        <td style="text-align:right;">
                            {{ number_format($stripeFeeAmount, 2) }} {{ $currency }}
                        </td>
                    </tr>
                @endif

                <tr style="font-weight:bold;">
                    <td>Total To Pay:</td>
                    <td style="text-align:right;">
                        {{ number_format($grossAmount, 2) }} {{ $currency }}
                    </td>
                </tr>
            </table>

            <br>
            @if ($payment_link)
                <div>
                    <a class="btn" href="{{ $payment_link }}" title="">Click here to Pay</a>
                </div>
            @endif

        @endif

        <br>


        <!-- FOOTER -->
        <div class="footer">
            <div class="thank-you">Thank you</div>
            Generated on {{ formatDate(now()) }}
        </div>
    </div>

    @if ($quotationTitle || $quotationContent)
        <!-- PAGE 2 — QUOTATION -->
        <div class="page page-break">
            <div class="invoice-title">Quotation Note</div>

            @if ($quotationTitle)
                <strong>Title:</strong>
                <p style="font-weight: normal;">{{ $quotationTitle }}</p>
            @endif

            @if ($quotationContent)
                <div style="line-height:1.6;">
                    <strong>Content:</strong>
                    <p style="font-weight: normal;">{!! nl2br(e($quotationContent)) !!}</p>
                </div>
            @endif

            <!-- FOOTER -->
            <div class="footer">
                <div class="thank-you">Thank you</div>
                Generated on {{ formatDate(now()) }}
            </div>
        </div>
    @endif

</body>

</html>