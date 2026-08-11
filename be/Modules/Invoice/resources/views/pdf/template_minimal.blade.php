@php
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
    $code = $invoice->code ?? 'INV-0001';
    $isCIS = (bool) ($invoice->cis_enabled ?? false);
    $invoiceTypeName = $isCIS ? 'Invoice' : ($invoice->type->name ?? 'Standard Invoice');
    $client = $invoice->client->name ?? 'No client';
    $clientEmail = $invoice->client->email ?? '';
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
    $invoice_date = $invoice->invoice_date ?? null;
    $due_date = $invoice->due_date ?? null;

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
        return $date ? \Carbon\Carbon::parse($date)->format('M d, Y') : '-';
    }

    // Resolve bank details using the same logic as the backend
    // Priority: invoice fields > user bank > company bank (from invoices_companies table)
    $accountName   = $invoice->account_name   ?? $invoice->user?->bank?->account_name   ?? null;
    $accountNumber = $invoice->account_number ?? $invoice->user?->bank?->account_number ?? null;
    $sortCode      = $invoice->sort_code      ?? $invoice->user?->bank?->sort_code      ?? null;

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
    <style>
        @page {
            margin: 40px;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 13px;
            color: #000;
        }

        .payment-button {
            background-color: var(--theme-color, #1e88e5);
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #000;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }

        .left-header .company-name {
            font-size: 20px;
            font-weight: 600;
        }

        .left-header .invoice-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .right-header {
            text-align: right;
        }

        .invoice-number {
            font-size: 24px;
            font-weight: 400;
        }

        .btn {
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

        .invoice-type {
            font-size: 12px;
            color: #666;
        }

        /* INFO ROW (Flex-based for DOMPDF compatibility) */
        .info-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 25px;
        }

        .info-box {
            width: 32%;
        }

        .info-box strong {
            display: block;
            text-transform: uppercase;
            font-size: 12px;
            color: #666;
            margin-bottom: 3px;
        }

        .info-box div {
            font-weight: 600;
            font-size: 13px;
        }

        .info-box.center {
            text-align: center;
        }

        .info-box.right {
            text-align: right;
        }

        /* TABLE */
        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
            font-size: 12px;
            text-transform: uppercase;
        }

        td {
            padding: 10px 0;
            vertical-align: top;
        }

        td:last-child,
        th:last-child {
            text-align: right;
        }

        .desc {
            font-weight: 600;
        }

        .subtext {
            font-size: 11px;
            color: #666;
        }

        /* TOTALS */
        .totals {
            width: 40%;
            float: right;
            margin-top: 15px;
        }

        .totals td {
            padding: 4px 0;
        }

        .totals td:first-child {
            text-align: right;
            color: #666;
        }

        .totals .total-label {
            border-top: 1px solid #000;
            padding-top: 5px;
            font-weight: bold;
            font-size: 14px;
        }

        .totals .total-value {
            padding-top: 5px;
            font-weight: bold;
            font-size: 14px;
        }

        .footer {
            position: fixed;
            bottom: 25px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 11px;
            color: #555;
        }
    </style>
</head>

<body style="--theme-color: {{ $themeColor }};">

    <!-- HEADER -->
    <div class="header">
        <div class="left-header">
            @if ($logoBase64)
                <img src="{{ $logoBase64 }}" alt="Logo" style="max-height:60px; max-width:160px; margin-bottom:6px; display:block;">
            @endif
            @if ($hasInvoicePdfCompanyName)
                <div class="company-name">{{ $companyName }}</div>
            @endif
            @if (!empty($companyAddressLines))
                @foreach ($companyAddressLines as $line)
                    <div style="font-size: 12px; color: #666;">{{ trim($line) }}</div>
                @endforeach
            @endif
            <div class="invoice-label">INVOICE</div>
        </div>
        <div class="right-header">
            <div class="invoice-number">{{ $code }}</div>
            <div class="invoice-type">{{ $invoiceTypeName }}</div>
        </div>
    </div>

    <!-- INFO ROW -->
    <div class="info-row">
        <div class="info-box">
            <strong>Invoice To</strong>
            <div>{{ $client }}</div>
            @if (!empty($clientEmail))
                <div style="font-weight: normal; color: #666;">{{ $clientEmail }}</div>
            @endif
            @if (!empty($clientAddressLines))
                <div style="font-weight: normal; color: #666;">Address: {{ $clientAddressLines[0] }}</div>
                @foreach (array_slice($clientAddressLines, 1) as $line)
                    <div style="font-weight: normal; color: #666;">{{ $line }}</div>
                @endforeach
            @endif
        </div>
        <div class="info-box center">
            <strong>Invoice Date</strong>
            <div>{{ formatDate($invoice_date) }}</div>
        </div>
        <div class="info-box right">
            <strong>Due Date</strong>
            <div>{{ formatDate($due_date) }}</div>
        </div>
    </div>

    <!-- ITEMS TABLE -->
    <table>
        <thead>
            <tr>
                <th>Description</th>
                @if ($renderCustomFieldColumns)
                    @foreach ($customFieldColumns as $customFieldColumn)
                        <th>{{ $customFieldColumn }}</th>
                    @endforeach
                @endif
                @if ($showPrice)
                    <th>Price</th>
                @endif
                @if ($showQuantity)
                    <th>Qty</th>
                @endif
                @if ($showTotal)
                    <th>Amount</th>
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
                        <div class="desc">{{ $item->item_name ?? '-' }}</div>
                        <div class="subtext">{{ ucfirst($item->type ?? 'Service') }}</div>
                        @if (! $renderCustomFieldColumns && !empty($itemInlineCustomFields))
                            @foreach ($itemInlineCustomFields as $inlineCustomField)
                                <div class="subtext">{{ $inlineCustomField['key'] }}: {{ $inlineCustomField['value'] }}</div>
                            @endforeach
                        @endif
                    </td>
                    @if ($renderCustomFieldColumns)
                        @foreach ($customFieldColumns as $customFieldColumn)
                            <td class="subtext">{{ $itemCustomValues[strtolower($customFieldColumn)] ?? '-' }}</td>
                        @endforeach
                    @endif
                    @if ($showPrice)
                        <td>${{ formatCurrency($item->item_price ?? 0) }}</td>
                    @endif
                    @if ($showQuantity)
                        <td>{{ $item->item_quantity ?? 1 }}</td>
                    @endif
                    @if ($showTotal)
                        <td><strong>${{ formatCurrency($item->item_final_price ?? 0) }}</strong></td>
                    @endif
                </tr>
            @empty
                <tr>
                    <td colspan="{{ 1 + $customFieldColumnCount + ($showPrice ? 1 : 0) + ($showQuantity ? 1 : 0) + ($showTotal ? 1 : 0) }}"
                        style="text-align:center; padding:12px;">No items found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- TOTALS -->
    <table class="totals">
        <tr>
            <td>Subtotal</td>
            <td>${{ formatCurrency($total_amount) }}</td>
        </tr>
        <tr>
            <td>Discount</td>
            <td>- ${{ formatCurrency($total_discount) }}</td>
        </tr>
        <tr>
            <td>VAT</td>
            <td>${{ formatCurrency($total_vat) }}</td>
        </tr>
        <tr>
            <td class="total-label">Total</td>
            <td class="total-value">${{ formatCurrency($final_amount) }}</td>
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
            <a class="payment-button" href="{{ $payment_link }}" title="">Click here to Pay</a>
        </div>
    @endif

    @if ($invoice->bank_payment && $hasBankDetails)
    <div style="margin-top: 20px; padding: 12px 16px; background: #f5f5f5; border-top: 1px solid #ddd; font-size: 12px;">
        <strong style="display: block; margin-bottom: 6px;">Bank Details</strong>
        @if ($accountName)<div>Account Name: {{ $accountName }}</div>@endif
        @if ($accountNumber)<div>Account Number: {{ $accountNumber }}</div>@endif
        @if ($sortCode)<div>Sort Code: {{ $sortCode }}</div>@endif
    </div>
    @endif

    <div class="footer">Thank you</div>
</body>

</html>
