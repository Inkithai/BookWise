@extends('emails.preview.master-preview')

@section('email-content')
@php
    $upgradeUrl = ($frontendUrl ?? config('app.url')) . '/settings?tab=upgrade-plan';
    $trialEnd = $subscription->trial_ends_at
        ? \Carbon\Carbon::parse($subscription->trial_ends_at)->toFormattedDateString()
        : null;
@endphp

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="font-size: 24px; font-weight: bold; line-height: 30px; color: #1a1a1a; padding-bottom: 16px;">
            @if (str_starts_with($type, 'trial_reminder_'))
                Your trial ends in {{ $daysRemaining ?? '' }} day{{ ($daysRemaining ?? 0) === 1 ? '' : 's' }}
            @elseif ($type === 'trial_ended_free')
                You are now on the Free plan
            @else
                Subscription update
            @endif
        </td>
    </tr>
    <tr>
        <td style="font-size: 16px; line-height: 24px; color: #333333; padding-bottom: 24px;">
            Hello <strong>{{ $user->first_name }}</strong>,
        </td>
    </tr>
</table>

@if (str_starts_with($type, 'trial_reminder_'))
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 20px; border-radius: 4px;">
            <p style="font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 12px;">
                Your <strong>1-month full-access trial</strong> ends on
                <strong>{{ $trialEnd }}</strong>.
            </p>
            <p style="font-size: 15px; line-height: 22px; color: #4338ca; margin: 0;">
                Upgrade to Business Pro or Business Premium to keep premium features, or continue on the
                <strong>Free plan</strong> automatically when the trial ends (no charge).
            </p>
        </td>
    </tr>
</table>
@elseif ($type === 'trial_ended_free')
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px;">
            <p style="font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 12px;">
                Your trial has ended. Your account is now on the <strong>Free plan</strong> with standard limits.
            </p>
            <p style="font-size: 15px; line-height: 22px; color: #047857; margin: 0;">
                You can upgrade anytime to unlock recurring statements, more templates, online payments, and more.
            </p>
        </td>
    </tr>
</table>
@elseif ($type === 'grace_started')
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px;">
            <p style="font-size: 16px; line-height: 24px; color: #333333;">
                Your trial period has ended. Please choose a paid plan or continue on Free.
            </p>
        </td>
    </tr>
</table>
@elseif ($type === 'grace_expired')
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; border-radius: 4px;">
            <p style="font-size: 16px; line-height: 24px; color: #721c24;">
                Your trial has ended. Please upgrade or continue on the Free plan to keep using Invoice.
            </p>
        </td>
    </tr>
</table>
@endif

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
        <td align="center" style="background-color: #1988e1; border-radius: 6px; padding: 14px 32px;">
            <a href="{{ $upgradeUrl }}" target="_blank" style="font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">
                View plans &amp; pricing
            </a>
        </td>
    </tr>
</table>
@endsection
