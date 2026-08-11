<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <title>{{ $emailTitle ?? 'BookWise' }}</title>
    
    <!--[if (gte mso 9)|(IE)]>
    <style type="text/css">
        table, td { border-collapse: collapse; }
        .outlook-table { width: 600px !important; margin: 0 auto !important; }
        .outlook-button-td { background: #1988e1 !important; }
        .outlook-fallback-bg { background: #f8f8f8; }
    </style>
    <![endif]-->
    
    <style type="text/css">
        /* Client Reset */
        body, table, td, p, a {
            margin: 0;
            padding: 0;
        }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-text-size-adjust: 100% !important;
            -ms-text-size-adjust: 100% !important;
        }
        
        table {
            /* stylelint-disable property-no-vendor-prefix */
            /* @mso-ignore: mso-table-lspace, mso-table-rspace */
            /* csslint ignore:start */
            /* @validator-ignore */
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            /* csslint ignore:end */
            /* stylelint-enable property-no-vendor-prefix */
        }
        
        img {
            border: 0;
            max-width: 100%;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
            .responsive-container { width: 100% !important; max-width: 100% !important; }
            .responsive-padding { padding-left: 16px !important; padding-right: 16px !important; }
            .responsive-header-padding { padding: 20px 16px !important; }
            .responsive-footer-padding { padding: 20px 16px !important; }
            .responsive-button-padding { padding: 12px 20px !important; }
            .responsive-title { font-size: 22px !important; line-height: 28px !important; }
            .responsive-body { font-size: 15px !important; line-height: 22px !important; }
            .responsive-logo { max-width: 140px !important; height: auto !important; }
            .responsive-code { font-size: 26px !important; letter-spacing: 4px !important; }
        }
        
        @media only screen and (max-width: 480px) {
            .responsive-padding { padding-left: 12px !important; padding-right: 12px !important; }
            .responsive-title { font-size: 20px !important; }
            .responsive-body { font-size: 14px !important; line-height: 21px !important; }
            .responsive-button-padding a { 
                display: block !important; 
                text-align: center !important; 
            }
            .badge-container td {
                display: block !important;
                margin-bottom: 12px !important;
                padding: 0 !important;
                text-align: center !important;
            }
            .badge-container td:last-child {
                margin-bottom: 0 !important;
            }
        }
        
        /* Yahoo / AOL Fix */
        @media screen yahoo {
            .responsive-container { width: 100% !important; }
        }
        
        /* Outlook.com Fix */
        .ExternalClass, .ReadMsgBody {
            width: 100%;
            background-color: #f8f8f8;
        }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
            line-height: 100%;
        }
        
        /* Button Hover State */
        @media (hover: hover) {
            .responsive-button-padding a:hover {
                opacity: 0.9 !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
    
    <!-- Outlook/IE Center Wrapper -->
    <!--[if (gte mso 9)|(IE)]>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f8f8">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" class="outlook-table">
                    <tr>
                        <td>
    <![endif]-->
    
     
    
    <!-- Outer Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f8f8;" bgcolor="#f8f8f8">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <!-- Email Container (max-width: 600px) -->
                <table role="presentation article" cellspacing="0" cellpadding="0" border="0" width="100%" class="responsive-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;" bgcolor="#ffffff">
                    
                    <!-- Outlook border-radius fallback -->
                    <!--[if (gte mso 9)|(IE)]>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td bgcolor="#ffffff">
                    <![endif]-->
                    
                    <!-- ==================== HEADER ==================== -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 24px 24px 24px 24px; border-bottom: 3px solid #1988e1;" class="responsive-header-padding" bgcolor="#ffffff">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a;">
                                        {{ $companyName ?? 'BookWise' }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- ==================== BODY CONTENT ==================== -->
                    <tr>
                        <td style="padding: 32px 24px 32px 24px;" class="responsive-padding">
                            
                            @hasSection('email-content')
                                @yield('email-content')
                            @else
                            
                            <!-- Greeting -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;" class="responsive-title">
                                        {{ $greeting ?? 'Hello ' . ($customerName ?? 'Valued Customer') . ',' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 32px;" class="responsive-body">
                                        {{ $message ?? 'Thank you for using BookWise. This is your standardized email template with dynamic content support.' }}
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Info Box -->
                            @if(isset($infoBox) || isset($infoCode))
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="background-color: #f0f9ff; border-left: 4px solid #1988e1; padding: 20px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#f0f9ff">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-size: 14px; font-weight: bold; line-height: 20px; color: #1988e1; padding-bottom: 8px;">
                                                    {{ $infoTitle ?? 'Important Information' }}
                                                </td>
                                            </tr>
                                            @if(isset($infoCode))
                                            <tr>
                                                <td align="center" style="font-size: 32px; font-weight: bold; line-height: 44px; color: #1a1a1a; padding: 16px 0; letter-spacing: 4px;" class="responsive-code">
                                                    {{ $infoCode }}
                                                </td>
                                            </tr>
                                            @endif
                                            <tr>
                                                <td style="font-size: 13px; line-height: 18px; color: #666666; text-align: center;">
                                                    {{ $infoSubtitle ?? 'This information is time-sensitive' }}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            @endif
                            
                            <!-- CTA Button (Outlook-safe) -->
                            @if(isset($ctaUrl) && isset($ctaText))
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center" style="background-color: #1988e1; border-radius: 6px; padding: 14px 32px;" bgcolor="#1988e1" class="responsive-button-padding">
                                        <!--[if (gte mso 9)|(IE)]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ $ctaUrl }}" style="height:46px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#1988e1">
                                            <v:textbox inset="0px,0px,0px,0px">
                                                <center style="color:#ffffff; font-family:Arial; font-size:16px; font-weight:bold;">
                                                    {{ $ctaText }}
                                                </center>
                                            </v:textbox>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <a href="{{ $ctaUrl }}" 
                                           target="_blank" 
                                           style="display: inline-block; font-size: 16px; font-weight: bold; line-height: 1.4; color: #ffffff; text-decoration: none;">
                                            {{ $ctaText }}
                                        </a>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                            @endif
                            
                            <!-- Additional Content -->
                            @if(isset($additionalContent))
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                                <tr>
                                    <td style="font-size: 15px; line-height: 22px; color: #333333;" class="responsive-body">
                                        {!! $additionalContent !!}
                                    </td>
                                </tr>
                            </table>
                            @endif
                            
                            <!-- Signature -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="font-size: 15px; line-height: 22px; color: #333333; padding-top: 16px;">
                                        {{ $signature ?? 'Warm regards,' }}<br>
                                        <strong>{{ $senderName ?? config('mail-config.company_name', 'BookWise') }}</strong>
                                    </td>
                                </tr>
                            </table>
                            @endif
                            
                        </td>
                    </tr>
                    
                    <!-- ==================== FOOTER ==================== -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 24px 24px 24px 24px; border-top: 1px solid #e0e0e0;" class="responsive-footer-padding" bgcolor="#f9f9f9">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                
                                <!-- Powered By + Logo -->
                                <tr>
                                    <td align="center" style="padding-bottom: 16px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td valign="middle" style="font-size: 12px; color: #999999; padding-right: 6px;">
                                                    Powered by
                                                </td>
                                                <td valign="middle">
                                                    <img src="{{ $logoUrl ?? config('mail-config.logo_url') }}"
                                                        alt="Logo"
                                                        width="24"
                                                        style="
                                                            max-width:24px;
                                                            width:100%;
                                                            height:auto;
                                                            display:block;
                                                            border:0;
                                                        ">
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Support Contact -->
                                <tr>
                                    <td style="font-size: 14px; line-height: 20px; color: #666666; text-align: center; padding-bottom: 16px;">
                                        Need help? Contact us at<br>
                                        <a href="mailto:{{ $supportEmail ?? 'support@bookwise.com' }}" style="color: #1988e1; text-decoration: none; font-weight: bold;">
                                            {{ $supportEmail ?? 'support@bookwise.com' }}
                                        </a>
                                    </td>
                                </tr>
                                
                                @if(!isset($showAppBadges) || $showAppBadges !== false)
                                <!-- "Download our app" label -->
                                <tr>
                                    <td align="center" style="padding: 4px 0 6px 0;">
                                        <span style="font-size: 12px; color: #999999;">Download our app</span>
                                    </td>
                                </tr>
                                <!-- Badges -->
                                <tr>
                                    <td align="center" style="padding: 0 0 8px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="badge-container" style="margin: 0 auto;">
                                            <tr>
                                                <!-- Apple Badge - PNG for Outlook compatibility -->
                                                <td align="center" valign="middle" width="120" style="width: 120px; padding: 0 6px;" class="badge-item">
                                                    <!--[if (gte mso 9)|(IE)]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="#" style="height:40px;v-text-anchor:middle;width:120px;" arcsize="0%" stroke="f">
                                                        <v:fill type="frame" src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" color="#000000"/>
                                                        <center style="color:#ffffff; font-family:Arial; font-size:11px;">App Store</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <a href="#" target="_blank" style="display: inline-block;">
                                                        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                                                             alt="Download on the App Store" 
                                                             width="120" 
                                                             height="40" 
                                                             style="display: block; width: 120px !important; height: 40px !important; border: 0;">
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                                <!-- Google Badge - PNG for Outlook compatibility -->
                                                <td align="center" valign="middle" width="120" style="width: 120px; padding: 0 6px;" class="badge-item">
                                                    <!--[if (gte mso 9)|(IE)]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="#" style="height:40px;v-text-anchor:middle;width:120px;" arcsize="0%" stroke="f">
                                                        <v:fill type="frame" src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" color="#000000"/>
                                                        <center style="color:#ffffff; font-family:Arial; font-size:11px;">Google Play</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <a href="#" target="_blank" style="display: inline-block;">
                                                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                                                             alt="Get it on Google Play" 
                                                             width="120" 
                                                             height="40" 
                                                             style="display: block; width: 120px !important; height: 40px !important; border: 0;">
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                @endif
                                
                                <!-- Copyright -->
                                <tr>
                                    <td style="font-size: 12px; line-height: 18px; color: #999999; text-align: center; padding-top: 12px;">
                                        © {{ date('Y') }} {{ config('mail-config.company_name', 'BookWise') }}. All rights reserved.<br>
                                        <span style="font-size: 11px;">This is an automated email. Please do not reply directly.</span>
                                    </td>
                                </tr>
                                                                
                            </table>
                        </td>
                    </tr>
                    
                    <!--[if (gte mso 9)|(IE)]>
                            </td>
                        </tr>
                    </table>
                    <![endif]-->
                    
                </table>
                <!-- End Email Container -->
            </td>
        </tr>
    </table>
    <!-- End Outer Container -->
    
    <!--[if (gte mso 9)|(IE)]>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    <![endif]-->
    
</body>
</html>