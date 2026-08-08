<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\SearchLog;
use App\Services\IngredientMatchService;
use App\Services\IngredientNormalisationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected IngredientMatchService $matcher,
        protected IngredientNormalisationService $normaliser
    ) {}

    /**
     * Search recipes by ingredients and filters.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q'            => 'nullable|string|max:100',
            'ingredients'  => 'nullable|string',
            'cuisine'      => 'nullable|string',
            'tags'         => 'nullable|array',
            'max_time'     => 'nullable|integer|min:1',
            'difficulty'   => 'nullable|in:easy,medium,hard',
            'min_calories' => 'nullable|integer|min:0',
            'max_calories' => 'nullable|integer|min:0',
            'page'         => 'nullable|integer|min:1',
            'per_page'     => 'nullable|integer|min:1|max:48',
            'sort'         => 'nullable|string',
        ]);

        $page    = $validated['page'] ?? 1;
        $perPage = $validated['per_page'] ?? 12;

        // Parse ingredients
        $rawIngredients = [];
        if (!empty($validated['ingredients'])) {
            $rawIngredients = array_filter(array_map('trim', explode(',', $validated['ingredients'])));
        }

        $normalisedIngredients = array_values(array_unique(array_filter(array_map(
            fn($ing) => strtolower(trim((string) $ing)),
            $rawIngredients
        ))));

        $query = Recipe::published();

        if (!empty($validated['q'])) {
            $query->where('title', 'like', '%' . $validated['q'] . '%');
        }

        if (!empty($validated['cuisine'])) {
            $query->where('cuisine', $validated['cuisine']);
        }

        if (!empty($validated['tags'])) {
            foreach ($validated['tags'] as $tag) {
                $query->where('tags', $tag);
            }
        }

        if (!empty($validated['max_time'])) {
            $query->where('cook_time', '<=', (int) $validated['max_time']);
        }

        if (!empty($validated['difficulty'])) {
            $query->where('difficulty', $validated['difficulty']);
        }

        if (!empty($validated['min_calories'])) {
            $query->where('nutrition.calories', '>=', (int) $validated['min_calories']);
        }

        if (!empty($validated['max_calories'])) {
            $query->where('nutrition.calories', '<=', (int) $validated['max_calories']);
        }

        if (!empty($normalisedIngredients)) {
            // Use regex partial-match so "tomato" finds "baby plum tomatoes", etc.
            $query->where(function ($q) use ($normalisedIngredients) {
                foreach ($normalisedIngredients as $ing) {
                    $q->orWhere('ingredients', 'elemMatch', ['$regex' => $ing, '$options' => 'i']);
                }
            });
            $candidateLimit = 500;
            $candidates = $query->limit($candidateLimit)->get();

            $scored = $candidates->map(function ($recipe) use ($normalisedIngredients) {
                $matchData = $this->matcher->score($normalisedIngredients, $recipe);
                $recipe->match_score         = $matchData['score'];
                $recipe->matched_ingredients = $matchData['matched'];
                $recipe->missing_ingredients = $matchData['missing'];
                return $recipe;
            })->filter(fn($r) => $r->match_score >= 10);

            $sort = $validated['sort'] ?? 'match_score';
            $scored = match ($sort) {
                'rating'    => $scored->sortByDesc('avg_rating'),
                'quickest'  => $scored->sortBy('cook_time'),
                'fewest'    => $scored->sortBy(fn($r) => count($r->missing_ingredients ?? [])),
                // Default ranking tiebreaks: real-image dishes bubble up at equal score.
                default     => $scored->sortByDesc(fn($r) => [$r->match_score, (int) ($r->has_real_image ?? 0), $r->avg_rating]),
            };

            $scored = $scored->values();
            $total  = $scored->count();
            $items  = $scored->slice(($page - 1) * $perPage, $perPage)->values();

            $result = [
                'data'  => $items->map(fn($r) => $this->formatRecipe($r))->values(),
                'total' => $total,
            ];
        } else {
            $sort = $validated['sort'] ?? null;
            match ($sort) {
                'rating'   => $query->orderBy('avg_rating', 'desc'),
                'quickest' => $query->orderBy('cook_time', 'asc'),
                // Default: real-image dishes first, then newest. (Compound index lives in the recipes collection.)
                default    => $query->orderBy('has_real_image', 'desc')->orderBy('created_at', 'desc'),
            };

            $paginator = $query->paginate($perPage, ['*'], 'page', $page);

            $result = [
                'data'  => collect($paginator->items())->map(function ($r) {
                    $r->match_score = null;
                    $r->matched_ingredients = [];
                    $r->missing_ingredients = [];
                    return $this->formatRecipe($r);
                })->values(),
                'total' => $paginator->total(),
            ];
        }

        // Log the search (session() can fail on stateless API — use header or UUID fallback)
        try {
            $sessionId = $request->session()->getId();
        } catch (\Throwable $e) {
            $sessionId = $request->header('X-Session-Id', (string) \Illuminate\Support\Str::uuid());
        }

        SearchLog::create([
            'user_id'              => $request->user() ? (string) $request->user()->_id : null,
            'ingredients_searched' => $rawIngredients,
            'filters_applied'      => array_filter($validated),
            'results_count'        => $result['total'],
            'session_id'           => $sessionId,
        ]);

        return response()->json([
            'success'        => true,
            'data'           => $result['data'],
            'meta'           => [
                'total'    => $result['total'],
                'page'     => $page,
                'per_page' => $perPage,
            ],
            'filters_applied' => array_filter($validated),
        ]);
    }

    /**
     * Autocomplete ingredients.
     */
    public function autocomplete(Request $request): JsonResponse
    {
        $q = (string) $request->input('q', '');

        if (strlen($q) < 2) {
            return $this->success([]);
        }

        $ingredients = \App\Models\Ingredient::where('canonical_name', 'like', "%{$q}%")
            ->orWhere('aliases', 'elemMatch', ['$regex' => $q, '$options' => 'i'])
            ->limit(10)
            ->pluck('canonical_name');

        return $this->success($ingredients);
    }

    private function formatRecipe($recipe): array
    {
        $ingredients = collect($recipe->ingredients ?? [])->map(function ($ing) {
            if (is_array($ing)) {
                return $ing['name'] ?? $ing['normalized'] ?? '';
            }
            return (string) $ing;
        })->filter()->values()->all();

        return [
            'id'                  => (string) $recipe->_id,
            'title'               => $recipe->title,
            'slug'                => $recipe->slug,
            'cuisine'             => $recipe->cuisine,
            'tags'                => $recipe->tags,
            'ingredients'         => $ingredients,
            'instructions'        => $recipe->instructions ?? [],
            'servings'            => $recipe->servings,
            'nutrition'           => $recipe->nutrition,
            'cook_time'           => $recipe->cook_time,
            'prep_time'           => $recipe->prep_time,
            'difficulty'          => $recipe->difficulty,
            'avg_rating'          => $recipe->avg_rating,
            'rating_count'        => $recipe->rating_count,
            'image_url'           => $recipe->image_url,
            'match_score'         => $recipe->match_score ?? null,
            'missing_ingredients' => $recipe->missing_ingredients ?? [],
            'matched_ingredients' => $recipe->matched_ingredients ?? [],
        ];
    }
}
