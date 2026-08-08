<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\Review;
use App\Models\SavedCollection;
use App\Models\SearchLog;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class AdminAnalyticsController extends Controller
{
    use ApiResponse;

    public function dashboard(): JsonResponse
    {
        $totalRecipes  = Recipe::count();
        $totalUsers    = User::count();
        $totalReviews  = Review::count();
        $pendingRecipes = Recipe::where('status', 'pending')->count();
        $today         = now()->startOfDay();

        $searchesToday = SearchLog::where('created_at', '>=', $today)->count();

        // Top 10 searched ingredients
        $logs = SearchLog::where('created_at', '>=', now()->subDays(30))->get();
        $ingredientCounts = [];
        foreach ($logs as $log) {
            foreach ($log->ingredients_searched ?? [] as $ing) {
                $ing = strtolower(trim($ing));
                $ingredientCounts[$ing] = ($ingredientCounts[$ing] ?? 0) + 1;
            }
        }
        arsort($ingredientCounts);
        $topIngredients = array_slice($ingredientCounts, 0, 10, true);

        // Top cuisines by recipe count
        $allRecipes = Recipe::published()->get(['cuisine']);
        $cuisineCounts = [];
        foreach ($allRecipes as $r) {
            $c = strtolower(trim($r->cuisine ?? ''));
            if ($c) $cuisineCounts[$c] = ($cuisineCounts[$c] ?? 0) + 1;
        }
        arsort($cuisineCounts);
        $topCuisines = array_slice(
            array_map(fn($cuisine, $count) => ['cuisine' => $cuisine, 'count' => $count], array_keys($cuisineCounts), $cuisineCounts),
            0, 10
        );

        // Recent sign-ups (last 10)
        $recentSignups = User::orderBy('created_at', 'desc')->limit(10)->get(['name', 'email', 'created_at'])
            ->map(fn($u) => ['id' => (string) $u->_id, 'name' => $u->name, 'email' => $u->email, 'created_at' => $u->created_at]);

        // Top 10 rated recipes
        $topRated = Recipe::published()
            ->orderBy('avg_rating', 'desc')
            ->orderBy('rating_count', 'desc')
            ->limit(10)
            ->get(['title', 'slug', 'avg_rating', 'rating_count', 'cuisine']);

        // Searches per day (last 30 days)
        $searchesPerDay = [];
        for ($i = 29; $i >= 0; $i--) {
            $day = now()->subDays($i)->format('Y-m-d');
            $count = SearchLog::where('created_at', '>=', now()->subDays($i)->startOfDay())
                ->where('created_at', '<=', now()->subDays($i)->endOfDay())
                ->count();
            $searchesPerDay[] = ['date' => $day, 'count' => $count];
        }

        // New users per day (last 30 days)
        $usersPerDay = [];
        for ($i = 29; $i >= 0; $i--) {
            $day = now()->subDays($i)->format('Y-m-d');
            $count = User::where('created_at', '>=', now()->subDays($i)->startOfDay())
                ->where('created_at', '<=', now()->subDays($i)->endOfDay())
                ->count();
            $usersPerDay[] = ['date' => $day, 'count' => $count];
        }

        return $this->success([
            'total_recipes'     => $totalRecipes,
            'total_users'       => $totalUsers,
            'total_reviews'     => $totalReviews,
            'pending_recipes'   => $pendingRecipes,
            'searches_today'    => $searchesToday,
            'top_cuisines'      => $topCuisines,
            'recent_signups'    => $recentSignups,
            'top_ingredients'   => $topIngredients,
            'top_rated_recipes' => $topRated,
            'searches_per_day'  => $searchesPerDay,
            'users_per_day'     => $usersPerDay,
        ]);
    }
}
