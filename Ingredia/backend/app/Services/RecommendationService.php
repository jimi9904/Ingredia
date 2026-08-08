<?php

namespace App\Services;

use App\Models\Recipe;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Collection;

class RecommendationService
{
    public function __construct(
        protected IngredientNormalisationService $normaliser
    ) {}

    /**
     * Content-based filtering: match user preferences to recipes.
     */
    public function contentBased(User $user): Collection
    {
        $prefs = $user->preferences ?? [];
        $dietary = $prefs['dietary'] ?? [];
        $allergies = $prefs['allergies'] ?? [];
        $cuisines = $prefs['cuisine_preference'] ?? [];

        $query = Recipe::published();

        // Filter by dietary tags if specified
        if (!empty($dietary)) {
            $query->whereIn('tags', $dietary);
        }

        // Exclude recipes containing allergens
        if (!empty($allergies)) {
            $normalisedAllergies = array_map(
                fn($a) => $this->normaliser->normalize($a),
                $allergies
            );
            foreach ($normalisedAllergies as $allergen) {
                $query->where('ingredients.normalized', '!=', $allergen);
            }
        }

        $recipes = $query->limit(30)->get();

        // Boost score for preferred cuisines
        return $recipes->map(function ($recipe) use ($cuisines) {
            $recipe->recommendation_score = in_array($recipe->cuisine, $cuisines) ? 15 : 0;
            $recipe->recommendation_score += $recipe->avg_rating * 10;
            return $recipe;
        })->sortByDesc('recommendation_score')->values();
    }

    /**
     * Collaborative filtering: find similar users and their liked recipes.
     */
    public function collaborative(User $user): Collection
    {
        // Get recipes this user has rated >= 4
        $userRatings = Review::where('user_id', (string) $user->_id)
            ->where('rating', '>=', 4)
            ->pluck('recipe_id')
            ->toArray();

        if (empty($userRatings)) {
            return collect();
        }

        // Find users who rated the same recipes >= 4
        $similarUserIds = Review::whereIn('recipe_id', $userRatings)
            ->where('rating', '>=', 4)
            ->where('user_id', '!=', (string) $user->_id)
            ->pluck('user_id')
            ->unique()
            ->toArray();

        if (empty($similarUserIds)) {
            return collect();
        }

        // Get recipes those similar users liked that the current user hasn't rated
        $theirLikedRecipeIds = Review::whereIn('user_id', $similarUserIds)
            ->where('rating', '>=', 4)
            ->whereNotIn('recipe_id', $userRatings)
            ->get()
            ->groupBy('recipe_id')
            ->sortByDesc(fn($group) => $group->count())
            ->take(20)
            ->keys()
            ->toArray();

        if (empty($theirLikedRecipeIds)) {
            return collect();
        }

        return Recipe::published()
            ->whereIn('_id', $theirLikedRecipeIds)
            ->limit(10)
            ->get();
    }

    /**
     * Combined recommendations for a user (max 20, deduplicated).
     */
    public function forUser(User $user): Collection
    {
        $contentBased   = $this->contentBased($user)->take(15);
        $collaborative  = $this->collaborative($user)->take(10);

        $combined = $contentBased->concat($collaborative)
            ->unique('_id')
            ->take(20)
            ->values();

        // If we don't have enough, fill with popular recipes
        if ($combined->count() < 10) {
            $existingIds = $combined->pluck('_id')->toArray();
            $popular = Recipe::published()
                ->whereNotIn('_id', $existingIds)
                ->orderBy('avg_rating', 'desc')
                ->orderBy('rating_count', 'desc')
                ->limit(10)
                ->get();
            $combined = $combined->concat($popular)->unique('_id')->take(20)->values();
        }

        return $combined;
    }
}
