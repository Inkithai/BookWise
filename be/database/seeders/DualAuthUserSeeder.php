<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\User\Models\User;
use Illuminate\Support\Facades\Hash;

class DualAuthUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create a test user for normal password login
        User::updateOrCreate(
            ['email' => 'testuser@example.com'],
            [
                'user_name' => 'testuser',
                'password' => \Illuminate\Support\Facades\Hash::make('secret123'), // hashed
                'first_name' => 'Test',
                'last_name' => 'User',
                'account_type' => 'admin',
                // assign a default role if exists
            ]
        );
    }
}
?>
