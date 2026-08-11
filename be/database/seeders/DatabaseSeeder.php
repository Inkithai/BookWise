<?php

namespace Database\Seeders;

use Database\Seeders\AdminUserSeeder;
use Database\Seeders\CountrySeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {

        $this->call([
            PermissionsTableSeeder::class,
            RoleSeeder::class,
            RoleHasPermissionsTableSeeder::class,
            PlansTableSeeder::class,
            AdminUserSeeder::class,
            InvoicesTypesSeeder::class,
            CrmLeadsStatusSeeder::class
        ]);
    }
}
