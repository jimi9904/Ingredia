<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Recipe;
use App\Services\IngredientNormalisationService;

class KaggleRecipeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(IngredientNormalisationService $normalizer): void
    {
        $filePath = 'C:\Users\jimib\Downloads\RAW_recipes.csv\RAW_recipes.csv';

        if (!file_exists($filePath)) {
            $this->command->error("File not found: $filePath");
            return;
        }

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            $this->command->error("Could not open file: $filePath");
            return;
        }

        // Read header
        $header = fgetcsv($handle);
        if (!$header) {
            $this->command->error("Could not read header from CSV.");
            return;
        }

        // Map column names to index
        $colMap = array_flip($header);

        $this->command->info("Starting Kaggle dataset import...");
        
        $count = 0;
        $batch = [];
        $batchSize = 2500; // Increased batch size for faster inserts

        while (($data = fgetcsv($handle)) !== false) {
            // Ensure we have correct number of columns
            if (count($data) !== count($header)) {
                continue;
            }

            $row = array_combine($header, $data);

            // Parse ingredients (usually stored as a stringified list like "['ingredient 1', 'ingredient 2']")
            $rawIngredientsStr = $row['ingredients'] ?? '[]';
            $rawIngredients = $this->parsePythonArrayString($rawIngredientsStr);
            
            $normalizedIngredients = [];
            foreach ($rawIngredients as $rawIngredient) {
                // Ultra-fast in-memory normalization to avoid 1.8M database/cache queries
                $normalizedIngredients[] = strtolower(trim($rawIngredient));
            }

            // Parse instructions (steps)
            $rawStepsStr = $row['steps'] ?? '[]';
            $instructions = $this->parsePythonArrayString($rawStepsStr);

            // Parse tags
            $rawTagsStr = $row['tags'] ?? '[]';
            $tags = $this->parsePythonArrayString($rawTagsStr);

            // Parse nutrition (e.g. "[137.6, 2.0, 52.0, 3.0, 6.0, 1.0, 11.0]")
            $rawNutritionStr = $row['nutrition'] ?? '[]';
            $nutritionArray = $this->parsePythonArrayString($rawNutritionStr, true);

            $recipeData = [
                'title' => $row['name'] ?? 'Untitled Recipe',
                'description' => $row['description'] ?? '',
                'ingredients' => $normalizedIngredients,
                'instructions' => $instructions,
                'cuisine' => 'general',
                'tags' => $tags,
                'nutrition' => [
                    'calories' => $nutritionArray[0] ?? 0,
                    'total_fat' => $nutritionArray[1] ?? 0,
                    'sugar' => $nutritionArray[2] ?? 0,
                    'sodium' => $nutritionArray[3] ?? 0,
                    'protein' => $nutritionArray[4] ?? 0,
                    'saturated_fat' => $nutritionArray[5] ?? 0,
                    'carbohydrates' => $nutritionArray[6] ?? 0,
                ],
                'cook_time' => (int) ($row['minutes'] ?? 0),
                'prep_time' => 0,
                'servings' => 4, // default
                'difficulty' => 'medium',
                'image_url' => '', // Kaggle dataset doesn't have images
                'status' => 'published',
                'source' => 'kaggle_food_com',
            ];

            // Don't auto-generate slug for every bulk record to save time, unless needed.
            // Recipe model's boot method might be triggered on Recipe::insert() ? No, insert bypasses eloquent events.
            $recipeData['slug'] = \Illuminate\Support\Str::slug($recipeData['title']) . '-' . uniqid();

            $batch[] = $recipeData;

            if (count($batch) >= $batchSize) {
                Recipe::insert($batch);
                $count += count($batch);
                $this->command->info("Imported $count recipes...");
                $batch = [];
            }
        }

        // Insert remaining
        if (count($batch) > 0) {
            Recipe::insert($batch);
            $count += count($batch);
        }

        fclose($handle);
        $this->command->info("Finished! Imported $count total recipes.");
    }

    /**
     * Parse a Python-style array string like "['1/2 cup butter', '2 eggs']"
     */
    private function parsePythonArrayString(string $str, bool $isNumeric = false): array
    {
        $str = trim($str);
        // Remove surrounding brackets
        $str = trim($str, '[]');
        if (empty($str)) {
            return [];
        }

        if ($isNumeric) {
            $parts = explode(',', $str);
            return array_map('floatval', array_map('trim', $parts));
        }

        // Match items inside single quotes
        preg_match_all("/'([^']+)'/", $str, $matches);
        if (!empty($matches[1])) {
            return $matches[1];
        }

        // Fallback
        return array_map('trim', explode(',', $str));
    }
}
