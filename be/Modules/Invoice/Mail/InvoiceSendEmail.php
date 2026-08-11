<?php

namespace Modules\Invoice\Mail;

class InvoiceSendEmail extends CustomMailable
{
    /**
     * Create a new message instance.
     *
     * @return void
     */
    private $data;
    private $logoUrl;
    private $companyName;

    public function __construct($data, $logoUrl = null, $companyName = null)
    {
        $this->data = $data;
        $this->logoUrl = $logoUrl;
        $this->companyName = $companyName;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $defaultSubject = $this->data['type'] === 'receipt' ? 'Receipt' : 'Invoice';
        $subject = trim((string) ($this->data['subject'] ?? '')) ?: $defaultSubject;

        $email = $this->view('invoice::email.invoice-send', [
                'data' => $this->data,
                'logoUrl' => $this->logoUrl,
                'companyName' => $this->companyName,
            ])
            ->subject($subject)
            ->attach($this->data['path'], [
                'mime' => 'application/pdf',
            ]);

        //  Attach additional files if any
        if (!empty($this->data['files'])) {
            foreach ($this->data['files'] as $file) {
                $email->attach(
                    $file->getRealPath(),
                    [
                        'as'   => $file->getClientOriginalName(),
                        'mime' => $file->getMimeType(),
                    ]
                );
            }
        }

        return $email;
    }
}
