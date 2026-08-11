<?php

namespace Modules\User\Mail;

use Illuminate\Mail\Mailable;

class SubscriptionActivatedMail extends Mailable
{
    public function __construct(
        public $user,
        public $subscription,
        public ?string $logoUrl = null,
        public ?string $companyName = null,
    ) {}

    public function build()
    {
        return $this->subject('Your BookWise plan is now active')
            ->view('mail.subscription-activated')
            ->with([
                'logoUrl' => $this->logoUrl,
                'companyName' => $this->companyName,
            ]);
    }
}
