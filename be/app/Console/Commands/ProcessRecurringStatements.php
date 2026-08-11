<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\Invoice\Services\RecurringStatementProcessorService;

class ProcessRecurringStatements extends Command
{
    protected $signature = 'recurring-statements:process {--date= : Process as of date (Y-m-d)}';

    protected $description = 'Generate and email invoices for due recurring statement schedules';

    public function handle(RecurringStatementProcessorService $processor): int
    {
        $asOf = $this->option('date')
            ? \Carbon\Carbon::parse($this->option('date'))->startOfDay()
            : now()->startOfDay();

        $this->info('Processing recurring statements due on or before ' . $asOf->toDateString() . '…');

        $stats = $processor->processDueStatements($asOf);

        $this->info(sprintf(
            'Done. processed=%d skipped=%d failed=%d',
            $stats['processed'],
            $stats['skipped'],
            $stats['failed']
        ));

        return $stats['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
