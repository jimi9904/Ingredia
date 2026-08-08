<?php

namespace App\Services;

use App\Models\Recipe;

class IngredientMatchService
{
    public function __construct(
        protected IngredientNormalisationService $normaliser
    ) {}

    /**
     * Score how well the user's ingredients match a recipe.
     *
     * @param  array  $userIngredients  Raw ingredient names from user
     * @param  Recipe $recipe           Recipe to score against
     * @return array{ score: float, matched: array, missing: array }
     */
    public function score(array $userIngredients, Recipe $recipe): array
    {
        $normalisedUser = array_unique(array_filter(array_map(
            fn($ing) => strtolower(trim((string) $ing)),
            $userIngredients
        )));

        $recipeIngredients = $recipe->ingredients ?? [];
        $totalCount = count($recipeIngredients);

        if ($totalCount === 0) {
            return ['score' => 0.0, 'matched' => [], 'missing' => []];
        }

        $matched = [];
        $missing = [];

        foreach ($recipeIngredients as $ing) {
            if (is_array($ing)) {
                $displayName = $ing['name'] ?? $ing['normalized'] ?? '';
                $normalised = strtolower(trim((string) ($ing['normalized'] ?? $displayName)));
                $quantity = $ing['quantity'] ?? '';
                $unit = $ing['unit'] ?? '';
            } else {
                $displayName = (string) $ing;
                $normalised = strtolower(trim($displayName));
                $quantity = '';
                $unit = '';
            }

            if ($normalised === '') {
                continue;
            }

            $isMatched = false;
            foreach ($normalisedUser as $userIng) {
                if ($normalised === $userIng || str_contains($normalised, $userIng) || str_contains($userIng, $normalised)) {
                    $isMatched = true;
                    break;
                }
            }

            if ($isMatched) {
                $matched[] = $displayName;
            } else {
                $missing[] = [
                    'name'     => $displayName,
                    'quantity' => $quantity,
                    'unit'     => $unit,
                ];
            }
        }

        $matchScore = round((count($matched) / $totalCount) * 100, 1);

        return [
            'score'   => $matchScore,
            'matched' => $matched,
            'missing' => $missing,
        ];
    }
}
