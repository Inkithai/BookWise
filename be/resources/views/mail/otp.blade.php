@extends('emails.preview.master-preview')

@section('email-content')
<!-- Greeting -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;" class="responsive-title">
            Email Verification Required
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            Hello <strong>{{ $mailData['name'] }}</strong>,
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            Thank you for registering with us. To complete your registration, please use the OTP below to verify your email address:
        </td>
    </tr>
</table>

<!-- OTP Box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #f0f9ff; border-left: 4px solid #1988e1; padding: 20px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#f0f9ff">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="font-size: 14px; font-weight: bold; line-height: 20px; color: #1988e1; padding-bottom: 8px;">
                        Your Verification Code
                    </td>
                </tr>
                <tr>
                    <td align="center" style="font-size: 32px; font-weight: bold; line-height: 44px; color: #1a1a1a; padding: 16px 0; letter-spacing: 4px;" class="responsive-code">
                        {{ $mailData['otp'] }}
                    </td>
                </tr>
                <tr>
                    <td style="font-size: 13px; line-height: 18px; color: #666666; text-align: center;">
                        This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<!-- Security Notice -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 15px; line-height: 22px; color: #333333; padding-bottom: 16px;" class="responsive-body">
            If you did not initiate this request, you can safely ignore this email.
        </td>
    </tr>
</table>
@endsection
