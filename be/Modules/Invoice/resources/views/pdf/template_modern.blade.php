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

        /* HEADER */
        .header-table {
            width: 100%;
            border-bottom: 1px solid #e0e0e0;
            margin-bottom: 25px;
        }

        .header-table td {
            vertical-align: top;
            padding: 5px 0;
        }

        .company-name {
            font-size: 16px;
            font-weight: bold;
        }

        .invoice-type {
            font-size: 12px;
            color: #777;
            text-align: right;
        }

        .invoice-code {
            font-size: 14px;
            font-weight: bold;
            text-align: right;
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

        /* INFO BLOCK */
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }

        .info-table td {
            vertical-align: top;
            border: 1px solid #f0f0f0;
            padding: 10px 15px;
        }

        .info-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 4px;
        }

        .info-content {
            font-weight: bold;
            font-size: 13px;
        }

        .info-sub {
            color: #888;
            font-size: 12px;
        }

        /* ITEMS TABLE */
        .items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
        }

        .items th {
            background: #f9f9f9;
            border-bottom: 1px solid #ccc;
            text-transform: uppercase;
            font-size: 12px;
            padding: 8px 6px;
        }

        .items td {
            border-bottom: 1px solid #eee;
            padding: 8px 6px;
        }

        .items td:last-child,
        .items th:last-child {
            text-align: right;
        }

        .desc {
            font-weight: 600;
        }

        .subtext {
            font-size: 11px;
            color: #777;
        }

        /* TOTALS TABLE */
        .totals {
            width: 40%;
            float: right;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .totals td {
            padding: 6px 4px;
        }

        .totals td:first-child {
            text-align: right;
            color: #555;
        }

        .totals tr:last-child td {
            border-top: 1px solid #000;
            font-weight: bold;
            font-size: 14px;
            padding-top: 8px;
        }

        /* FOOTER */
        .footer {
            position: fixed;
            bottom: 25px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 11px;
            color: #666;
        }
    </style>
</head>

<body>
    <!-- HEADER -->
    <table class="header-table">
        <tr>
            <td>
                @if ($logoBase64)
                    <img src="{{ $logoBase64 }}" alt="Logo" style="max-height:60px; max-width:160px; margin-bottom:6px; display:block;">
                @endif
                @if ($hasInvoicePdfCompanyName)
                    <div class="company-name">{{ $companyName }}</div>
                @endif
                @if (!empty($companyAddressLines))
                    @foreach ($companyAddressLines as $line)
                        <div style="font-size: 11px; color: #888;">{{ trim($line) }}</div>
                    @endforeach
                @endif
                <div style="color:#888; font-size:12px;">Invoice</div>
            </td>
            <td class="invoice-type">
                {{ $invoiceTypeName }}<br>
                <span class="invoice-code">{{ $code }}</span>
            </td>
        </tr>
    </table>

    <!-- INFO SECTION -->
    <table class="info-table">
        <tr>
            <td width="50%">
                <div class="info-title">Bill To</div>
                <div class="info-content">{{ $client }}</div>
                <div class="info-sub">{{ $clientEmail }}</div>
                @if (!empty($clientAddressLines))
                    <div class="info-sub">Address: {{ $clientAddressLines[0] }}</div>
                    @foreach (array_slice($clientAddressLines, 1) as $line)
                        <div class="info-sub">{{ $line }}</div>
                    @endforeach
                @endif
            </td>
            <td width="50%">
                <div class="info-title">Details</div>
                <table width="100%" style="font-size:13px;">
                    <tr>
                        <td>Issue Date</td>
                        <td align="right">{{ formatDate($invoice_date) }}</td>
                    </tr>
                    <tr>
                        <td>Due Date</td>
                        <td align="right">{{ formatDate($due_date) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- ITEMS TABLE -->
    <table class="items">
        <thead>
            <tr>
                <th>Item</th>
                @if ($renderCustomFieldColumns)
                    @foreach ($customFieldColumns as $customFieldColumn)
                        <th>{{ $customFieldColumn }}</th>
                    @endforeach
                @endif
                @if ($showQuantity)
                    <th>Qty</th>
                @endif
                @if ($showPrice)
                    <th>Price</th>
                @endif
                @if ($showDiscount)
                    <th>Disc</th>
                @endif
                @if ($showVat)
                    <th>VAT</th>
                @endif
                @if ($showTotal)
                    <th>Total</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @php
                if ($items->isEmpty()) {
                    $items = collect([
                        (object) [
                            'item_name' => 'Web Design & Development',
                            'type' => 'Service',
                            'item_quantity' => 1,
                            'item_price' => 2500.0,
                            'discount' => '10%',
                            'vat' => '8%',
                            'item_final_price' => 2430.0,
                        ],
                        (object) [
                            'item_name' => 'Domain Registration (1 year)',
                            'type' => 'Product',
                            'item_quantity' => 1,
                            'item_price' => 15.0,
                            'discount' => '-',
                            'vat' => '8%',
                            'item_final_price' => 16.2,
                        ],
                        (object) [
                            'item_name' => 'SSL Certificate',
                            'type' => 'Product',
                            'item_quantity' => 1,
                            'item_price' => 89.0,
                            'discount' => '5%',
                            'vat' => '8%',
                            'item_final_price' => 91.18,
                        ],
                        (object) [
                            'item_name' => 'Content Writing Services',
                            'type' => 'Service',
                            'item_quantity' => 1,
                            'item_price' => 800.0,
                            'discount' => '-',
                            'vat' => '8%',
                            'item_final_price' => 864.0,
                        ],
                    ]);
                }
            @endphp

            @foreach ($items as $item)
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
                    @if ($showQuantity)
                        <td>{{ $item->item_quantity ?? 1 }}</td>
                    @endif
                    @if ($showPrice)
                        <td>${{ formatCurrency($item->item_price ?? 0) }}</td>
                    @endif
                    @if ($showDiscount)
                        <td>{{ $item->discount ?? '-' }}</td>
                    @endif
                    @if ($showVat)
                        <td>{{ $item->vat ?? '8%' }}</td>
                    @endif
                    @if ($showTotal)
                        <td><strong>${{ formatCurrency($item->item_final_price ?? 0) }}</strong></td>
                    @endif
                </tr>
            @endforeach
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
            <td>+ ${{ formatCurrency($total_vat) }}</td>
        </tr>
        <tr>
            <td>Total</td>
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
    <div style="margin-top: 20px; padding: 12px 16px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 12px;">
        <strong style="display: block; margin-bottom: 6px;">Bank Details</strong>
        @if ($accountName)<div>Account Name: {{ $accountName }}</div>@endif
        @if ($accountNumber)<div>Account Number: {{ $accountNumber }}</div>@endif
        @if ($sortCode)<div>Sort Code: {{ $sortCode }}</div>@endif
    </div>
    @endif

    <!-- FOOTER -->
    <div class="footer">
        Thank you for your business - {{ Carbon::now()->format('M d, Y') }}
    </div>
</body>

</html>
