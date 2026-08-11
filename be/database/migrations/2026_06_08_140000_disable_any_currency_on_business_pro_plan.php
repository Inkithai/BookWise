<?php

use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $plan = Plan::query()->where('slug', 'starter')->first();
        if (! $plan) {
            return;
        }

        $features = is_array($plan->features) ? $plan->features : [];
        $features['any_currency'] = false;
        $plan->update(['features' => $features]);
    }

    public function down(): void
    {
        $plan = Plan::query()->where('slug', 'starter')->first();
        if (! $plan) {
            return;
        }

        $features = is_array($plan->features) ? $plan->features : [];
        $features['any_currency'] = true;
        $plan->update(['features' => $features]);
    }
};
