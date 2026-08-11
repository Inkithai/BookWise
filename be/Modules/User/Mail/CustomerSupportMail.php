<?php

namespace Modules\User\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Modules\User\Models\CustomerSupport;

class CustomerSupportMail extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $logoUrl;
    public $companyName;

    /**
     * Create a new message instance.
     */
    public function __construct(CustomerSupport $ticket, $logoUrl = null, $companyName = null)
    {
        $this->ticket = $ticket;
        $this->logoUrl = $logoUrl;
        $this->companyName = $companyName;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $subject = 'New Support Request received from BookWise';

        $mail = $this->subject($subject)
                     ->view('mail.customer-support')
                     ->with([
                         'ticket' => $this->ticket,
                         'logoUrl' => $this->logoUrl,
                         'companyName' => $this->companyName,
                     ]);

        // Attach file if exists
        if ($this->ticket->file_path && file_exists(storage_path('app/public/' . $this->ticket->file_path))) {
            $mail->attach(storage_path('app/public/' . $this->ticket->file_path));
        }

        return $mail;
    }
}
