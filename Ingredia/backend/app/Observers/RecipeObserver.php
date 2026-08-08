<?php

namespace App\Observers;

use App\Models\Recipe;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class RecipeObserver
{
    public function creating(Recipe $recipe): void
    {
        if (empty($recipe->slug)) {
            $recipe->slug = Recipe::generateUniqueSlug($recipe->title);
        }
    }

    public function updated(Recipe $recipe): void
    {
        // Bust the per-recipe cache whenever the recipe changes
        Cache::forget('recipe:' . $recipe->slug);

        // If the title changed, regenerate the slug
        if ($recipe->isDirty('title') && !$recipe->isDirty('slug')) {
            $recipe->slug = Recipe::generateUniqueSlug($recipe->title);
        }
    }

    public function deleted(Recipe $recipe): void
    {
        Cache::forget('recipe:' . $recipe->slug);
        Cache::forget('recipes:popular');
    }
}
