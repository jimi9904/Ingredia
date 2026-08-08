<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use App\Models\Recipe;
use App\Services\IngredientNormalisationService;
use Illuminate\Support\Str;

class TheMealDBSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(IngredientNormalisationService $normalizer): void
    {
        $this->command->info("Starting TheMealDB initial seeding...");

        // Get 10 random meals (free API limitation, can loop to get more but let's get a few with images)
        for ($i = 0; $i < 20; $i++) {
            $response = Http::get('https://www.themealdb.com/api/json/v1/1/random.php');
            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['meals'][0])) {
                    $meal = $data['meals'][0];
                    $this->importMeal($meal, $normalizer);
                }
            }
        }
        
        $this->command->info("Finished TheMealDB seeding!");
    }

    private function importMeal(array $meal, IngredientNormalisationService $normalizer)
    {
        // Extract ingredients and measurements
        $ingredients = [];
        for ($i = 1; $i <= 20; $i++) {
            $ing = $meal["strIngredient{$i}"] ?? '';
            $measure = $meal["strMeasure{$i}"] ?? '';
            
            if (!empty(trim($ing))) {
                // Normalize ingredient
                $canonicalName = $normalizer->normalize($ing);
                $ingredients[] = $canonicalName; // we just store canonical names for the match score
                // In a real app we might store measurement separately, but for match score we only need names.
            }
        }

        // Format instructions
        $instructions = array_filter(array_map('trim', explode("\r\n", $meal['strInstructions'] ?? '')));

        $recipeData = [
            'title' => $meal['strMeal'],
            'slug' => Str::slug($meal['strMeal']) . '-' . uniqid(),
            'description' => "A delicious {$meal['strArea']} {$meal['strCategory']} dish.",
            'ingredients' => $ingredients,
            'instructions' => array_values($instructions),
            'cuisine' => strtolower($meal['strArea'] ?? 'general'),
            'tags' => array_filter(array_map('trim', explode(',', $meal['strTags'] ?? ''))),
            'nutrition' => [
                'calories' => 0, 'total_fat' => 0, 'sugar' => 0, 'sodium' => 0, 'protein' => 0, 'saturated_fat' => 0, 'carbohydrates' => 0
            ],
            'cook_time' => 30, // Default estimate
            'prep_time' => 15,
            'servings' => 2,
            'difficulty' => 'easy',
            'image_url' => $meal['strMealThumb'] ?? '',
            'status' => 'published',
            'source' => 'themealdb',
        ];

        // Check if recipe already exists to avoid duplicates
        $exists = Recipe::where('title', $meal['strMeal'])->exists();
        if (!$exists) {
            Recipe::create($recipeData);
            $this->command->info("Imported: " . $meal['strMeal']);
        }
    }
}
