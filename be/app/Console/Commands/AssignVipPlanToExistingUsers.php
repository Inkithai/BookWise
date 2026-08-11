<?php

namespace App\Console\Commands;

use App\Services\Subscription\VipPlanService;
use Illuminate\Console\Command;
use Modules\User\Models\User;

class AssignVipPlanToExistingUsers extends Command
{
    protected $signature = 'subscriptions:assign-vip-existing
                            {--dry-run : List users without writing}
                            {--email= : Assign a single user by email}
                            {--include-super-admins : Also assign super-admin accounts}';

    protected $description = 'Assign the VIP plan (full access, no billing) to existing Invoice users';

    public function handle(VipPlanService $vipPlanService): int
    {
        $plan = $vipPlanService->vipPlan();
        if (! $plan) {
            $this->error('VIP plan not found. Run: php artisan migrate && php artisan db:seed --class=PlansTableSeeder');

            return self::FAILURE;
        }

        $this->info('VIP plan: '.$plan->name.' ('.$plan->slug.')');

        $query = User::query()->orderBy('id');
        if ($email = $this->option('email')) {
            $query->whereRaw('LOWER(email) = ?', [strtolower(trim($email))]);
        }

        $assigned = 0;
        $skipped = 0;

        $query->chunkById(100, function ($users) use ($vipPlanService, $plan, &$assigned, &$skipped) {
            foreach ($users as $user) {
                if (! $this->option('include-super-admins') && $vipPlanService->isSuperAdminAccount($user)) {
                    $skipped++;
                    $this->line("  skip (super-admin): {$user->email}");

                    continue;
                }

                if ($this->option('dry-run')) {
                    $this->line("  would assign: {$user->email} (id {$user->id})");
                    $assigned++;

                    continue;
                }

                $vipPlanService->assignUser($user);
                $assigned++;
                $this->line("  assigned: {$user->email}");
            }
        });

        $this->newLine();
        $this->info($this->option('dry-run') ? "Dry run: {$assigned} user(s) would be assigned." : "Assigned VIP to {$assigned} user(s).");
        if ($skipped > 0) {
            $this->comment("Skipped {$skipped} super-admin account(s). Use --include-super-admins to include them.");
        }

        return self::SUCCESS;
    }
}
