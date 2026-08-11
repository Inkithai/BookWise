<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlansTableSeeder extends Seeder
{
    public function run(): void
    {
        $currency = (string) config('plan_catalog.currency', 'GBP');

        foreach (config('plan_catalog.plans', []) as $row) {
            Plan::updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'name' => $row['name'],
                    'description' => $row['description'] ?? null,
                    'monthly_price' => $row['monthly_price'],
                    'yearly_price' => $row['yearly_price'],
                    'currency' => $currency,
                    'is_free' => (bool) ($row['is_free'] ?? false),
                    'is_vip' => (bool) ($row['is_vip'] ?? false),
                    'is_public' => (bool) ($row['is_public'] ?? true),
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'trial_eligible' => (bool) ($row['trial_eligible'] ?? false),
                    'sort_order' => (int) ($row['sort_order'] ?? 0),
                    'features' => $row['features'] ?? [],
                    'limits' => $row['limits'] ?? [],
                ]
            );
        }
    }
}
