<?php

namespace Modules\Invoice\Services;

use App\Enums\InvoiceStatus;
use App\Helpers\EmailTemplateHelper;
use App\Models\HostUserDetail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Modules\Invoice\Mail\InvoiceSendEmail;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Repositories\InvoiceInterface;
use Modules\User\Models\User;
use Modules\User\Models\User as InvoiceUser;
use Modules\User\Models\UserBank;

/**
 * Generates invoice PDFs and sends them by email (cron / automation).
 */
class InvoicePdfMailService
{
    public function __construct(
        private readonly InvoiceInterface $invoiceRepository
    ) {}

    public function billingUserForHost(int $hostId): ?InvoiceUser
    {
        if ($hostId <= 0) {
            return null;
        }

        return InvoiceUser::primaryBillingUserForHost($hostId);
    }

    /**
     * @return array{sender_name: ?string, sender_company_name: ?string, sender_email: ?string, sender_phone: ?string}
     */
    public function buildSenderSnapshot(Invoice $invoice, InvoiceUser $billingUser): array
    {
        $hostId = (int) ($invoice->host_id ?? $billingUser->host_id ?? 0);
        $details = collect();
        if ($hostId > 0) {
            $details = HostUserDetail::query()
                ->where('host_id', $hostId)
                ->where('type', 'company_details')
                ->get()
                ->unique('name')
                ->keyBy('name');
        }

        $detailValue = function (string $key) use ($details) {
            if (! isset($details[$key])) {
                return null;
            }

            return $details[$key]->values ?? $details[$key]->files ?? null;
        };

        return [
            'sender_name' => trim((string) (($billingUser->first_name ?? '') . ' ' . ($billingUser->last_name ?? ''))) ?: null,
            'sender_company_name' => $detailValue('company_name'),
            'sender_email' => $detailValue('business_email') ?? ($billingUser->email ?? null),
            'sender_phone' => $detailValue('phone_number') ?? ($billingUser->phone_number ?? null),
        ];
    }

    public function hydrateInvoiceSnapshots(Invoice $invoice, InvoiceUser $billingUser): void
    {
        $bank = UserBank::query()->where('user_id', $billingUser->id)->first();
        $invoice->account_name = $bank?->account_name;
        $invoice->account_number = $bank?->account_number;
        $invoice->sort_code = $bank?->sort_code;

        $hostId = (int) ($invoice->host_id ?? 0);
        if ($hostId > 0) {
            $address = HostUserDetail::query()
                ->where('host_id', $hostId)
                ->where('type', 'company_details')
                ->where('name', 'company_address')
                ->value('values');
            if ($address) {
                $invoice->company_address = $address;
            }
        }
    }

    public function renderInvoicePdf(Invoice $invoice, InvoiceUser $billingUser, ?string $paymentLink = null): string
    {
        $invoice->setRelation('user', $billingUser->loadMissing('bank'));
        $this->hydrateInvoiceSnapshots($invoice, $billingUser);
        $invoice->loadMissing('client', 'items');

        $senderSnapshot = $this->buildSenderSnapshot($invoice, $billingUser);
        $viewData = [
            'invoice' => $invoice,
            'payment_link' => $paymentLink,
            'pdfUser' => $billingUser,
            'footerEmail' => $senderSnapshot['sender_email'] ?? null,
            'number' => $senderSnapshot['sender_phone'] ?? null,
        ];

        $view = match ($invoice->pdf_type) {
            'classic' => 'invoice::pdf.template_classic',
            'minimal' => 'invoice::pdf.template_minimal',
            'modern' => 'invoice::pdf.template_modern',
            'modern1' => 'invoice::pdf.template_modern1',
            default => 'invoice::pdf.general',
        };

        return Pdf::loadView($view, $viewData)
            ->setOption(['isFontSubSettingEnabled' => true])
            ->setPaper('a4', 'portrait')
            ->output();
    }

    /**
     * @return list<string> emails successfully sent
     */
    public function sendInvoiceEmail(
        Invoice $invoice,
        InvoiceUser $billingUser,
        array $recipientEmails,
        ?string $recipientName = null,
        ?string $additionalInfo = null,
    ): array {
        $recipientEmails = array_values(array_filter(array_unique(array_map(
            static fn ($e) => filter_var(trim((string) $e), FILTER_VALIDATE_EMAIL) ? trim((string) $e) : null,
            $recipientEmails
        ))));

        if ($recipientEmails === []) {
            return [];
        }

        $directory = storage_path('app/temp/invoices');
        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $pdfBinary = $this->renderInvoicePdf($invoice, $billingUser);
        $fileName = $invoice->code . '.pdf';
        $tempPdfPath = $directory . '/' . $fileName;
        file_put_contents($tempPdfPath, $pdfBinary);

        $senderSnapshot = $this->buildSenderSnapshot($invoice, $billingUser);
        $hostId = (int) ($invoice->host_id ?? $billingUser->host_id ?? 0);
        $branding = EmailTemplateHelper::resolveCompanyBranding($hostId, $billingUser->id);
        $ccEmail = $billingUser->email ?? null;

        $sent = [];
        try {
            foreach ($recipientEmails as $email) {
                try {
                    $mailer = Mail::to($email);
                    if ($ccEmail) {
                        $mailer = $mailer->cc($ccEmail);
                    }
                    $mailer->send(new InvoiceSendEmail([
                        'path' => $tempPdfPath,
                        'email' => $email,
                        'type' => 'invoice',
                        'name' => $recipientName ?? 'Customer',
                        'additional_info' => $additionalInfo,
                        'files' => [],
                        'payment_link' => null,
                        'bank_details' => (bool) $invoice->bank_payment,
                        'sender_snapshot' => $senderSnapshot,
                        'is_personal' => (int) $invoice->company_id === (int) $invoice->host_id,
                    ], $branding['logoUrl'], $branding['companyName']));
                    $sent[] = $email;
                } catch (\Throwable $mailEx) {
                    Log::error('InvoicePdfMailService: send failed', [
                        'invoice_id' => $invoice->id,
                        'email' => $email,
                        'error' => $mailEx->getMessage(),
                    ]);
                }
            }
        } finally {
            if (is_file($tempPdfPath)) {
                @unlink($tempPdfPath);
            }
        }

        if ($sent !== [] && $invoice->status !== InvoiceStatus::Paid) {
            $invoice->status = InvoiceStatus::MailSent;
            $invoice->save();
        }

        return $sent;
    }

    public function generateInvoiceCode(int $hostId): string
    {
        return $this->invoiceRepository->generateInvoiceCode($hostId);
    }
}
