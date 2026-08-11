<?php

namespace Modules\User\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TrialStatusMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        public $user,
        public $subscription,
        public string $type,
        public ?string $logoUrl = null,
        public ?string $companyName = null,
        public ?int $daysRemaining = null,
    ) {}

    public function build()
    {
        $subject = match ($this->type) {
            'trial_reminder_7', 'trial_reminder_3', 'trial_reminder_1' => 'Your free trial is ending soon',
            'trial_ended_free' => 'Your trial ended — you are now on the Free plan',
            'grace_started' => 'Trial ended — grace period started',
            'grace_expired' => 'Account inactive — upgrade required',
            default => 'Subscription update',
        };

        return $this->subject($subject)
            ->view('mail.trial-status')
            ->with([
                'logoUrl' => $this->logoUrl,
                'companyName' => $this->companyName,
                'daysRemaining' => $this->daysRemaining,
                'frontendUrl' => rtrim((string) config('app.frontend_url', config('app.url')), '/'),
            ]);
    }
}
