@extends('emails.preview.master-preview')

@section('email-content')
<!-- Greeting -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;" class="responsive-title">
            Welcome to BookWise
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            Hello <strong>{{ $mailData['name'] }}</strong>,
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            You have been added to <strong>BookWise</strong> by <strong>{{ $mailData['company_name'] }}</strong>.
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;" class="responsive-body">
            This invitation gives you access to the platform based on your assigned role. We're happy to have you onboard and look forward to working together more efficiently.
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 32px;" class="responsive-body">
            Click the button below to set your password and sign in for the first time. For security purposes, this link will expire in <strong>60 minutes</strong>.
        </td>
    </tr>
</table>

<!-- CTA Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td align="center" style="background-color: #1988e1; border-radius: 6px; padding: 14px 32px;" bgcolor="#1988e1" class="responsive-button-padding">
            <!--[if (gte mso 9)|(IE)]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ $mailData['activation_url'] }}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="#1988e1">
                <v:textbox inset="0px,0px,0px,0px">
                    <center style="color:#ffffff; font-family:Arial; font-size:16px; font-weight:bold;">
                        Activate Your Account
                    </center>
                </v:textbox>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="{{ $mailData['activation_url'] }}" 
               target="_blank" 
               style="display: inline-block; font-size: 16px; font-weight: bold; line-height: 1.4; color: #ffffff; text-decoration: none;">
                Activate Your Account
            </a>
            <!--<![endif]-->
        </td>
    </tr>
</table>
@endsection
