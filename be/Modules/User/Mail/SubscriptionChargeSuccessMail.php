<?php

namespace Modules\User\Mail;

use Illuminate\Mail\Mailable;

class  SubscriptionChargeSuccessMail extends Mailable
{

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
        return $this->subject('Subscription Payment Successful')
            ->view('mail.subscription-charge-success')
            ->with([
                'logoUrl' => $this->logoUrl,
                'companyName' => $this->companyName,
            ]);
    }
}
