<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;

class AssignFallbackImages extends Command
{
    protected $signature = 'recipes:assign-fallback-images
                            {--source= : Only process recipes from this source}
                            {--refresh : Re-pick image for every kaggle/themealdb recipe even if it already has one (uses keyword map). archana recipes are only touched if missing.}
                            {--dry-run : Preview without saving}';

    protected $description = 'Pick a category-appropriate Unsplash image for every recipe missing image_url. Deterministic per slug so reruns stay stable.';

    /**
     * Category → image pool. Each recipe is matched to the first category whose
     * keywords appear in the title; one of the pool URLs is picked deterministically
     * by hashing the recipe slug. Hotlinking images.unsplash.com URLs is allowed by
     * Unsplash's API ToS as long as the image is shown to a user.
     */
    private const CATEGORY_POOLS = [
        'egg' => [
            'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80&auto=format', // eggs + toast
            'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80&auto=format', // sunny-side-up
            'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80&auto=format', // omelette
            'https://images.unsplash.com/photo-1607690424560-35d967d6ad7a?w=600&q=80&auto=format', // egg curry
            'https://images.unsplash.com/photo-1551185618-5d8631084d3a?w=600&q=80&auto=format', // shakshuka
        ],
        'paneer' => [
            'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80&auto=format', // paneer-style curry
            'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80&auto=format', // saag paneer-ish
            'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80&auto=format', // creamy curry
        ],
        'samosa' => [
            'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80&auto=format', // samosa-style fried snacks
            'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80&auto=format', // pakora / fritters
            'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&q=80&auto=format', // street-food snacks
        ],
        'biryani' => [
            'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80&auto=format',
        ],
        'dal' => [
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80&auto=format', // dal / lentils
            'https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=600&q=80&auto=format',
        ],
        'tofu' => [
            'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=600&q=80&auto=format',
        ],
        'chicken' => [
            'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=600&q=80&auto=format',
        ],
        'beef' => [
            'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80&auto=format',
        ],
        'pork' => [
            'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=600&q=80&auto=format',
        ],
        'seafood' => [
            'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1535140728325-a4d3707eee94?w=600&q=80&auto=format',
        ],
        'pasta' => [
            'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1621996346565-e3dbc6d7bbc4?w=600&q=80&auto=format',
        ],
        'pizza' => [
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format',
        ],
        'salad' => [
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80&auto=format',
        ],
        'soup' => [
            'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1547308283-b941d35dcd06?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80&auto=format',
        ],
        'rice' => [
            'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80&auto=format',
        ],
        'bread' => [
            'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1568471173242-461f0a730452?w=600&q=80&auto=format',
        ],
        'dessert' => [
            'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80&auto=format',
        ],
        'breakfast' => [
            'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600&q=80&auto=format', // pancakes
            'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=600&q=80&auto=format', // breakfast spread
            'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80&auto=format', // waffles
            'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600&q=80&auto=format', // breakfast bowl
        ],
        'curry' => [
            'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80&auto=format',
        ],
        'mexican' => [
            'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&q=80&auto=format',
        ],
        'asian' => [
            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&auto=format',
        ],
        'default' => [
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&q=80&auto=format',
            'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80&auto=format',
        ],
    ];

    /**
     * Keyword → category. Order matters: earlier matches win, so put specific
     * cuisines / proteins before broad terms.
     */
    // ORDER MATTERS — earlier matches win. Specific dish/ingredient keywords
    // must precede generic course keywords (e.g. "egg" → egg dish, not breakfast;
    // "paneer" → paneer dish, not generic curry).
    private const KEYWORD_MAP = [
        // 1) Specific Indian dishes and proteins (highest priority)
        'samosa' => 'samosa', 'pakora' => 'samosa', 'kachori' => 'samosa', 'bhaji' => 'samosa', 'fritter' => 'samosa', 'cutlet' => 'samosa', 'tikki' => 'samosa',
        'paneer' => 'paneer',
        'biryani' => 'biryani', 'pulao' => 'biryani', 'pilaf' => 'biryani', 'jeera rice' => 'biryani',
        'dal' => 'dal', 'daal' => 'dal', 'lentil' => 'dal', 'sambar' => 'dal', 'rasam' => 'dal',
        'tofu' => 'tofu',
        // egg comes BEFORE breakfast so eggetarian dishes get egg images, not pancakes
        'omelette' => 'egg', 'omelet' => 'egg', 'akoori' => 'egg', 'scrambled egg' => 'egg', 'frittata' => 'egg', 'shakshuka' => 'egg', 'egg curry' => 'egg', 'bhurji' => 'egg', 'egg' => 'egg',

        // 2) Other proteins
        'chicken' => 'chicken', 'turkey' => 'chicken', 'duck' => 'chicken',
        'beef' => 'beef', 'steak' => 'beef', 'lamb' => 'beef', 'mutton' => 'beef', 'mince' => 'beef', 'meatball' => 'beef',
        'pork' => 'pork', 'bacon' => 'pork', 'ham' => 'pork', 'sausage' => 'pork',
        'salmon' => 'seafood', 'fish' => 'seafood', 'tuna' => 'seafood', 'shrimp' => 'seafood', 'prawn' => 'seafood', 'crab' => 'seafood', 'lobster' => 'seafood',

        // 3) Course / format keywords
        'spaghetti' => 'pasta', 'pasta' => 'pasta', 'penne' => 'pasta', 'lasagna' => 'pasta', 'fettuccine' => 'pasta', 'linguine' => 'pasta', 'macaroni' => 'pasta',
        'pizza' => 'pizza', 'calzone' => 'pizza',
        'salad' => 'salad', 'slaw' => 'salad', 'tabbouleh' => 'salad',
        'soup' => 'soup', 'stew' => 'soup', 'chowder' => 'soup', 'broth' => 'soup', 'bisque' => 'soup', 'minestrone' => 'soup',
        'fried rice' => 'rice', 'risotto' => 'rice', 'rice' => 'rice',
        'bread' => 'bread', 'roll' => 'bread', 'bagel' => 'bread', 'baguette' => 'bread', 'focaccia' => 'bread', 'naan' => 'bread', 'roti' => 'bread', 'paratha' => 'bread',
        'cake' => 'dessert', 'cookie' => 'dessert', 'brownie' => 'dessert', 'pie' => 'dessert', 'tart' => 'dessert', 'ice cream' => 'dessert', 'pudding' => 'dessert', 'chocolate' => 'dessert', 'cheesecake' => 'dessert', 'donut' => 'dessert', 'muffin' => 'dessert', 'halwa' => 'dessert', 'kheer' => 'dessert', 'ladoo' => 'dessert', 'barfi' => 'dessert', 'jalebi' => 'dessert',
        'pancake' => 'breakfast', 'waffle' => 'breakfast', 'oatmeal' => 'breakfast', 'porridge' => 'breakfast', 'granola' => 'breakfast', 'french toast' => 'breakfast', 'idli' => 'breakfast', 'dosa' => 'breakfast', 'upma' => 'breakfast', 'poha' => 'breakfast',

        // 4) Generic last (curry catches everything else Indian-ish)
        'curry' => 'curry', 'masala' => 'curry', 'tikka' => 'curry', 'sabzi' => 'curry', 'korma' => 'curry', 'bhuna' => 'curry',
        'taco' => 'mexican', 'burrito' => 'mexican', 'enchilada' => 'mexican', 'quesadilla' => 'mexican', 'fajita' => 'mexican',
        'sushi' => 'asian', 'ramen' => 'asian', 'pho' => 'asian', 'noodle' => 'asian', 'dumpling' => 'asian', 'dim sum' => 'asian', 'stir fry' => 'asian', 'kung pao' => 'asian',
    ];

    public function handle(): int
    {
        $source  = $this->option('source');
        $dryRun  = (bool) $this->option('dry-run');
        $refresh = (bool) $this->option('refresh');

        $query = Recipe::query();

        if (!$refresh) {
            // Default behaviour: only fill missing images.
            $query->where(function ($q) {
                $q->whereNull('image_url')->orWhere('image_url', '');
            });
        } else {
            // Refresh mode: re-pick for kaggle recipes (the ones this command originally
            // assigned) so updates to the keyword map take effect. archana keeps its
            // scraped og:image, themealdb keeps its real dish photo. Missing images on
            // any source still get filled.
            $query->where(function ($q) {
                $q->whereNull('image_url')
                  ->orWhere('image_url', '')
                  ->orWhere('source', 'kaggle_food_com');
            });
        }

        if ($source) {
            $query->where('source', $source);
        }

        $total = (clone $query)->count();
        if ($total === 0) {
            $this->info('No recipes need fallback images.');
            return self::SUCCESS;
        }

        $this->info("Assigning fallback images to {$total} recipes…");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $byCategory = [];

        $query->cursor()->each(function (Recipe $r) use ($dryRun, $bar, &$byCategory) {
            $category = $this->matchCategory($r);
            $seed = $r->slug ?: $r->title ?: (string) $r->_id;
            $url = $this->pickFromPool(self::CATEGORY_POOLS[$category], $seed);

            if (!$dryRun) {
                $r->image_url = $url;
                $r->save();
            }

            $byCategory[$category] = ($byCategory[$category] ?? 0) + 1;
            $bar->advance();
        });

        $bar->finish();
        $this->newLine();
        $this->info('Distribution:');
        ksort($byCategory);
        foreach ($byCategory as $cat => $n) {
            $this->line(sprintf('  %-12s %d', $cat, $n));
        }
        return self::SUCCESS;
    }

    private function matchCategory(Recipe $r): string
    {
        $haystack = strtolower(($r->title ?? '') . ' ' . implode(' ', $r->tags ?? []));
        foreach (self::KEYWORD_MAP as $kw => $cat) {
            if (str_contains($haystack, $kw)) {
                return $cat;
            }
        }
        return 'default';
    }

    private function pickFromPool(array $pool, string $seed): string
    {
        $idx = hexdec(substr(md5($seed), 0, 8)) % count($pool);
        return $pool[$idx];
    }
}
