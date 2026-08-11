@extends('emails.preview.master-preview')

@section('email-content')
    @php
        $typeLabel = $data['type'] === 'receipt' ? 'Receipt' : 'Invoice';
        $invoice = $data['invoice'] ?? null;
        $clientName = $data['name'] ?? ($invoice->client->name ?? 'Valued Customer');
        $senderName = $data['sender_snapshot']['sender_name'] ?? null;
        $senderCompany = $data['sender_snapshot']['sender_company_name'] ?? null;
        $senderEmail = $data['sender_snapshot']['sender_email'] ?? null;
        $senderPhone = $data['sender_snapshot']['sender_phone'] ?? null;
        $currency = optional($invoice->items->first())->item_currency ?? '';
        $amount = number_format((float) ($invoice->final_amount ?? 0), 2, '.', '');
        $dueDate = $invoice && $invoice->due_date ? \Carbon\Carbon::parse($invoice->due_date)->format('d/m/Y') : null;
        $invoiceTypeName = $invoice->type?->name ?? ($invoice->invoice_type ?? $typeLabel);
        $paymentLink = $data['payment_link'] ?? null;
        $customMessage = $data['additional_info'] ?? null;
        $isCISInvoice = (! empty($invoice->cis_enabled) && $invoice->cis_enabled) || str_contains(strtolower((string) $invoiceTypeName), 'cis');
        $cisPercent = is_numeric($invoice->cis_tax) && $invoice->cis_tax > 0 ? (float) $invoice->cis_tax : 20.0;
        $cisTax = $isCISInvoice ? round((float) ($invoice->final_amount ?? 0) * ($cisPercent / 100), 2) : 0.0;
        $cisNet = $isCISInvoice ? round((float) ($invoice->final_amount ?? 0) - $cisTax, 2) : (float) ($invoice->final_amount ?? 0);
        $bankDetails = $data['bank_details'] ?? null;
        $showPaymentLink = $paymentLink && $data['type'] !== 'receipt';
    @endphp

    <div style="margin-bottom: 24px;">
        <p style="font-size: 18px; line-height: 1.6; color: #1f2937; margin: 0 0 16px 0;">Hello <strong>{{ $clientName }}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.8; color: #374151; margin: 0 0 16px 0;">
            You have received a new {{ strtolower($typeLabel) }} from {{ $senderCompany ?: ($senderName ?: 'BookWise') }}.
        </p>

        @if($customMessage)
            <div style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px;">
                {!! nl2br(e($customMessage)) !!}
            </div>
        @else
            <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px;">
                Your {{ strtolower($typeLabel) }} is attached to this email for your reference.
            </p>
        @endif
    </div>

    <div style="border-radius: 12px; background: #e8f4fc; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a;">{{ $typeLabel }} Details</h2>

        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <div style="min-width: 180px; flex: 1;">
                <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">{{ $typeLabel }} Number</div>
                <div style="font-size: 16px; font-weight: 600; color: #0f172a;">{{ $invoice->code ?? 'N/A' }}</div>
            </div>
            <div style="min-width: 180px; flex: 1;">
                <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">Amount Due</div>
                <div style="font-size: 16px; font-weight: 600; color: #0f172a;">{{ $currency }} {{ $amount }}</div>
            </div>
            @if($dueDate)
                <div style="min-width: 180px; flex: 1;">
                    <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">Due Date</div>
                    <div style="font-size: 16px; font-weight: 600; color: #0f172a;">{{ $dueDate }}</div>
                </div>
            @endif
        </div>

        @if($invoiceTypeName)
            <div style="margin-top: 18px; font-size: 14px; color: #475569;">
                <strong>Type:</strong> {{ $invoiceTypeName }}
            </div>
        @endif

        @if($isCISInvoice)
            <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px;">
                <div style="min-width: 180px; flex: 1;">
                    <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">CIS Deduction</div>
                    <div style="font-size: 16px; font-weight: 600; color: #0f172a;">{{ $currency }} {{ number_format($cisTax, 2, '.', '') }}</div>
                </div>
                <div style="min-width: 180px; flex: 1;">
                    <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">Amount Payable</div>
                    <div style="font-size: 16px; font-weight: 600; color: #0f172a;">{{ $currency }} {{ number_format($cisNet, 2, '.', '') }}</div>
                </div>
            </div>
        @endif
    </div>

    @if($showPaymentLink)
        <div style="margin-bottom: 24px; padding: 20px; border-radius: 12px; background: #ffffff; border: 1px solid #dbeafe;">
            <p style="font-size: 16px; line-height: 1.75; color: #0f172a; margin: 0 0 12px 0;"><strong>Payment Link</strong></p>
            <p style="margin: 0;"><a href="{{ $paymentLink }}" target="_blank" style="color: #1d4ed8; text-decoration: none;">{{ $paymentLink }}</a></p>
        </div>
    @endif

    @if($bankDetails)
        <div style="margin-bottom: 24px; padding: 20px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Bank details</p>
            <div style="font-size: 14px; color: #475569; line-height: 1.75; white-space: pre-line;">{{ $bankDetails }}</div>
        </div>
    @endif

    @if($senderName || $senderCompany || $senderEmail || $senderPhone)
        <div style="margin-bottom: 24px; padding: 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Sender Information</p>
            @if($senderCompany)
                <div style="font-size: 14px; color: #475569; line-height: 1.75;"><strong>Company:</strong> {{ $senderCompany }}</div>
            @endif
            @if($senderName)
                <div style="font-size: 14px; color: #475569; line-height: 1.75;"><strong>Name:</strong> {{ $senderName }}</div>
            @endif
            @if($senderEmail)
                <div style="font-size: 14px; color: #475569; line-height: 1.75;"><strong>Email:</strong> {{ $senderEmail }}</div>
            @endif
            @if($senderPhone)
                <div style="font-size: 14px; color: #475569; line-height: 1.75;"><strong>Phone:</strong> {{ $senderPhone }}</div>
            @endif
        </div>
    @endif

    <div style="margin-top: 32px; color: #475569; font-size: 14px; line-height: 1.75;">
        <p style="margin: 0 0 6px 0;">If you have any questions or require any changes, please reach out directly to the sender.</p>
        <p style="margin: 0 0 6px 0;">Warm regards,</p>
        <p style="margin: 0; font-weight: 600;">{{ $senderName ?: 'BookWise' }}</p>
    </div>
@endsection
