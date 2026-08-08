<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Pantry;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@recipe.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('Admin@1234'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        Pantry::firstOrCreate(
            ['user_id' => (string) $admin->_id],
            ['ingredients' => []]
        );

        // Create Test User
        $testUser = User::firstOrCreate(
            ['email' => 'test@recipe.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('Test@1234'),
                'role' => 'user',
                'email_verified_at' => now(),
            ]
        );

        Pantry::firstOrCreate(
            ['user_id' => (string) $testUser->_id],
            ['ingredients' => []]
        );

        $this->command->info('Created admin and test users.');

        // Run Recipe Seeder
        $this->call([
            TheMealDBSeeder::class,
            IndianFoodSeeder::class,
            // KaggleRecipeSeeder::class, // Commented out by default so users don't accidentally import 180k records every time
        ]);
        
        // Create MongoDB Indexes
        \App\Models\Recipe::raw(function($collection) {
            $collection->createIndex(['title' => 'text', 'ingredients.normalized' => 'text']);
            $collection->createIndex(['cuisine' => 1]);
            $collection->createIndex(['tags' => 1]);
        });
        
        \App\Models\Ingredient::raw(function($collection) {
            $collection->createIndex(['canonical_name' => 1], ['unique' => true]);
            $collection->createIndex(['aliases' => 1]);
        });
        
        $this->command->info('Created MongoDB indexes.');
    }
}
