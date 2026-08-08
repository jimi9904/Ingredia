<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;

class DiversifyFallbackImages extends Command
{
    protected $signature = 'recipes:diversify-images';

    protected $description = 'Replace the single Chicken Handi fallback with a varied Unsplash pool for non-chicken Indian recipes.';

    private const OLD_DEFAULT = 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg';

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
        $count = 0;
        Recipe::where('cuisine', 'indian')
            ->where('image_url', self::OLD_DEFAULT)
            ->where('title', 'not regexp', '/chicken/i')
            ->cursor()
            ->each(function ($r) use (&$count) {
                $r->image_url = $this->pick($r->slug ?: $r->title ?: (string) $r->_id);
                $r->save();
                $count++;
                if ($count % 200 === 0) $this->line("  …updated {$count}");
            });
        $this->info("Diversified {$count} recipe images.");
        return self::SUCCESS;
    }

    private function pick(string $seed): string
    {
        $idx = hexdec(substr(md5($seed), 0, 8)) % count(self::FALLBACK_POOL);
        return self::FALLBACK_POOL[$idx];
    }
}
