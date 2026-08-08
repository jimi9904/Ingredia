<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;

class GenerateNutrition extends Command
{
    protected $signature = 'recipes:generate-nutrition
                            {--threshold=20 : Treat calories < this as bogus and overwrite}
                            {--refresh : Overwrite nutrition for every recipe (default: only fill missing/bogus)}
                            {--dry-run : Preview without saving}';

    protected $description = 'Fill missing per-serving nutrition (calories / protein / carbs / fat) with plausible deterministic values based on dish category and diet.';

    /**
     * Per-category nutrition ranges [min, max] for a single serving.
     * Numbers come from typical USDA / nutrition-label ballparks for each cuisine bucket —
     * not exact for any specific dish, but realistic enough that the four pills look right
     * sitting next to each other.
     */
    private const RANGES = [
        // category => [calMin, calMax, proMin, proMax, carbMin, carbMax, fatMin, fatMax]
        'dessert'      => [250, 480,  3, 8,  35, 65,  8, 22],
        'breakfast'    => [220, 420, 10, 18, 25, 50,  8, 18],
        'snack'        => [120, 280,  4, 10, 15, 35,  6, 16],
        'soup'         => [110, 260,  8, 18, 12, 28,  4, 12],
        'salad-veg'    => [140, 290,  5, 12, 12, 30,  6, 16],
        'salad-nonveg' => [220, 380, 20, 32, 10, 22, 10, 20],
        'main-veg'     => [220, 380,  8, 16, 32, 58, 10, 20],
        'main-egg'     => [260, 420, 14, 24, 15, 32, 12, 22],
        'main-nonveg'  => [320, 540, 28, 42, 12, 32, 14, 28],
        'rice'         => [280, 460,  8, 16, 45, 75, 6, 16],
        'pasta'        => [320, 520, 12, 22, 45, 70, 10, 20],
        'beverage'     => [60, 220,   1, 5,   10, 30, 1, 8],
    ];

    public function handle(): int
    {
        $threshold = (int) $this->option('threshold');
        $refresh   = (bool) $this->option('refresh');
        $dryRun    = (bool) $this->option('dry-run');

        $query = Recipe::query();
        if (!$refresh) {
            $query->where(function ($q) use ($threshold) {
                $q->whereNull('nutrition')
                  ->orWhere('nutrition.calories', '<', $threshold)
                  ->orWhereRaw(['nutrition.calories' => ['$exists' => false]]);
            });
        }

        $total = (clone $query)->count();
        if ($total === 0) {
            $this->info('No recipes need nutrition data.');
            return self::SUCCESS;
        }

        $this->info("Generating nutrition for {$total} recipes…");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $byCategory = [];

        $query->cursor()->each(function (Recipe $r) use ($dryRun, $bar, &$byCategory) {
            $category = $this->classify($r);
            $seed = $r->slug ?: $r->title ?: (string) $r->_id;
            $nut = $this->generate($category, $seed);

            if (!$dryRun) {
                $r->nutrition = $nut;
                $r->save();
            }

            $byCategory[$category] = ($byCategory[$category] ?? 0) + 1;
            $bar->advance();
        });

        $bar->finish();
        $this->newLine();
        $this->info('Distribution by category:');
        ksort($byCategory);
        foreach ($byCategory as $cat => $n) {
            $this->line(sprintf('  %-14s %d', $cat, $n));
        }
        return self::SUCCESS;
    }

    /**
     * Bucket a recipe into one of the RANGES keys. Diet is determined inline since
     * the frontend classifier isn't available server-side.
     */
    private function classify(Recipe $r): string
    {
        $tags  = array_map('strtolower', $r->tags ?? []);
        $title = strtolower($r->title ?? '');
        $diet  = $this->dietOf($r);
        $hay   = $title . ' ' . implode(' ', $tags);

        // Course-first detection
        if ($this->matches($hay, ['dessert', 'cake', 'cookie', 'brownie', 'pie', 'tart', 'pudding', 'ice cream', 'halwa', 'kheer', 'ladoo', 'barfi', 'jalebi', 'chocolate', 'cheesecake', 'gulab jamun', 'rasgulla'])) {
            return 'dessert';
        }
        if ($this->matches($hay, ['breakfast', 'pancake', 'waffle', 'omelette', 'omelet', 'oatmeal', 'porridge', 'granola', 'french toast', 'idli', 'dosa', 'upma', 'poha', 'paratha breakfast'])) {
            return 'breakfast';
        }
        if ($this->matches($hay, ['snack', 'appetizer', 'starter', 'samosa', 'pakora', 'kachori', 'bhaji', 'fritter', 'cutlet', 'tikki', 'chaat', 'chip', 'dip'])) {
            return 'snack';
        }
        if ($this->matches($hay, ['soup', 'broth', 'bisque', 'chowder', 'rasam', 'minestrone'])) {
            return 'soup';
        }
        if ($this->matches($hay, ['salad', 'slaw'])) {
            return $diet === 'nonveg' ? 'salad-nonveg' : 'salad-veg';
        }
        if ($this->matches($hay, ['beverage', 'drink', 'smoothie', 'juice', 'lassi', 'shake', 'tea', 'coffee', 'cocktail', 'mocktail', 'chai'])) {
            return 'beverage';
        }
        if ($this->matches($hay, ['pasta', 'spaghetti', 'penne', 'lasagna', 'fettuccine', 'linguine', 'macaroni', 'noodle', 'ramen'])) {
            return 'pasta';
        }
        if ($this->matches($hay, ['rice', 'biryani', 'pulao', 'pilaf', 'risotto']) && !$this->matches($hay, ['curry'])) {
            return 'rice';
        }

        // Default to main dish, split by diet
        return match ($diet) {
            'nonveg' => 'main-nonveg',
            'egg'    => 'main-egg',
            default  => 'main-veg',
        };
    }

    private function dietOf(Recipe $r): string
    {
        $tags = array_map('strtolower', $r->tags ?? []);
        if (collect($tags)->contains(fn($t) => str_contains($t, 'non vegetarian') || str_contains($t, 'non vegeterian'))) {
            return 'nonveg';
        }
        if (collect($tags)->contains(fn($t) => str_contains($t, 'eggetarian'))) {
            return 'egg';
        }
        if (collect($tags)->contains(fn($t) => $t === 'vegan' || str_contains($t, 'vegetarian'))) {
            return 'veg';
        }

        $ings = collect($r->ingredients ?? [])
            ->map(fn($i) => is_string($i) ? $i : ($i['name'] ?? ''))
            ->implode(' ');
        $hay = strtolower(($r->title ?? '') . ' ' . $ings);
        $meats = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'lamb', 'mutton', 'bacon', 'turkey', 'sausage', 'ham', 'prawn', 'tuna', 'crab', 'lobster', 'duck'];
        foreach ($meats as $m) {
            if (str_contains($hay, $m)) return 'nonveg';
        }
        if (preg_match('/\begg\b/', $hay)) return 'egg';
        return 'veg';
    }

    private function matches(string $haystack, array $needles): bool
    {
        foreach ($needles as $n) {
            if (str_contains($haystack, $n)) return true;
        }
        return false;
    }

    /**
     * Generate nutrition for a category. Deterministic per seed so re-runs are stable
     * and the same dish always shows the same numbers.
     */
    private function generate(string $category, string $seed): array
    {
        $r = self::RANGES[$category] ?? self::RANGES['main-veg'];
        [$calMin, $calMax, $proMin, $proMax, $carbMin, $carbMax, $fatMin, $fatMax] = $r;

        $cal  = $this->lerp($this->seededFloat($seed, 1), $calMin,  $calMax);
        $pro  = $this->lerp($this->seededFloat($seed, 2), $proMin,  $proMax);
        $carb = $this->lerp($this->seededFloat($seed, 3), $carbMin, $carbMax);
        $fat  = $this->lerp($this->seededFloat($seed, 4), $fatMin,  $fatMax);

        return [
            'calories'      => $cal,
            'protein'       => $pro,
            'carbohydrates' => $carb,
            'total_fat'     => $fat,
            // Keep the legacy keys other code paths might read so nothing breaks.
            'sugar'         => $this->lerp($this->seededFloat($seed, 5), 1, max(1, intdiv($carb, 3))),
            'sodium'        => $this->lerp($this->seededFloat($seed, 6), 80, 700),
            'saturated_fat' => $this->lerp($this->seededFloat($seed, 7), 1, max(1, intdiv($fat, 3))),
        ];
    }

    private function seededFloat(string $seed, int $offset): float
    {
        $hex = substr(md5($seed . ':' . $offset), 0, 8);
        return hexdec($hex) / 0xFFFFFFFF;
    }

    private function lerp(float $t, int $min, int $max): int
    {
        return (int) round($min + $t * ($max - $min));
    }
}
