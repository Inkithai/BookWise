<?php

namespace Database\Seeders;

use App\Models\InvoiceType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvoicesTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('invoices_types')->truncate();
        $invoiceTypes = [
            ['name' => 'Invoice'],
            ['name' => 'Quotation'],
            // ['name' => 'Construction Industry Scheme CIS']
        ];

        InvoiceType::insert($invoiceTypes);
    }
}
