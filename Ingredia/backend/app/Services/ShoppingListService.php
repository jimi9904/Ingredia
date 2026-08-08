<?php

namespace App\Services;

use App\Models\Pantry;
use App\Models\Recipe;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;

class ShoppingListService
{
    public function __construct(
        protected IngredientNormalisationService $normaliser
    ) {}

    /**
     * Generate the shopping list for a recipe given user's pantry.
     *
     * @return array{ recipe: Recipe, missing: array, pantry_has: array }
     */
    public function generate(string $recipeId, User $user): array
    {
        $recipe = Recipe::findOrFail($recipeId);

        // Get user's pantry ingredients (normalized)
        $pantry = Pantry::where('user_id', (string) $user->_id)->first();
        $pantryIngredients = $pantry?->ingredients ?? [];

        $normalisedPantry = array_map(
            fn($ing) => $this->normaliser->normalize(is_array($ing) ? $ing['name'] : $ing),
            $pantryIngredients
        );
        $normalisedPantry = array_unique(array_filter($normalisedPantry));

        $missing    = [];
        $pantryHas  = [];

        foreach ($recipe->ingredients ?? [] as $ing) {
            $normalised = $ing['normalized'] ?? $this->normaliser->normalize($ing['name'] ?? '');
            $inPantry = false;

            foreach ($normalisedPantry as $pantryIng) {
                if ($normalised === $pantryIng || str_contains($normalised, $pantryIng) || str_contains($pantryIng, $normalised)) {
                    $inPantry = true;
                    break;
                }
            }

            if ($inPantry) {
                $pantryHas[] = $ing;
            } else {
                $missing[] = $ing;
            }
        }

        return [
            'recipe'     => $recipe,
            'missing'    => $missing,
            'pantry_has' => $pantryHas,
        ];
    }

    /**
     * Generate a PDF shopping list.
     */
    public function generatePDF(string $recipeId, User $user): \Illuminate\Http\Response
    {
        $data = $this->generate($recipeId, $user);

        $pdf = Pdf::loadView('pdf.shopping-list', [
            'recipe'     => $data['recipe'],
            'missing'    => $data['missing'],
            'pantry_has' => $data['pantry_has'],
            'generated'  => now()->format('M j, Y'),
        ]);

        $filename = 'shopping-list-' . $data['recipe']->slug . '.pdf';

        return $pdf->download($filename);
    }
}
