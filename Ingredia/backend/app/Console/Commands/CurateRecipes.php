<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;

class CurateRecipes extends Command
{
    protected $signature = 'recipes:curate {--dry-run : Show counts without modifying data}';

    protected $description = 'Keep all Indian recipes + foreign cuisines, backfill images, delete the rest.';

    /**
     * Keyword → image URL. First match wins.
     */
    private const KEYWORD_IMAGES = [
        'biryani'  => 'https://www.themealdb.com/images/media/meals/xrttsx1487339558.jpg',
        'paneer'   => 'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg',
        'tandoori' => 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg',
        'tikka'    => 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg',
        'rogan'    => 'https://www.themealdb.com/images/media/meals/vvstvq1487342592.jpg',
        'masala'   => 'https://www.themealdb.com/images/media/meals/uwxusv1487344500.jpg',
        'curry'    => 'https://www.themealdb.com/images/media/meals/sstssx1487349585.jpg',
        'dal'      => 'https://www.themealdb.com/images/media/meals/wuxrtu1483564410.jpg',
        'lentil'   => 'https://www.themealdb.com/images/media/meals/wuxrtu1483564410.jpg',
        'chicken'  => 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
    ];

    /**
     * Pool of generic food/Indian-cuisine photos from Unsplash. Recipes that
     * don't match any keyword get one of these, picked deterministically by
     * slug hash so the same recipe always shows the same photo.
     */
    private const FALLBACK_POOL = [
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80&auto=format',
        'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&q=80&auto=format',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $totalBefore = Recipe::count();
        $this->info("Total recipes before: {$totalBefore}");

        $indianRegex = '/indian/i';

        $indianCount = Recipe::where('tags', 'regexp', $indianRegex)->count();
        $foreignCount = Recipe::where('cuisine', '!=', 'general')
            ->where('cuisine', '!=', 'indian')
            ->count();
        $this->info("Will keep: Indian-tagged = {$indianCount}, foreign = {$foreignCount}");

        if ($dryRun) {
            $this->warn('Dry run — no changes made.');
            return self::SUCCESS;
        }

        // Step 1: per-keyword bulk updates for Indian recipes.
        $this->info('Backfilling images and tagging cuisine=indian by keyword…');
        $updated = 0;
        foreach (self::KEYWORD_IMAGES as $kw => $url) {
            $count = Recipe::where('tags', 'regexp', $indianRegex)
                ->where('cuisine', '!=', 'indian')
                ->where('title', 'regexp', '/' . preg_quote($kw, '/') . '/i')
                ->update(['cuisine' => 'indian', 'image_url' => $url]);
            $updated += $count;
            $this->line("  {$kw}: {$count}");
        }

        // Remaining Indian-tagged recipes get a deterministic pick from the
        // fallback pool so cards aren't all identical.
        $this->line('  (fallback pool): assigning per-recipe…');
        $fallback = 0;
        Recipe::where('tags', 'regexp', $indianRegex)
            ->where('cuisine', '!=', 'indian')
            ->cursor()
            ->each(function ($r) use (&$fallback) {
                $r->cuisine = 'indian';
                $r->image_url = $this->pickFallbackImage($r->slug ?: $r->title ?: (string) $r->_id);
                $r->save();
                $fallback++;
            });
        $this->line("  fallback assigned: {$fallback}");
        $updated += $fallback;
        $this->info("Tagged & imaged: {$updated} Indian recipes.");

        // Step 2: delete everything still tagged 'general'.
        $this->info('Deleting non-Indian general recipes (in 5k batches)…');
        $deletedTotal = 0;
        while (true) {
            $ids = Recipe::where('cuisine', 'general')->limit(5000)->pluck('_id')->all();
            if (empty($ids)) break;
            $n = Recipe::whereIn('_id', $ids)->delete();
            $deletedTotal += $n;
            $this->line("  deleted batch: {$n} (running total: {$deletedTotal})");
            if ($n < count($ids)) break;
        }
        $this->info("Deleted: {$deletedTotal} general recipes.");

        $totalAfter = Recipe::count();
        $this->info("Total recipes after: {$totalAfter}");

        return self::SUCCESS;
    }

    private function pickFallbackImage(string $seed): string
    {
        $idx = hexdec(substr(md5($seed), 0, 8)) % count(self::FALLBACK_POOL);
        return self::FALLBACK_POOL[$idx];
    }
}
