@extends('emails.preview.master-preview')

@section('email-content')
<!-- Header -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;" class="responsive-title">
            New Support Request
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 32px;" class="responsive-body">
            A new customer support request has been submitted. Please review the details below.
        </td>
    </tr>
</table>

<!-- Ticket Details Box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #f0f9ff; border-left: 4px solid #1988e1; padding: 20px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#f0f9ff">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="font-size: 14px; font-weight: bold; line-height: 20px; color: #1988e1; padding-bottom: 16px;">
                        Ticket Information
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Ticket ID:</strong>
                        #{{ $ticket->id }}
                    </td>
                </tr>
                @if($ticket->first_name || $ticket->last_name)
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Name:</strong>
                        {{ $ticket->first_name }} {{ $ticket->last_name }}
                    </td>
                </tr>
                @endif
                @if($ticket->email)
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Email:</strong>
                        <a href="mailto:{{ $ticket->email }}" style="color: #1988e1; text-decoration: none;">{{ $ticket->email }}</a>
                    </td>
                </tr>
                @endif
                @if($ticket->phone_number)
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Phone:</strong>
                        {{ $ticket->phone_number }}
                    </td>
                </tr>
                @endif
                @if($ticket->problem_category)
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Category:</strong>
                        {{ $ticket->problem_category }}
                    </td>
                </tr>
                @endif
                @if($ticket->specify_others)
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Details:</strong>
                        {{ $ticket->specify_others }}
                    </td>
                </tr>
                @endif
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Submitted:</strong>
                        {{ $ticket->created_at->format('d M Y, h:i A') }}
                    </td>
                </tr>
                @if($ticket->file_path)
                <tr>
                    <td style="padding: 8px 0; font-size: 15px; line-height: 22px; color: #333333;">
                        <strong style="color: #1988e1; width: 140px; display: inline-block;">Attachment:</strong>
                        <span style="background-color: #28a745; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px;">File Attached</span>
                    </td>
                </tr>
                @endif
            </table>
        </td>
    </tr>
</table>

<!-- Problem Description -->
@if($ticket->description)
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="font-size: 16px; font-weight: bold; line-height: 24px; color: #1988e1; padding-bottom: 12px;">
            Problem Description:
        </td>
    </tr>
    <tr>
        <td style="background-color: #f4f6fb; padding: 16px; border-left: 4px solid #1988e1; color: #333; line-height: 1.7; border-radius: 4px;">
            {{ $ticket->description }}
        </td>
    </tr>
</table>
@endif
@endsection
