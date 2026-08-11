<?php

namespace Modules\Invoice\Services;

use App\Enums\InvoiceStatus;
use App\Models\Team;
use App\Services\Subscription\SubscriptionLimitService;
use App\Services\Subscription\SubscriptionPlanService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Models\InvoiceClient;
use Modules\Invoice\Models\InvoiceItem;
use Modules\Invoice\Models\InvoiceType;
use Modules\Invoice\Models\RecurringStatement;
use Modules\User\Models\User as InvoiceUser;

class RecurringStatementProcessorService
{
    public function __construct(
        private readonly InvoicePdfMailService $pdfMail,
        private readonly SubscriptionPlanService $planService,
        private readonly SubscriptionLimitService $limits,
    ) {}

    /**
     * @return array{processed: int, skipped: int, failed: int}
     */
    public function processDueStatements(?Carbon $asOf = null): array
    {
        $asOf = ($asOf ?? now())->startOfDay();
        $stats = ['processed' => 0, 'skipped' => 0, 'failed' => 0];

        $due = RecurringStatement::query()
            ->where('is_active', true)
            ->whereDate('next_run_at', '<=', $asOf)
            ->orderBy('id')
            ->get();

        foreach ($due as $schedule) {
            try {
                $result = $this->processOne($schedule, $asOf);
                $stats[$result]++;
            } catch (\Throwable $e) {
                $stats['failed']++;
                $schedule->update([
                    'last_error' => $e->getMessage(),
                    'last_processed_at' => now(),
                ]);
                Log::error('RecurringStatementProcessor: failed', [
                    'schedule_id' => $schedule->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $stats;
    }

    /** @return 'processed'|'skipped'|'failed' */
    public function processOne(RecurringStatement $schedule, ?Carbon $asOf = null): string
    {
        $asOf = ($asOf ?? now())->startOfDay();
        $hostId = (int) $schedule->host_id;
        $billingUser = $this->pdfMail->billingUserForHost($hostId);

        if (! $billingUser) {
            $schedule->update([
                'last_error' => 'No billing user for host.',
                'last_processed_at' => now(),
            ]);

            return 'skipped';
        }

        if (! $this->planService->canUseFeature($billingUser, 'recurring_statements')) {
            $schedule->update([
                'last_error' => 'Plan does not include recurring statements.',
                'last_processed_at' => now(),
            ]);

            return 'skipped';
        }

        $client = $schedule->client_id
            ? InvoiceClient::query()->where('host_id', $hostId)->find($schedule->client_id)
            : null;

        $recipientEmail = $client?->email;
        if (! $recipientEmail) {
            $schedule->update([
                'last_error' => 'Client email is required to send recurring invoice.',
                'last_processed_at' => now(),
            ]);

            return 'failed';
        }

        $this->limits->assertCanCreateInvoice($billingUser, $hostId);
        $this->limits->assertCanSendInvoice($billingUser, $hostId);

        if (! $this->planService->canUseTemplate($billingUser, (string) $schedule->pdf_type)) {
            $schedule->pdf_type = 'classic';
        }

        $amount = (float) ($schedule->amount ?? 0);
        if ($amount <= 0) {
            $schedule->update([
                'last_error' => 'Recurring amount must be greater than zero.',
                'last_processed_at' => now(),
            ]);

            return 'failed';
        }

        $currency = strtoupper((string) ($schedule->currency ?? 'GBP'));
        $dueDays = max(1, (int) config('subscription.recurring_due_days', 30));
        $invoiceDate = $asOf->toDateString();
        $dueDate = $asOf->copy()->addDays($dueDays)->toDateString();

        $invoice = DB::transaction(function () use (
            $schedule,
            $billingUser,
            $hostId,
            $client,
            $amount,
            $currency,
            $invoiceDate,
            $dueDate
        ) {
            $code = $this->pdfMail->generateInvoiceCode($hostId);
            $typeId = InvoiceType::query()->orderBy('id')->value('id');

            $invoice = Invoice::create([
                'host_id' => $hostId,
                'company_id' => $hostId,
                'team_id' => $schedule->team_id ?? Team::where('host_id', $hostId)->value('id'),
                'created_by' => $billingUser->id,
                'client_id' => $client?->id,
                'client_name' => $client?->name,
                'code' => $code,
                'type_id' => $typeId,
                'pdf_type' => $schedule->pdf_type ?? 'classic',
                'status' => InvoiceStatus::Created,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'total_discount' => 0,
                'total_vat' => 0,
                'total_amount' => $amount,
                'final_amount' => $amount,
                'quotation_title' => '',
                'quotation_content' => $schedule->notes ?? '',
                'payment_link' => false,
                'bank_payment' => true,
                'notes' => 'Auto-generated from recurring schedule: ' . $schedule->title,
            ]);

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'item_name' => $schedule->title,
                'description' => $schedule->notes ?? 'Recurring statement',
                'quantity' => 1,
                'unit_price' => $amount,
                'amount' => $amount,
                'vat' => 0,
                'discount' => 0,
                'total' => $amount,
                'item_currency' => $currency,
            ]);

            return $invoice->fresh(['client', 'items']);
        });

        $additionalInfo = 'This invoice was generated automatically from your recurring schedule "' . $schedule->title . '".';
        $sent = $this->pdfMail->sendInvoiceEmail(
            $invoice,
            $billingUser,
            [$recipientEmail],
            $client?->name,
            $additionalInfo
        );

        if ($sent === []) {
            $schedule->update([
                'last_invoice_id' => $invoice->id,
                'last_error' => 'Invoice created but email delivery failed.',
                'last_processed_at' => now(),
            ]);

            return 'failed';
        }

        $schedule->update([
            'last_run_at' => $asOf->toDateString(),
            'last_invoice_id' => $invoice->id,
            'last_error' => null,
            'last_processed_at' => now(),
            'next_run_at' => $this->advanceNextRun($schedule->next_run_at, $schedule->frequency)->toDateString(),
        ]);

        Log::info('RecurringStatementProcessor: invoice sent', [
            'schedule_id' => $schedule->id,
            'invoice_id' => $invoice->id,
            'emails' => $sent,
        ]);

        return 'processed';
    }

    public function advanceNextRun($current, string $frequency): Carbon
    {
        $date = Carbon::parse($current)->startOfDay();

        return match (strtolower($frequency)) {
            'weekly' => $date->addWeek(),
            'quarterly' => $date->addMonths(3),
            'yearly' => $date->addYear(),
            default => $date->addMonth(),
        };
    }
}
