<?php

namespace App\Http\Controllers;

use App\Models\Pantry;
use App\Services\IngredientNormalisationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PantryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected IngredientNormalisationService $normaliser
    ) {}

    /**
     * Get user's pantry.
     */
    public function index(Request $request): JsonResponse
    {
        $pantry = Pantry::firstOrCreate(
            ['user_id' => (string) $request->user()->_id],
            ['ingredients' => []]
        );

        return $this->success($pantry->ingredients ?? []);
    }

    /**
     * Add ingredient(s) to pantry.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'ingredients'   => 'required_without:ingredient',
            'ingredients.*' => 'string',
            'ingredient'    => 'required_without:ingredients|string',
        ]);

        $toAdd = $request->has('ingredients')
            ? $request->array('ingredients')
            : [$request->string('ingredient')];

        $pantry = Pantry::firstOrCreate(
            ['user_id' => (string) $request->user()->_id],
            ['ingredients' => []]
        );

        $current = $pantry->ingredients ?? [];
        $existingNames = array_column($current, 'name');

        $added = [];
        foreach ($toAdd as $raw) {
            $canonical = $this->normaliser->normalize($raw);

            if (!in_array($canonical, $existingNames)) {
                $current[] = ['name' => $canonical, 'original' => $raw];
                $existingNames[] = $canonical;
                $added[] = $canonical;
            }
        }

        $pantry->ingredients = $current;
        $pantry->save();

        return $this->success([
            'ingredients' => $pantry->ingredients,
            'added'       => $added,
        ], count($added) . ' ingredient(s) added.');
    }

    /**
     * Remove ingredient from pantry.
     */
    public function destroy(Request $request, string $ingredientName): JsonResponse
    {
        $pantry = Pantry::where('user_id', (string) $request->user()->_id)->firstOrFail();
        $canonical = $this->normaliser->normalize($ingredientName);

        $filtered = array_filter(
            $pantry->ingredients ?? [],
            fn($ing) => $ing['name'] !== $canonical
        );

        $pantry->ingredients = array_values($filtered);
        $pantry->save();

        return $this->success($pantry->ingredients, 'Ingredient removed.');
    }

    /**
     * Replace entire pantry.
     */
    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            'ingredients'   => 'required|array',
            'ingredients.*' => 'string',
        ]);

        $pantry = Pantry::firstOrCreate(
            ['user_id' => (string) $request->user()->_id],
            ['ingredients' => []]
        );

        $normalised = array_map(function ($raw) {
            return ['name' => $this->normaliser->normalize($raw), 'original' => $raw];
        }, $request->array('ingredients'));

        // Remove duplicates
        $seen = [];
        $unique = [];
        foreach ($normalised as $ing) {
            if (!in_array($ing['name'], $seen)) {
                $seen[] = $ing['name'];
                $unique[] = $ing;
            }
        }

        $pantry->ingredients = $unique;
        $pantry->save();

        return $this->success($pantry->ingredients, 'Pantry synced.');
    }
}
