@php
    use Carbon\Carbon;
    use App\Models\HostUserDetail;
    use App\Models\Host;

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
        $pdfHostId = (int) ($invoice->user?->host_id ?? 0);
    }
    $pdfHost = $pdfHostId > 0 ? Host::find($pdfHostId) : null;
    $themeColor = $pdfHost?->invoice_theme_color ?? $invoice->user?->invoice_theme_color ?? auth()->user()?->invoice_theme_color ?? '#1e88e5';
    $companyNameRaw = $pdfHostId > 0
        ? HostUserDetail::query()
            ->where('host_id', $pdfHostId)
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
            ? HostUserDetail::query()
                ->where('host_id', $pdfHostId)
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
    $code = $invoice->code ?? 'INV-2024-001';
    $isCIS = (bool) ($invoice->cis_enabled ?? false);
    $invoiceTypeName = $isCIS ? 'Invoice' : ($invoice->type->name ?? 'Standard Invoice');
    $client = $invoice->client->name ?? 'Acme Corporation';
    $clientEmail = $invoice->client->email ?? 'billing@acme.com';
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
    $invoice_date = $invoice->invoice_date ?? '2024-01-15';
    $due_date = $invoice->due_date ?? '2024-02-15';

    $items = $invoice->items ?? collect([]);
    $rawPdfFieldVisibility = $invoice->pdf_field_visibility ?? [];
    if (is_string($rawPdfFieldVisibility)) {
        $decodedPdfFieldVisibility = json_decode($rawPdfFieldVisibility, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $rawPdfFieldVisibility = $decodedPdfFieldVisibility;
        }
    }
    $pdfFieldVisibility = is_array($rawPdfFieldVisibility) ? $rawPdfFieldVisibility : [];
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
    $total_amount = (float) ($invoice->total_amount ?? 0);
    $total_discount = (float) ($invoice->total_discount ?? 0);
    $total_vat = (float) ($invoice->total_vat ?? 0);
    $final_amount = (float) ($invoice->final_amount ?? 0);
    // Verify: if breakdown doesn't add up, recalculate
    $calculatedFinal = $total_amount - $total_discount + $total_vat;
    if (abs($calculatedFinal - $final_amount) > 0.01 && $items->count() > 0) {
        $final_amount = round($calculatedFinal, 2);
    }

    // ── Super-admin (rootless) host fallback ──────────────────────────────────
    $pdfAuthUser = auth()->user();
    $pdfIsRootless = is_null($pdfAuthUser?->host_id);
    if ($pdfIsRootless && $pdfHostId <= 0) {
        $pdfHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
    }

    // ── Logo resolution with user_id scope for rootless users ─────────────────
    $logoRaw = $pdfHostId > 0
        ? HostUserDetail::query()
            ->where('host_id', $pdfHostId)
            ->where('type', 'company_details')
            ->where('name', 'company_logo')
            ->when($pdfIsRootless && $pdfAuthUser, fn ($q) => $q->where('user_id', $pdfAuthUser->id))
            ->value('files')
        : null;
    $logoPath = is_string($logoRaw) ? trim($logoRaw) : null;
    if ($logoPath && strcasecmp($logoPath, 'null') === 0) { $logoPath = null; }
    if (empty($logoPath) && (int) ($pdfUser?->host_id ?? 0) === $pdfHostId) {
        $profileImg = trim((string) ($pdfUser?->profile_img ?? ''));
        if (!empty($profileImg) && \Illuminate\Support\Facades\Storage::disk('public')->exists($profileImg)) {
            $logoPath = $profileImg;
        }
    }
    $logoBase64 = null;
    if ($logoPath) {
        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($logoPath)) {
            $fullPath = \Illuminate\Support\Facades\Storage::disk('public')->path($logoPath);
            $logoContent = @file_get_contents($fullPath);
            if ($logoContent !== false) {
                $mime = @mime_content_type($fullPath) ?: 'image/png';
                $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode($logoContent);
            }
        }
    }

    // ── CIS calculation ───────────────────────────────────────────────────────
    $cisRateValue = !empty($invoice->cis_tax) && $invoice->cis_tax > 0 ? (float) $invoice->cis_tax : 20;
    $cisRateDecimal = $cisRateValue / 100;
    $cisTax = $isCIS ? round($final_amount * $cisRateDecimal, 2) : 0;
    $cisNet = $isCIS ? round($final_amount - $cisTax, 2) : $final_amount;
    $currency = $invoice->items->value('item_currency') ?? 'GBP';

    function formatCurrency($amount)
    {
        return number_format((float) $amount, 2);
    }

    function formatDate($date)
    {
        return $date ? Carbon::parse($date)->format('M d, Y') : '-';
    }

    // Resolve bank details using the same logic as the backend
    // Priority: invoice fields > user bank > company bank (from invoices_companies table)
    $accountName = $invoice->account_name ?? $invoice->user?->bank?->account_name ?? null;
    $accountNumber = $invoice->account_number ?? $invoice->user?->bank?->account_number ?? null;
    $sortCode = $invoice->sort_code ?? $invoice->user?->bank?->sort_code ?? null;

    // If no bank details from invoice or user bank, try to resolve from invoices_companies table
    if (empty($accountName) && empty($accountNumber) && empty($sortCode)) {
        $invoiceCompany = \Modules\Invoice\Models\InvoiceCompany::query()
            ->where('host_id', $pdfHostId)
            ->when($invoice->company_id, fn ($q) => $q->where('company_id', $invoice->company_id))
            ->first(['account_name', 'account_number', 'sort_code']);
        if ($invoiceCompany) {
            $accountName   = $invoiceCompany->account_name;
            $accountNumber = $invoiceCompany->account_number;
            $sortCode      = $invoiceCompany->sort_code;
        }
    }

    $hasBankDetails = !empty($accountName) || !empty($accountNumber) || !empty($sortCode);
@endphp

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $code }}</title>
    <style>
        @page {
            margin: 40px;
        }

        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 13px;
            color: #111;
            background: #fff;
        }

        /* === HEADER === */
        .header {
            background: {{ $themeColor }};
            color: #fff;
            border-radius: 8px;
            padding: 20px;
            width: 100%;
        }

        .header-table {
            width: 100%;
        }

        .header-left h2 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
        }

        .header-left p {
            margin: 4px 0 0;
            font-size: 12px;
            color: #ccc;
        }

        .header-right {
            text-align: right;
        }

        .header-right h2 {
            margin: 0;
            font-size: 18px;
        }

        .header-right span {
            font-size: 12px;
            color: #ddd;
        }

        .btn {
            background: {{ $themeColor }};
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

        /* === BILL TO + DATES (One Line) === */
        /* === BILL TO + DATES TABLE LAYOUT === */
        .info-table {
            width: 100%;
            border-spacing: 0;
            margin-top: 25px;
        }

        .info-table td {
            vertical-align: top;
            width: 50%;
        }

        .info-box {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px 16px;
            box-sizing: border-box;
        }

        .info-box h4 {
            margin: 0 0 8px;
            text-transform: uppercase;
            font-size: 12px;
            color: #666;
        }

        .info-box p {
            margin: 2px 0;
            font-size: 13px;
        }

        /* Optional spacing between left/right boxes */
        .left-box {
            padding-right: 10px;
        }

        .right-box {
            padding-left: 10px;
        }

        /* === DIVIDER === */
        .divider {
            background: {{ $themeColor }};
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px 6px 0 0;
            font-weight: bold;
            font-size: 13px;
            margin-top: 30px;
        }

        /* === LINE ITEMS === */
        .item-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #eee;
        }

        .item-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }

        .item-table th {
            text-align: left;
            vertical-align: middle;
            font-size: 12px;
            padding: 10px 12px;
            color: #111;
            border-bottom: 1px solid #eee;
            text-transform: uppercase;
        }

        .item-table tr:last-child td {
            border-bottom: none;
        }

        .item-title {
            font-weight: bold;
        }

        .item-meta {
            font-size: 12px;
            color: #555;
        }

        .item-total {
            text-align: right;
            font-weight: bold;
        }

        /* === SUMMARY === */
        .summary {
            width: 100%;
            margin-top: 15px;
            border-collapse: collapse;
        }

        .summary td {
            padding: 6px 8px;
            font-size: 13px;
        }

        .summary td:first-child {
            text-align: right;
            width: 80%;
            color: #333;
        }

        .summary td:last-child {
            text-align: right;
        }

        .summary .total td {
            font-weight: bold;
            font-size: 15px;
            border-top: 2px solid #000;
            padding-top: 8px;
        }

        /* === FOOTER === */
        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>

<body>

    {{-- HEADER --}}
    <div class="header">
        <table class="header-table">
            <tr>
                <td class="header-left">
                    @if ($logoBase64)
                        <img src="{{ $logoBase64 }}" alt="Logo" style="max-height:60px; max-width:160px; margin-bottom:6px; display:block;">
                    @endif
                    <h2>INVOICE</h2>
                    @if ($hasInvoicePdfCompanyName)
                        <p>{{ $companyName }}</p>
                    @endif
                    @if (!empty($companyAddressLines))
                        @foreach ($companyAddressLines as $line)
                            <p style="font-size: 11px; color: #ccc;">{{ trim($line) }}</p>
                        @endforeach
                    @endif
                </td>
                <td class="header-right">
                    <h2>{{ $code }}</h2>
                    <span>{{ $invoiceTypeName }}</span>
                </td>
            </tr>
        </table>
    </div>

    {{-- BILLING + DATES --}}
    {{-- BILLING + DATES --}}
    <table class="info-table">
        <tr>
            <td class="info-box left-box">
                <h4>INVOICE TO</h4>
                <p><strong>{{ $client }}</strong></p>
                <p>{{ $clientEmail }}</p>
                @if (!empty($clientAddressLines))
                    <p>Address: {{ $clientAddressLines[0] }}</p>
                    @foreach (array_slice($clientAddressLines, 1) as $line)
                        <p>{{ $line }}</p>
                    @endforeach
                @endif
            </td>

            <td class="info-box right-box">
                <h4>DATES</h4>
                <p><strong>Invoice:</strong> {{ formatDate($invoice_date) }}</p>
                <p><strong>Due:</strong> {{ formatDate($due_date) }}</p>
            </td>
        </tr>
    </table>


    {{-- LINE ITEMS --}}
    <div class="divider">Line Items</div>
    <table class="item-table">
        <thead>
            <tr>
                <th>Description</th>
                @if ($renderCustomFieldColumns)
                    @foreach ($customFieldColumns as $customFieldColumn)
                        <th>{{ $customFieldColumn }}</th>
                    @endforeach
                @endif
                @if ($showTotal)
                    <th style="text-align:right;">Amount</th>
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
                <td>
                    <div class="item-title">{{ $item->item_name ?? 'Service Item' }}</div>
                    <div class="item-meta">
                        {{ ucfirst($item->type ?? 'Service') }}
                        @if ($showPrice || $showQuantity)
                            <br>
                        @endif
                        @if ($showPrice)
                            ${{ formatCurrency($item->item_price ?? 0) }}
                        @endif
                        @if ($showPrice && $showQuantity)
                            ×
                        @endif
                        @if ($showQuantity)
                            {{ $item->item_quantity ?? 1 }}
                        @endif
                        @if ($showDiscount && $item->item_discount > 0)
                            @if ($showPrice || $showQuantity)
                                ,
                            @endif
                            − {{ $item->item_discount }}%
                        @endif
                        @if ($showVat && $item->item_vat > 0)
                            @if ($showPrice || $showQuantity || ($showDiscount && $item->item_discount > 0))
                                ,
                            @endif
                            + {{ $item->item_vat }}% VAT
                        @endif
                    </div>
                    @if (! $renderCustomFieldColumns && !empty($itemInlineCustomFields))
                        @foreach ($itemInlineCustomFields as $inlineCustomField)
                            <div class="item-meta">{{ $inlineCustomField['key'] }}: {{ $inlineCustomField['value'] }}</div>
                        @endforeach
                    @endif
                </td>
                @if ($renderCustomFieldColumns)
                    @foreach ($customFieldColumns as $customFieldColumn)
                        <td class="item-meta">{{ $itemCustomValues[strtolower($customFieldColumn)] ?? '-' }}</td>
                    @endforeach
                @endif
                @if ($showTotal)
                    <td class="item-total">
                        ${{ formatCurrency($item->item_final_price ?? 0) }}
                    </td>
                @endif
            </tr>
        @empty
            <tr>
                <td colspan="{{ 1 + $customFieldColumnCount + ($showTotal ? 1 : 0) }}" style="text-align:center;color:#777;">No items available</td>
            </tr>
        @endforelse
        </tbody>
    </table>

    {{-- SUMMARY --}}
    <table class="summary">
        <tr>
            <td>Subtotal:</td>
            <td>${{ formatCurrency($total_amount) }}</td>
        </tr>
        <tr>
            <td>Discount:</td>
            <td>-${{ formatCurrency($total_discount) }}</td>
        </tr>
        <tr>
            <td>VAT:</td>
            <td>${{ formatCurrency($total_vat) }}</td>
        </tr>
        <tr class="total">
            <td>Total:</td>
            <td>${{ formatCurrency($final_amount) }}</td>
        </tr>
    </table>

    @if ($isCIS && $final_amount > 0)
    <div style="margin-top:16px; padding:12px; border:1px solid #ddd; border-radius:4px; font-size:13px;">
        <strong>CIS Tax Deduction</strong>
        <table style="width:100%; margin-top:8px;">
            <tr><td>Gross Amount (before CIS):</td><td align="right">{{ number_format($final_amount, 2) }} {{ $currency }}</td></tr>
            <tr><td>CIS Deduction ({{ $cisRateValue }}%):</td><td align="right" style="color:#c00;">- {{ number_format($cisTax, 2) }} {{ $currency }}</td></tr>
            <tr><td><strong>Net Amount (after CIS):</strong></td><td align="right"><strong>{{ number_format($cisNet, 2) }} {{ $currency }}</strong></td></tr>
        </table>
    </div>
    @endif

    <br>
    @if ($payment_link)
        <div>
            <a class="btn" href="{{ $payment_link }}" title="">Click here to Pay</a>
        </div>
    @endif

    @if ($invoice->bank_payment && $hasBankDetails)
    <div class="bank-details" style="margin-top: 20px; padding: 12px 16px; background: #f5f5f5; border-radius: 6px; font-size: 13px;">
        <strong style="display: block; margin-bottom: 6px; color: {{ $themeColor }};">Bank Details</strong>
        @if ($accountName)
            <span style="color: #555;">Account Name:</span> {{ $accountName }}<br>
        @endif
        @if ($sortCode)
            <span style="color: #555;">Sort Code:</span> {{ $sortCode }}<br>
        @endif
        @if ($accountNumber)
            <span style="color: #555;">Account Number:</span> {{ $accountNumber }}
        @endif
    </div>
    @endif

    {{-- FOOTER --}}
    <div class="footer">
        Thank you for choosing us!<br>
        <small>Generated on {{ now()->format('d/m/Y') }}</small>
    </div>

</body>

</html>
