<?php

namespace Database\Factories;

use App\Models\Recipe;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RecipeFactory extends Factory
{
    protected $model = Recipe::class;

    public function definition(): array
    {
        $title = $this->faker->words(3, true);
        return [
            'title'        => ucwords($title),
            'slug'         => Str::slug($title) . '-' . $this->faker->unique()->numberBetween(1, 9999),
            'description'  => $this->faker->paragraph(),
            'ingredients'  => [
                ['name' => $this->faker->word(), 'amount' => $this->faker->numberBetween(1, 5) . ' ' . $this->faker->randomElement(['cup', 'tbsp', 'g', 'ml'])],
                ['name' => $this->faker->word(), 'amount' => $this->faker->numberBetween(1, 3) . ' pieces'],
            ],
            'instructions' => [
                $this->faker->sentence(),
                $this->faker->sentence(),
                $this->faker->sentence(),
            ],
            'cuisine'      => $this->faker->randomElement(['Indian', 'Italian', 'Mexican', 'Chinese', 'American']),
            'tags'         => $this->faker->randomElements(['vegetarian', 'quick', 'healthy', 'spicy', 'gluten-free'], 2),
            'cook_time'    => $this->faker->numberBetween(10, 120),
            'prep_time'    => $this->faker->numberBetween(5, 60),
            'servings'     => $this->faker->numberBetween(1, 8),
            'difficulty'   => $this->faker->randomElement(['easy', 'medium', 'hard']),
            'avg_rating'   => 0.0,
            'rating_count' => 0,
            'status'       => 'published',
            'source'       => 'admin',
            'nutrition'    => [
                'calories'      => $this->faker->numberBetween(100, 800),
                'protein'       => $this->faker->numberBetween(5, 50),
                'carbohydrates' => $this->faker->numberBetween(10, 100),
                'total_fat'     => $this->faker->numberBetween(2, 40),
            ],
        ];
    }
}
