<?php

namespace App\Console\Commands;

use App\Services\Subscription\TrialLifecycleService;
use Illuminate\Console\Command;

/**
 * @deprecated Use subscriptions:process-trials (kept as alias for existing schedulers).
 */
class CheckTrails extends Command
{
    protected $signature = 'check-trails';

    protected $description = 'Process trial reminders and expire trials to the free plan';

    public function handle(TrialLifecycleService $trials): int
    {
        $result = $trials->process();
        $this->info("Trial reminders sent: {$result['reminders_sent']}");
        $this->info("Trials moved to free plan: {$result['moved_to_free']}");

        return self::SUCCESS;
    }
}
