<?php

namespace Database\Seeders;

use App\Models\LeadStatus;
use Illuminate\Database\Seeder;

class CrmLeadsStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            ['name' => 'New'],
            ['name' => 'Contacted'],
            ['name' => 'Qualified'],
            ['name' => 'Converted'],
            ['name' => 'Lost'],
        ];

        foreach ($statuses as $status) {
            LeadStatus::create($status);
        }
    }
}
