<?php

namespace App\Http\Controllers;

use App\Events\ReviewSubmitted;
use App\Http\Requests\StoreReviewRequest;
use App\Models\Review;
use App\Models\Recipe;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ReviewController extends Controller
{
    use ApiResponse;

    public function index(Request $request, string $recipeId): JsonResponse
    {
        $reviews = Review::where('recipe_id', $recipeId)
            ->latest()
            ->paginate($request->integer('per_page', 10));

        $items = collect($reviews->items())->map(fn($r) => [
            'id'         => (string) $r->_id,
            'rating'     => $r->rating,
            'comment'    => $r->comment,
            'photo_url'  => $r->photo_url,
            'created_at' => $r->created_at,
            'user'       => ['id' => $r->user_id, 'name' => optional($r->user)->name ?? 'Anonymous'],
        ]);

        return response()->json([
            'success' => true,
            'data'    => $items,
            'meta'    => ['total' => $reviews->total(), 'page' => $reviews->currentPage(), 'per_page' => $reviews->perPage()],
        ]);
    }

    public function store(StoreReviewRequest $request, string $recipeId): JsonResponse
    {

        $userId = (string) $request->user()->_id;

        if (Review::where('recipe_id', $recipeId)->where('user_id', $userId)->exists()) {
            return $this->error('You have already reviewed this recipe.', 422);
        }

        $recipe = Recipe::findOrFail($recipeId);

        $photoUrl = null;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('reviews', 'public');
            $photoUrl = '/storage/' . $path;
        }

        $review = Review::create([
            'recipe_id' => $recipeId,
            'user_id' => $userId,
            'rating' => $request->integer('rating'),
            'comment' => $request->string('comment'),
            'photo_url' => $photoUrl,
        ]);

        // Event handles avg_rating recalculation and cache busting
        ReviewSubmitted::dispatch($review, $recipe);

        return $this->success([
            'id' => (string) $review->_id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'photo_url' => $review->photo_url,
            'created_at' => $review->created_at
        ], 'Review submitted.', 201);
    }

    public function destroy(Request $request, string $reviewId): JsonResponse
    {
        $review = Review::findOrFail($reviewId);
        $user   = $request->user();

        $this->authorize('delete', $review);

        $recipe = Recipe::find($review->recipe_id);
        if ($recipe && $recipe->rating_count > 1) {
            $totalRating = ($recipe->avg_rating * $recipe->rating_count) - $review->rating;
            $newCount    = $recipe->rating_count - 1;
            $recipe->avg_rating   = round($totalRating / $newCount, 2);
            $recipe->rating_count = $newCount;
            $recipe->save();
        } elseif ($recipe) {
            $recipe->avg_rating   = 0;
            $recipe->rating_count = 0;
            $recipe->save();
        }

        $review->delete();
        return $this->success(null, 'Review deleted.');
    }
}
