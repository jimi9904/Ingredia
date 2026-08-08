<?php

namespace Database\Seeders;

use App\Models\Recipe;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use MongoDB\BSON\UTCDateTime;

class IndianFoodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Imports the Archana's Kitchen Indian food dataset (CSV export of
     * IndianFoodDatasetXLS.xlsx). CSV columns:
     *   Srno, RecipeName, TranslatedRecipeName, Ingredients, TranslatedIngredients,
     *   PrepTimeInMins, CookTimeInMins, TotalTimeInMins, Servings, Cuisine, Course,
     *   Diet, Instructions, TranslatedInstructions, URL
     */
    public function run(): void
    {
        $filePath = database_path('../indian_recipes.csv');
        $filePath = realpath($filePath) ?: base_path('indian_recipes.csv');

        if (!file_exists($filePath)) {
            $this->command->error("Indian recipes CSV not found at: $filePath");
            return;
        }

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            $this->command->error("Could not open file: $filePath");
            return;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            $this->command->error("Could not read CSV header.");
            fclose($handle);
            return;
        }

        // Skip rows whose title we already imported from this source — keeps re-runs cheap.
        $existingTitles = Recipe::where('source', 'archanas_kitchen_indian')
            ->pluck('title')
            ->map(fn($t) => strtolower(trim($t)))
            ->flip()
            ->toArray();

        $this->command->info("Starting Indian food dataset import...");

        $count = 0;
        $skipped = 0;
        $batch = [];
        $batchSize = 500;
        $now = new UTCDateTime(now()->valueOf());

        while (($data = fgetcsv($handle)) !== false) {
            if (count($data) !== count($header)) {
                continue;
            }

            $row = array_combine($header, $data);

            // Title comes ONLY from the TranslatedRecipeName column — no fallback to the
            // (often Hindi-script) RecipeName column.
            $title = trim($row['TranslatedRecipeName'] ?? '');
            if ($title === '') {
                $skipped++;
                continue;
            }

            // Skip titles that are still in non-Latin script (some rows leave the translated
            // column in Hindi). Mixed titles with a few accented chars (Jalapeño, Bánh) pass.
            if (!$this->isMostlyAscii($title)) {
                $skipped++;
                continue;
            }

            $titleKey = strtolower(trim($title));
            if (isset($existingTitles[$titleKey])) {
                continue;
            }
            $existingTitles[$titleKey] = true;

            $rawIngredients = trim($row['TranslatedIngredients'] ?? $row['Ingredients'] ?? '');
            $ingredients = $this->parseIngredients($rawIngredients);
            if (empty($ingredients)) {
                continue;
            }

            $rawInstructions = trim($row['TranslatedInstructions'] ?? $row['Instructions'] ?? '');
            $instructions = $this->parseInstructions($rawInstructions);
            if (empty($instructions)) {
                continue;
            }

            $prep = (int) ($row['PrepTimeInMins'] ?? 0);
            $cook = (int) ($row['CookTimeInMins'] ?? 0);
            $total = $prep + $cook;

            $tags = array_values(array_unique(array_filter(array_map('strtolower', [
                trim($row['Course'] ?? ''),
                trim($row['Diet'] ?? ''),
                trim($row['Cuisine'] ?? ''),
                'indian',
            ]), fn($t) => $t !== '')));

            $recipeData = [
                'title'        => $title,
                'slug'         => Str::slug($title) . '-' . substr(md5($title . ($row['URL'] ?? '')), 0, 8),
                'description'  => $this->buildDescription($row),
                'ingredients'  => $ingredients,
                'instructions' => $instructions,
                'cuisine'      => strtolower(trim($row['Cuisine'] ?? 'indian')),
                'tags'         => $tags,
                'nutrition'    => [
                    'calories' => 0, 'total_fat' => 0, 'sugar' => 0, 'sodium' => 0,
                    'protein' => 0, 'saturated_fat' => 0, 'carbohydrates' => 0,
                ],
                'cook_time'    => $cook ?: $total,
                'prep_time'    => $prep,
                'servings'     => (int) ($row['Servings'] ?? 4) ?: 4,
                'difficulty'   => $this->difficultyFromTime($total),
                'image_url'    => '',
                'avg_rating'   => 0,
                'rating_count' => 0,
                'status'       => 'published',
                'source'       => 'archanas_kitchen_indian',
                'created_at'   => $now,
                'updated_at'   => $now,
            ];

            $batch[] = $recipeData;

            if (count($batch) >= $batchSize) {
                Recipe::insert($batch);
                $count += count($batch);
                $this->command->info("Imported $count Indian recipes...");
                $batch = [];
            }
        }

        if (!empty($batch)) {
            Recipe::insert($batch);
            $count += count($batch);
        }

        fclose($handle);
        $this->command->info("Finished! Imported $count Indian recipes (skipped $skipped non-translated rows).");
    }

    private function parseIngredients(string $str): array
    {
        if ($str === '') {
            return [];
        }
        $parts = preg_split('/\s*,\s*/', $str);
        return array_values(array_filter(array_map(function ($p) {
            $p = trim($p);
            // Drop everything after " - " — leaves "Salt" instead of "Salt - to taste",
            // and the leading quantity is preserved on the front for context.
            return $p;
        }, $parts), fn($p) => $p !== ''));
    }

    private function parseInstructions(string $str): array
    {
        if ($str === '') {
            return [];
        }
        // The dataset stores all steps as one paragraph with periods separating them.
        // Split on sentence-ending punctuation followed by whitespace or end-of-line.
        $sentences = preg_split('/(?<=[.!?])\s+(?=[A-Z0-9])/u', $str);
        $steps = array_values(array_filter(array_map('trim', $sentences), fn($s) => mb_strlen($s) > 3));
        if (empty($steps)) {
            $steps = [trim($str)];
        }
        return $steps;
    }

    private function difficultyFromTime(int $totalMinutes): string
    {
        if ($totalMinutes <= 30) return 'easy';
        if ($totalMinutes <= 75) return 'medium';
        return 'hard';
    }

    private function buildDescription(array $row): string
    {
        $cuisine = trim($row['Cuisine'] ?? 'Indian');
        $course  = trim($row['Course'] ?? '');
        $diet    = trim($row['Diet'] ?? '');
        $parts   = ["A {$cuisine} recipe"];
        if ($course !== '') {
            $parts[] = "served as {$course}";
        }
        if ($diet !== '') {
            $parts[] = "({$diet})";
        }
        return implode(' ', $parts) . '.';
    }

    private function isMostlyAscii(string $str): bool
    {
        $len = max(1, mb_strlen($str));
        $ascii = preg_match_all('/[\x00-\x7F]/', $str);
        return ($ascii / $len) >= 0.6;
    }
}
