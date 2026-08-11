<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdateInvoiceClientNameSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
         DB::table('invoices')
            ->leftJoin('invoices_clients', 'invoices.client_id', '=', 'invoices_clients.id')
            ->update([
                'invoices.client_name' => DB::raw('invoices_clients.name')
            ]);
    }
}
