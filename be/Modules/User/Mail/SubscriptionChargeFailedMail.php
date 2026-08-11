<?php

namespace Modules\User\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SubscriptionChargeFailedMail extends Mailable
{
    use SerializesModels;

    public $user;
    public $subscription;
    public $logoUrl;
    public $companyName;

    public function __construct($user, $subscription, $logoUrl = null, $companyName = null)
    {
        $this->user = $user;
        $this->subscription = $subscription;
        $this->logoUrl = $logoUrl;
        $this->companyName = $companyName;
    }

    public function build()
    {
        return $this->subject('Subscription Payment Failed - Account Expired')
            ->view('mail.subscription-charge-fail')
            ->with([
                'logoUrl' => $this->logoUrl,
                'companyName' => $this->companyName,
            ]);
    }
}
