<?php

namespace App\Listeners;

use App\Events\ReviewSubmitted;
use Illuminate\Support\Facades\Cache;

class UpdateRecipeRating
{
    public function handle(ReviewSubmitted $event): void
    {
        $recipe = $event->recipe->fresh();
        if (!$recipe) return;

        $total    = ($recipe->avg_rating * $recipe->rating_count) + $event->review->rating;
        $newCount = $recipe->rating_count + 1;

        $recipe->avg_rating   = round($total / $newCount, 2);
        $recipe->rating_count = $newCount;
        $recipe->save();

        Cache::forget('recipes:popular');
        Cache::forget('recipe:' . $recipe->slug);
    }
}
