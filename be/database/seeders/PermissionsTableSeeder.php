<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [

            'user.view',
            'user.create',
            'user.edit',
            'user.delete',

            'role.view',
            'role.create',
            'role.edit',
            'role.delete',

            'permission.view',
            'permission.create',
            'permission.edit',
            'permission.delete',

            'dashboard.view',

            'custom.view',
            'custom.create',
            'custom.edit',
            'custom.delete',
            'custom.upload-csv',

            'invoice-client.view',
            'invoice-client.create',
            'invoice-client.edit',
            'invoice-client.delete',

            'invoice.view',
            'invoice.manage',
            'invoice.mail',
            'invoice.create',
            'invoice.edit',
            'invoice.delete',

            'receipt.view',
            'receipt.create',
            'receipt.edit',
            'receipt.delete',
            'receipt.mail',

            'company.change',

            'referral.view',

            'feature.monthly-invoice',
            'feature.saved-client',
            'feature.monthly-payment-receipt',
            'feature.monthly-quotation',
            'feature.team-membership',
            'feature.template',
            'feature.any-currency',
            'feature.standard-dashboard',
            'feature.advanced-dashboard',
            'feature.custom-dashboard',
            'feature.recurring-invoice',
            'feature.accept-online-payment',
            'feature.branding',
            'feature.send-invoice',
            'feature.multiple-business',
            'feature.crm',
            'feature.tax'
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'api',
            ]);
        }
    }
}
