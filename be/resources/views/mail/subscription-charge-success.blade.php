@extends('emails.preview.master-preview')

@section('email-content')
<!-- Greeting -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;" class="responsive-title">
            Payment Successful
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 32px;" class="responsive-body">
            Hello <strong>{{ $user->first_name }}</strong>,<br><br>
            Your subscription payment has been successfully charged.
        </td>
    </tr>
</table>

<!-- Payment Details Box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#d4edda">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="font-size: 14px; font-weight: bold; line-height: 20px; color: #155724; padding-bottom: 12px;">
                        Payment Details
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong>Plan:</strong> {{ $subscription->plan_name }}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong>Amount:</strong> £{{ number_format($subscription->amount, 2) }}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong>Next Billing Date:</strong> {{ $subscription->next_payment_at }}
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- Thank You Message -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 15px; line-height: 22px; color: #333333;" class="responsive-body">
            Thank you for using our service.
        </td>
    </tr>
</table>
@endsection
