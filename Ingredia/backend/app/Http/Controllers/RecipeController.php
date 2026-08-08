<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Review;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecipeController extends Controller
{
    use ApiResponse;

    /**
     * List published recipes with optional ?featured=true for top rated.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Recipe::published();

        if ($request->boolean('featured')) {
            $query->where('rating_count', '>=', 5)->orderBy('avg_rating', 'desc');
        } else {
            // Sort by has_real_image first so cards with actual dish photos appear before
            // the curated Unsplash fallbacks. Compound index on (has_real_image, created_at)
            // keeps this fast.
            $query->orderBy('has_real_image', 'desc')
                  ->orderBy('created_at', 'desc');
        }

        $recipes = $query->paginate($request->integer('per_page', 12));

        return $this->paginated($recipes);
    }

    /**
     * Show a single recipe by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $recipe = Recipe::published()->where('slug', $slug)->firstOrFail();

        $reviews = Review::where('recipe_id', (string) $recipe->_id)
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($review) {
                return [
                    'id'         => (string) $review->_id,
                    'rating'     => $review->rating,
                    'comment'    => $review->comment,
                    'created_at' => $review->created_at,
                    'user'       => [
                        'id'   => $review->user_id,
                        'name' => optional($review->user)->name ?? 'Anonymous',
                    ],
                ];
            });

        $data = $recipe->toArray();
        $data['id'] = (string) $recipe->_id;
        $data['reviews'] = $reviews;

        return $this->success($data);
    }

    /**
     * Content-based "More like this" — returns up to 8 recipes scored by
     * cuisine, diet, shared title keywords, and overlapping tags.
     * Cheap to compute since it filters by cuisine first and only scores
     * a few hundred candidates in PHP. Cached for 10 minutes per slug.
     */
    public function similar(string $slug): JsonResponse
    {
        $target = Recipe::published()->where('slug', $slug)->first();
        if (!$target) {
            return $this->success([]);
        }

        $cacheKey = 'similar:' . $slug;
        $results = \Illuminate\Support\Facades\Cache::remember($cacheKey, 600, function () use ($target) {
            $cuisine = strtolower((string) ($target->cuisine ?? ''));
            $targetId = (string) $target->_id;
            $targetTags = array_map('strtolower', $target->tags ?? []);
            $targetTitle = strtolower($target->title ?? '');

            // Pull a pool of candidates from the same cuisine; fall back to all-cuisine
            // if the cuisine has fewer than 50 published recipes.
            $candidates = Recipe::published()
                ->where('_id', '!=', $targetId)
                ->where('cuisine', $cuisine)
                ->limit(600)
                ->get();

            if ($candidates->count() < 12) {
                $candidates = Recipe::published()
                    ->where('_id', '!=', $targetId)
                    ->limit(600)
                    ->get();
            }

            $targetKeywords = $this->extractKeywords($targetTitle, $targetTags);
            $targetDiet = $this->classifyDiet($targetTags, $targetTitle, $target->ingredients ?? []);

            $scored = $candidates->map(function ($r) use ($targetKeywords, $targetTags, $targetDiet, $cuisine) {
                $score = 0;

                // Cuisine match (already filtered to same cuisine in the primary pool)
                if (strtolower((string) ($r->cuisine ?? '')) === $cuisine && $cuisine !== '') {
                    $score += 5;
                }

                // Diet match
                $candidateDiet = $this->classifyDiet(
                    array_map('strtolower', $r->tags ?? []),
                    strtolower($r->title ?? ''),
                    $r->ingredients ?? []
                );
                if ($candidateDiet === $targetDiet) $score += 4;

                // Shared keywords in title (chicken, paneer, biryani, …)
                $candidateKeywords = $this->extractKeywords(strtolower($r->title ?? ''), array_map('strtolower', $r->tags ?? []));
                $shared = array_intersect($targetKeywords, $candidateKeywords);
                $score += 6 * count($shared);

                // Shared tags
                $sharedTags = array_intersect($targetTags, array_map('strtolower', $r->tags ?? []));
                $score += min(5, count($sharedTags));

                // Has a real photo? Tiny bump so we don't recommend emoji-fallback cards
                if (!empty($r->has_real_image)) $score += 1;

                return ['recipe' => $r, 'score' => $score];
            })
            ->filter(fn($x) => $x['score'] >= 5)
            ->sortByDesc('score')
            ->take(8)
            ->values();

            return $scored->map(function ($x) {
                $r = $x['recipe'];
                return [
                    'id'           => (string) $r->_id,
                    'title'        => $r->title,
                    'slug'         => $r->slug,
                    'cuisine'      => $r->cuisine,
                    'tags'         => $r->tags ?? [],
                    'cook_time'    => $r->cook_time,
                    'prep_time'    => $r->prep_time,
                    'difficulty'   => $r->difficulty,
                    'avg_rating'   => $r->avg_rating,
                    'rating_count' => $r->rating_count,
                    'image_url'    => $r->image_url,
                    'servings'     => $r->servings,
                ];
            })->toArray();
        });

        return $this->success($results);
    }

    /**
     * Pull dish/protein/method keywords out of title + tags for similarity scoring.
     */
    private function extractKeywords(string $title, array $tags): array
    {
        $keywords = [
            'chicken', 'paneer', 'mutton', 'beef', 'lamb', 'pork', 'fish', 'salmon',
            'prawn', 'shrimp', 'tofu', 'egg',
            'biryani', 'pulao', 'pilaf', 'risotto', 'rice',
            'dal', 'sambar', 'rasam', 'lentil',
            'curry', 'masala', 'tikka', 'korma', 'sabzi',
            'samosa', 'pakora', 'fritter', 'cutlet', 'kachori',
            'pasta', 'pizza', 'noodle', 'ramen',
            'cake', 'cookie', 'brownie', 'halwa', 'kheer', 'jalebi', 'ladoo',
            'soup', 'salad', 'sandwich', 'wrap',
            'idli', 'dosa', 'upma', 'paratha', 'naan', 'roti',
        ];
        $hay = $title . ' ' . implode(' ', $tags);
        return array_values(array_filter($keywords, fn($k) => str_contains($hay, $k)));
    }

    private function classifyDiet(array $tags, string $title, $ingredients): string
    {
        foreach ($tags as $t) {
            if (str_contains($t, 'non vegetarian') || str_contains($t, 'non vegeterian')) return 'nonveg';
        }
        foreach ($tags as $t) {
            if (str_contains($t, 'eggetarian')) return 'egg';
        }
        foreach ($tags as $t) {
            if ($t === 'vegan' || str_contains($t, 'vegetarian')) return 'veg';
        }
        $ingsText = collect(is_array($ingredients) ? $ingredients : [])
            ->map(fn($i) => is_string($i) ? $i : ($i['name'] ?? ''))
            ->implode(' ');
        $hay = strtolower($title . ' ' . $ingsText);
        foreach (['chicken','beef','pork','fish','salmon','shrimp','lamb','mutton','bacon','turkey','prawn','tuna','crab','lobster','duck','sausage','ham'] as $m) {
            if (str_contains($hay, $m)) return 'nonveg';
        }
        if (preg_match('/\begg\b/', $hay)) return 'egg';
        return 'veg';
    }

    /**
     * Top 8 popular recipes.
     */
    public function popular(): JsonResponse
    {
        $recipes = Recipe::published()
            ->orderBy('avg_rating', 'desc')
            ->orderBy('rating_count', 'desc')
            ->limit(8)
            ->get()
            ->map(fn($r) => [
                'id'           => (string) $r->_id,
                'title'        => $r->title,
                'slug'         => $r->slug,
                'cuisine'      => $r->cuisine,
                'tags'         => $r->tags ?? [],
                'cook_time'    => $r->cook_time,
                'prep_time'    => $r->prep_time,
                'difficulty'   => $r->difficulty,
                'avg_rating'   => $r->avg_rating,
                'rating_count' => $r->rating_count,
                'image_url'    => $r->image_url,
                'nutrition'    => $r->nutrition,
                'servings'     => $r->servings,
            ]);

        return $this->success($recipes);
    }

    /**
     * Allow authenticated users to submit their own recipes.
     */
    public function submitUserRecipe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:200',
            'description'  => 'required|string',
            'ingredients'  => 'required|array|min:1',
            'instructions' => 'required|array|min:1',
            'cuisine'      => 'required|string',
            'tags'         => 'array',
            'cook_time'    => 'required|integer|min:1',
            'prep_time'    => 'required|integer|min:1',
            'servings'     => 'required|integer|min:1',
            'difficulty'   => 'required|in:easy,medium,hard',
        ]);

        $recipe = Recipe::create(array_merge($validated, [
            'source'     => 'user_submitted',
            'status'     => 'pending',
            'created_by' => (string) $request->user()->_id,
        ]));

        return $this->success(
            array_merge($recipe->toArray(), ['id' => (string) $recipe->_id]),
            'Recipe submitted successfully. It will be reviewed by our team.',
            201
        );
    }
}
