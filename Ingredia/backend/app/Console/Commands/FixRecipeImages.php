<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class FixRecipeImages extends Command
{
    protected $signature = 'recipes:fix-images {--dry-run : Preview changes without saving}';
    protected $description = 'Re-match recipe image_url from TheMealDB by title. Nulls out unmatched so the frontend fallback takes over.';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $this->info('Fetching TheMealDB meal index (a–z)…');
        $mealMap = $this->buildMealMap();
        $this->info('  Found ' . count($mealMap) . ' meals in TheMealDB.');

        $total   = Recipe::count();
        $matched = 0;
        $nulled  = 0;

        $this->info("Processing {$total} recipes…");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        Recipe::cursor()->each(function (Recipe $recipe) use ($mealMap, $dryRun, &$matched, &$nulled, $bar) {
            $key      = $this->normalize($recipe->title ?? '');
            $changed  = false;

            if (isset($mealMap[$key])) {
                $newUrl = $mealMap[$key];
                if ($recipe->image_url !== $newUrl) {
                    if (!$dryRun) {
                        $recipe->image_url = $newUrl;
                        $recipe->save();
                    }
                    $matched++;
                    $changed = true;
                }
            } elseif (!empty($recipe->image_url)) {
                // No title match in TheMealDB — null out the likely-wrong image
                // so the frontend emoji/gradient fallback renders instead.
                if (!$dryRun) {
                    $recipe->image_url = null;
                    $recipe->save();
                }
                $nulled++;
                $changed = true;
            }

            $bar->advance();
        });

        $bar->finish();
        $this->newLine();

        $verb = $dryRun ? 'Would' : 'Did';
        $this->info("{$verb} fix   {$matched} matched to correct TheMealDB image.");
        $this->info("{$verb} clear {$nulled} unmatched (frontend fallback will show instead).");

        return self::SUCCESS;
    }

    private function buildMealMap(): array
    {
        $map = [];
        foreach (range('a', 'z') as $letter) {
            try {
                $meals = Http::timeout(12)
                    ->get("https://www.themealdb.com/api/json/v1/1/search.php?f={$letter}")
                    ->json('meals') ?? [];

                foreach ($meals as $meal) {
                    if (!empty($meal['strMeal']) && !empty($meal['strMealThumb'])) {
                        $map[$this->normalize($meal['strMeal'])] = $meal['strMealThumb'];
                    }
                }
            } catch (\Throwable) {
                $this->warn("  Skipped letter {$letter} (timeout/error).");
            }
            usleep(120_000); // 120 ms between requests — be polite to TheMealDB
        }
        return $map;
    }

    private function normalize(string $s): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $s)));
    }
}
