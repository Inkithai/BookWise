<?php

namespace App\Console\Commands;

use App\Services\Subscription\TrialLifecycleService;
use Illuminate\Console\Command;

class ProcessSubscriptionTrials extends Command
{
    protected $signature = 'subscriptions:process-trials';

    protected $description = 'Send trial ending reminders and move expired trials to the free plan';

    public function handle(TrialLifecycleService $trials): int
    {
        $result = $trials->process();

        $this->info("Trial reminders sent: {$result['reminders_sent']}");
        $this->info("Trials moved to free plan: {$result['moved_to_free']}");

        return self::SUCCESS;
    }
}
