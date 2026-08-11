<?php

namespace Modules\Invoice\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomMailable extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Extend the to function to check for an environment variable.
     *
     * @param  string  $email
     * @return $this
     */
    public function to($email, $name = null)
    {
        // Check if the specific email is set in the environment
        $specificEmail = env('MAIL_DEV', $email);

        // Call the parent to function with the resolved email
        return parent::to($specificEmail, $name);
    }
}
