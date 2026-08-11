<?php

namespace Modules\User\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UserResetPasswordMail extends Mailable
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
        return $this->subject('Reset Your Password')
                    ->view('mail.reset-password-email')
                    ->with([
                        'mailData' => $this->mailData,
                        'logoUrl' => $this->logoUrl,
                        'companyName' => $this->companyName,
                    ]);
    }
}
