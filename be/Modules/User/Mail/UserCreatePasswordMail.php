<?php

namespace Modules\User\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UserCreatePasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $mailData;
    public $logoUrl;
    public $companyName;

    public function __construct($mailData, $logoUrl = null, $companyName = null)
    {
        $this->mailData = $mailData;
        $this->logoUrl = $logoUrl;
        $this->companyName = $companyName;
    }

    public function build()
    {
        return $this->subject('Create Your Password')
                    ->view('mail.create-password-email')
                    ->with([
                        'mailData' => $this->mailData,
                        'logoUrl' => $this->logoUrl,
                        'companyName' => $this->companyName,
                    ]);
    }
}
