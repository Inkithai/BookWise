@php
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
@endphp
@extends('invoice::pdf.pdf-master', ['company' => $invoice->company, 'pdfUser' => $invoice->user, 'invoice' => $invoice, 'invoiceThemeColor' => $themeColor])

@section('custom-css')
    <style>
        body {
            /* font-family: yahei, 'Roboto', sans-serif; */
            /* font-family: yahei; */
            font-family: 'Roboto', sans-serif;
            height: 842px;
            width: 595px;
            /* to centre page on screen*/
            margin-left: auto;
            margin-right: auto;
        }

        .channel td
        {
            text-align: left;
            vertical-align: middle;
            font-size: 12px;
            padding: 5px;
            border: solid 1px #e1e3fb;
        }
        .channel th
        {
            text-align: left;
            vertical-align: middle;
            font-size: 13px;
            padding: 5px;
            color: rgb(0, 0, 157);
            border: solid 1px #e1e3fb;
            background-color: #e1e3fb;
        }
        .outgoing td{
            font-size: 12px;
        }
        .amount {
            text-align: right !important;
        }
        footer {
            position: fixed;
            bottom: 0cm;
            left: 0cm;
            right: 0cm;
            height: 2cm;
            text-align: center;
            font-size: small;
            font-weight: bold;
        }


        .small-table td {
            font-size: 12px !important;
            padding: 3px 0px;
        }


        .outgoing-sub td{
            padding: 0px 0px 0px 15px;
            font-size: 11px;
            color: slategrey;
        }

        .badge {
            font-size: 12px;
            padding: 3px 6px;
            margin-right: 5px;
            border: 1px solid transparent;
            min-width: 10px;
            line-height: 1;
            color: #fff;
            text-align: center;
            white-space: nowrap;
            vertical-align: middle;
            border-radius: 5px;
        }

    </style>
@endsection

@section('content')
@php
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
    foreach ($invoice->items as $lineItem) {
        $rawFields = $lineItem->custom_fields ?? [];
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
@endphp

<div style="text-align: center; padding-top:20px;">
    <div style="font-size: large; font-weight: bolder; padding: 5px 0px 0px 0px; color:rgb(0, 0, 157)">BOOKING INVOICE</div>
    <div style="font-size: 13px; font-weight: bold; padding: 0px 0px 20px 0px;">{{$invoice->property->nickname}}</div>
</div>
<div>

    <!-- INVOICE AND SUPPLIER DETAILS -->
    <table class="outgoing small-table" style="width:100%;  padding: 0 5px 0 5px;">
        <tbody>
            <tr>
                <td style="width:200px"><span style="font-weight: bold;">Invoice Number: </span> {{$invoice->code}}</td>
                <td style="text-align: right !important;"><span style="font-weight: bold;">Company Account Name:</span>   {{$invoice->user &&$invoice->user->bank ? $invoice->user->bank->account_name : $invoice->company->account_name}}</td>
            </tr>
            <tr>
                <td style="width:200px"><span style="font-weight: bold;">Invoice To:</span> {{$invoice->client->name}}</td>
                <td style="text-align: right !important;"><span style="font-weight: bold;">Company Account Number:</span>  {{$invoice->user && $invoice->user->bank ? $invoice->user->bank->account_number : $invoice->company->account_number}} </td>
            </tr>
            <tr>
                <td style="width:200px"><span style="font-weight: bold;">Invoice Date:</span> {{Carbon\Carbon::parse($invoice->invoice_date)->format('d-M-Y')}}</td>
                <td style="text-align: right !important;"><span style="font-weight: bold;">Company Sort Code:</span>  {{$invoice->user && $invoice->user->bank ? $invoice->user->bank->sort_code : $invoice->company->sort_code}} </td>
            </tr>
            <tr>
                @if ($invoice->due_date)
                    <td style="width:200px"><span style="font-weight: bold;">Invoice Due Date:</span> <span style="color: red;"> {{Carbon\Carbon::parse($invoice->due_date)->format('d-M-Y')}} </span</td>
                @else
                    <td style="width:200px"></td>
                @endif
                <td style="text-align: right !important;"><span style="font-weight: bold;">Company Email:</span>   {{$invoice->user && $invoice->user->bank ? $invoice->user->email :$invoice->company->email}}</td>
            </tr>
        </tbody>
    </table>

    <div style="padding: 0px 5px 0px 7px; margin-top:10px;">
        <span style="font-weight: bolder; font-size: 12px !important;">Client Email/s: </span>
        @foreach (explode(';',$invoice->client->email) as $key => $email)
            <span class="badge" style="background-color: rgb(0, 0, 157)"> {{$email}} </span>
        @endforeach
    </div>

</div>
<!-- INVOICE ITEMS DETAILS -->
    @if (count($invoice->items) < 14)
        <div style="height: 600px; position: relative;">
        <div class="content" style="position: absolute; width: 100%; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    @endif
        <table class="channel" style="padding: 10px 5px 0px 5px; width: 100%;">
            <th style="width: 40%;">DESCRIPTION</th>
            @if ($renderCustomFieldColumns)
                @foreach ($customFieldColumns as $customFieldColumn)
                    <th>{{ $customFieldColumn }}</th>
                @endforeach
            @endif
            @if ($showQuantity)
                <th>QTY</th>
            @endif
            @if ($showPrice)
                <th>UNIT PRICE</th>
            @endif
            @if ($showTotal)
                <th class="amount">AMOUNT</th>
            @endif

            @foreach ($invoice->items as $item)
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
                <td>{{$item->item_name}}
                    @if ($item->item_discount > 0)
                        <span style="color: grey; font-size: 10px;">({{intval($item->item_discount)}}% Off)</span>
                    @endif
                    @if (! $renderCustomFieldColumns && !empty($itemInlineCustomFields))
                        @foreach ($itemInlineCustomFields as $inlineCustomField)
                            <br><span style="color: slategrey; font-size: 11px;">{{ $inlineCustomField['key'] }}: {{ $inlineCustomField['value'] }}</span>
                        @endforeach
                    @endif
                </td>
                @if ($renderCustomFieldColumns)
                    @foreach ($customFieldColumns as $customFieldColumn)
                        <td style="font-size: 11px; color: slategrey;">
                            {{ $itemCustomValues[strtolower($customFieldColumn)] ?? '-' }}
                        </td>
                    @endforeach
                @endif
                @if ($showQuantity)
                    <td>{{$item->item_quantity}}</td>
                @endif
                @if ($showPrice)
                    <td>£{{number_format($item->item_price, 2)}}</td>
                @endif
                @if ($showTotal)
                    <td class="amount">£{{number_format(($item->item_price * $item->item_quantity), 2)}}</td>
                @endif
            </tr>
            @endforeach

            <tr>
                <td style="background-color: #e1e3fb;" colspan="{{ 1 + $customFieldColumnCount + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) + ($showTotal ? 1 : 0) }}"></td>
            </tr>

            <tr>
                <td colspan="{{ 1 + $customFieldColumnCount + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) }}" class="" style="font-weight: bold;">SUBTOTAL: </td>
                @if ($showTotal)
                    <td class="amount" style="font-weight: bold;">£{{number_format($invoice->total_amount, 2)}}</td>
                @endif
            </tr>
            @if ($invoice->total_vat > 0)
                <tr>
                    <td colspan="{{ 1 + $customFieldColumnCount + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) }}" class="" style="font-weight: bold;">VAT: </td>
                    @if ($showTotal)
                        <td class="amount" style="font-weight: bold;">£{{number_format($invoice->total_vat, 2)}}</td>
                    @endif
                </tr>
            @endif
            @if ($invoice->total_discount > 0)
                <tr>
                    <td colspan="{{ 1 + $customFieldColumnCount + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) }}" class="" style="font-weight: bold;">DISCOUNT: </td>
                    @if ($showTotal)
                        <td class="amount" style="font-weight: bold;">£{{number_format($invoice->total_discount, 2)}}</td>
                    @endif
                </tr>
            @endif
            <tr>
                <td colspan="{{ 1 + $customFieldColumnCount + ($showQuantity ? 1 : 0) + ($showPrice ? 1 : 0) }}" class="" style="font-weight: bold; background-color: #e1e3fb;">TOTAL: </td>
                @if ($showTotal)
                    <td class="amount" style="font-weight: bold; background-color: #e1e3fb;">£{{number_format($invoice->final_amount, 2)}}</td>
                @endif
            </tr>

        </table>
     @if (count($invoice->items) < 14)
        </div>
        </div>
    @endif
@endsection
