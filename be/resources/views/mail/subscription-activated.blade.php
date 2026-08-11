@extends('emails.preview.master-preview')

@section('email-content')
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;">
            Plan activated
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 32px;">
            Hello <strong>{{ $user->first_name }}</strong>,<br><br>
            Your subscription is now <strong>active</strong>. You can use all features included in your plan right away.
        </td>
    </tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #e8f4fd; border-left: 4px solid #1e88e5; padding: 20px; border-radius: 4px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="font-size: 15px; line-height: 22px; color: #333333; padding: 8px 0;">
                        <strong>Plan:</strong> {{ $subscription->plan_name }}
                    </td>
                </tr>
                @if((float) $subscription->amount > 0)
                <tr>
                    <td style="font-size: 15px; line-height: 22px; color: #333333; padding: 8px 0;">
                        <strong>Amount:</strong> £{{ number_format((float) $subscription->amount, 2) }}
                    </td>
                </tr>
                @endif
                <tr>
                    <td style="font-size: 15px; line-height: 22px; color: #333333; padding: 8px 0;">
                        <strong>Billing:</strong> {{ ucfirst($subscription->plan_type ?? 'monthly') }}
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 14px; line-height: 22px; color: #666666;">
            Log in to your dashboard to create invoices, manage clients, and use your plan features.
        </td>
    </tr>
</table>
@endsection
