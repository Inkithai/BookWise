<?php

namespace Modules\Invoice\Services;

use App\Enums\InvoicePaymentStatusEnum;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Support\Facades\Log;

class InvoiceWebHookService
{
    public function __construct(
        private ?InvoiceAccountingServiceInterface $accounting = null,
    ) {}

    public function handleCheckoutCompleted($session)
    {
        $invoiceId = $session->metadata->invoice_id ?? null;

        if (!$invoiceId) {
            Log::warning('Stripe: Missing invoice_id in session metadata');
            return;
        }

        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            Log::warning("Stripe: Invoice {$invoiceId} not found");
            return;
        }

        $invoice->update([
            'payment_status' => InvoicePaymentStatusEnum::PAID,
            'stripe_payment_intent_id' => $session->payment_intent,
            'paid_at' => now(),
            'status' => InvoiceStatus::Paid,
            'stripe_response' => json_encode($session),
        ]);

        Log::info("Invoice {$invoice->id} marked as PAID.");

        // Post the cash-receipt journal entry to clear AR (DR Bank, CR AR).
        // Idempotent — safe to call even if a ledger entry already exists.
        try {
            $this->resolveAccountingService()?->postPayment($invoice);
        } catch (\Throwable $e) {
            Log::error("Stripe: Failed to post ledger payment for invoice {$invoice->id}: ".$e->getMessage());
        }
    }

    /**
     * Handle failed payments (PaymentIntent failure)
     */
    public function handlePaymentFailed($paymentIntent)
    {
        $invoiceId = $paymentIntent->metadata->invoice_id ?? null;
        $connectedAccountId = $paymentIntent->account ?? null;

        if (!$invoiceId) {
            Log::warning('Stripe: Missing invoice_id in payment intent');
            return;
        }

        $invoice = Invoice::where('id', $invoiceId)
            ->when(
                $connectedAccountId,
                fn($query) =>
                $query->whereHas('user', fn($q) => $q->where('stripe_account_id', $connectedAccountId))
            )
            ->first();

        if (!$invoice) {
            return;
        }

        $invoice->update([
            'payment_status' => InvoicePaymentStatusEnum::FAILED,
            'stripe_response' => json_encode($paymentIntent),
        ]);

        Log::info("Invoice {$invoice->id} marked as FAILED.");
    }

    /**
     * Handle Checkout Session expiration
     */
    public function handleSessionExpired($session)
    {
        $invoiceId = $session->metadata->invoice_id ?? null;
        $connectedAccountId = $session->account ?? null;

        if (!$invoiceId) {
            return;
        }

        $invoice = Invoice::where('id', $invoiceId)
            ->when(
                $connectedAccountId,
                fn($query) =>
                $query->whereHas('user', fn($q) => $q->where('stripe_account_id', $connectedAccountId))
            )
            ->first();

        if (!$invoice) {
            return;
        }

        $invoice->update([
            'payment_status' => InvoicePaymentStatusEnum::EXPIRED,
        ]);

        Log::info("Invoice {$invoice->id} marked as EXPIRED.");
    }

    /**
     * Resolve the accounting service. Falls back to the container so the
     * dependency is optional — the webhook still works if the accounting
     * module is not installed.
     */
    private function resolveAccountingService(): ?InvoiceAccountingServiceInterface
    {
        if ($this->accounting) {
            return $this->accounting;
        }

        if (!interface_exists(InvoiceAccountingServiceInterface::class)) {
            return null;
        }

        try {
            return app(InvoiceAccountingServiceInterface::class);
        } catch (\Throwable) {
            return null;
        }
    }
}
