<?php

namespace App\Services;

use App\Models\Ingredient;
use Illuminate\Support\Facades\Cache;

class IngredientNormalisationService
{
    /**
     * Normalize an ingredient name to its canonical form.
     */
    public function normalize(string $ingredient): string
    {
        $ingredient = strtolower(trim($ingredient));

        // Check cache first
        $cacheKey = 'ingredient_normalize:' . md5($ingredient);
        return Cache::remember($cacheKey, 3600, function () use ($ingredient) {
            // Look up in the Ingredient collection aliases array
            $found = Ingredient::where('canonical_name', $ingredient)
                ->orWhere('aliases', $ingredient)
                ->first();

            if ($found) {
                return $found->canonical_name;
            }

            // Try partial match
            $found = Ingredient::where('canonical_name', 'like', '%' . $ingredient . '%')
                ->orWhere('aliases', 'elemMatch', ['$regex' => $ingredient])
                ->first();

            return $found ? $found->canonical_name : $ingredient;
        });
    }

    /**
     * Normalize an array of ingredient names.
     */
    public function normalizeMany(array $ingredients): array
    {
        return array_map(fn($ing) => $this->normalize($ing), $ingredients);
    }
}
