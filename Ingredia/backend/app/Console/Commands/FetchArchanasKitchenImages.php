<?php

namespace App\Console\Commands;

use App\Models\Recipe;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class FetchArchanasKitchenImages extends Command
{
    protected $signature = 'recipes:fetch-archanas-images
                            {--limit=0 : Stop after N successful updates (0 = all)}
                            {--batch=20 : Concurrent requests per round}
                            {--dry-run : Preview without saving}';

    protected $description = 'Scrape og:image from archanaskitchen.com URLs in indian_recipes.csv and populate image_url for Indian recipes.';

    public function handle(): int
    {
        $csvPath = base_path('indian_recipes.csv');
        if (!file_exists($csvPath)) {
            $this->error("CSV not found at $csvPath");
            return self::FAILURE;
        }

        $this->info('Reading indian_recipes.csv …');
        $titleToUrl = $this->readCsv($csvPath);
        $this->info('  ' . count($titleToUrl) . ' rows mapped.');

        $query = Recipe::where('source', 'archanas_kitchen_indian')
            ->where(function ($q) {
                $q->whereNull('image_url')->orWhere('image_url', '');
            });

        $total = $query->count();
        if ($total === 0) {
            $this->info('All Indian recipes already have images.');
            return self::SUCCESS;
        }

        $limit  = (int) $this->option('limit');
        $batch  = max(1, (int) $this->option('batch'));
        $dryRun = (bool) $this->option('dry-run');

        $target = $limit > 0 ? min($limit, $total) : $total;
        $this->info("Fetching og:image for {$target} recipes ({$batch} concurrent)…");

        $bar = $this->output->createProgressBar($target);
        $bar->start();

        $hits = $misses = $noUrl = 0;
        $buffer = [];

        $process = function (array $buffer) use (&$hits, &$misses, $dryRun) {
            // Fire $batch concurrent requests, return id => Response map.
            $responses = Http::pool(function ($pool) use ($buffer) {
                $reqs = [];
                foreach ($buffer as $job) {
                    $reqs[] = $pool->as($job['id'])
                        ->withHeaders([
                            'User-Agent' => 'Mozilla/5.0 (compatible; IngrediaBot/1.0; +https://ingredia.local)',
                            'Accept' => 'text/html,application/xhtml+xml',
                        ])
                        ->withOptions(['allow_redirects' => true])
                        ->timeout(15)
                        ->get($job['url']);
                }
                return $reqs;
            });

            foreach ($buffer as $job) {
                $resp = $responses[$job['id']] ?? null;
                $ogImage = null;

                if ($resp && !($resp instanceof \Throwable) && $resp->successful()) {
                    $html = $resp->body();
                    // Match <meta property="og:image" content="..."> (quote-agnostic, attr-order-agnostic).
                    if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m)
                        || preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']/i', $html, $m)) {
                        $ogImage = trim($m[1]);
                    }
                }

                if ($ogImage) {
                    if (!$dryRun) {
                        $job['recipe']->image_url = $ogImage;
                        $job['recipe']->save();
                    }
                    $hits++;
                } else {
                    $misses++;
                }
            }
        };

        foreach ($query->cursor() as $recipe) {
            $key = strtolower(trim($recipe->title));
            $url = $titleToUrl[$key] ?? null;
            if (!$url) {
                $noUrl++;
                $bar->advance();
                if ($limit > 0 && ($hits + $misses + $noUrl) >= $limit) break;
                continue;
            }

            $buffer[] = ['id' => (string) $recipe->_id, 'url' => $url, 'recipe' => $recipe];

            if (count($buffer) >= $batch) {
                $process($buffer);
                $bar->advance(count($buffer));
                $buffer = [];
                if ($limit > 0 && $hits >= $limit) break;
            }
        }

        if (!empty($buffer)) {
            $process($buffer);
            $bar->advance(count($buffer));
        }

        $bar->finish();
        $this->newLine();
        $this->info("Done. Hits: {$hits}, Misses: {$misses}, No URL in CSV: {$noUrl}.");
        return self::SUCCESS;
    }

    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $map = [];
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($header)) continue;
            $r = array_combine($header, $row);
            $title = trim($r['TranslatedRecipeName'] ?? '');
            $url   = trim($r['URL'] ?? '');
            if ($title === '' || $url === '') continue;
            $map[strtolower($title)] = $url;
        }
        fclose($handle);
        return $map;
    }
}
