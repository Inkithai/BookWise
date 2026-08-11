@extends('emails.preview.master-preview')

@section('email-content')
<!-- Greeting -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;" class="responsive-title">
            Subscription Expired
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            Hello <strong>{{ $user->first_name }}</strong>,
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            We attempted to charge your subscription but the payment failed.
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #dc3545; padding-bottom: 32px;" class="responsive-body">
            Your subscription is now <strong>inactive</strong> and your account has been <strong>deactivated</strong>.
        </td>
    </tr>
</table>

<!-- Payment Details Box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#f8d7da">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="font-size: 14px; font-weight: bold; line-height: 20px; color: #721c24; padding-bottom: 12px;">
                        Failed Payment Details
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
            </table>
        </td>
    </tr>
</table>

<!-- CTA Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td align="center" style="background-color: #1988e1; border-radius: 6px; padding: 14px 32px;" bgcolor="#1988e1" class="responsive-button-padding">
            <!--[if (gte mso 9)|(IE)]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ url('/login') }}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="#1988e1">
                <v:textbox inset="0px,0px,0px,0px">
                    <center style="color:#ffffff; font-family:Arial; font-size:16px; font-weight:bold;">
                        Reactivate Your Account
                    </center>
                </v:textbox>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="{{ url('/login') }}" 
               target="_blank" 
               style="display: inline-block; font-size: 16px; font-weight: bold; line-height: 1.4; color: #ffffff; text-decoration: none;">
                Reactivate Your Account
            </a>
            <!--<![endif]-->
        </td>
    </tr>
</table>

<!-- Action Required Notice -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 15px; line-height: 22px; color: #333333;" class="responsive-body">
            Please login to your account and make the payment to reactivate your service.
        </td>
    </tr>
</table>
@endsection
