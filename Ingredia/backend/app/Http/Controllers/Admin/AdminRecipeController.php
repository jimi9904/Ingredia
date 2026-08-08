<?php

namespace App\Http\Controllers\Admin;

use App\Events\RecipeApproved;
use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Services\IngredientNormalisationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRecipeController extends Controller
{
    use ApiResponse;

    public function __construct(protected IngredientNormalisationService $normaliser) {}

    public function index(Request $request): JsonResponse
    {
        $query = Recipe::query();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        $recipes = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 20));
        return $this->paginated($recipes);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:200',
            'description'  => 'required|string',
            'ingredients'  => 'required|array|min:1',
            'instructions' => 'required|array|min:1',
            'cuisine'      => 'required|string',
            'tags'         => 'array',
            'cook_time'    => 'required|integer|min:1',
            'prep_time'    => 'required|integer|min:1',
            'servings'     => 'required|integer|min:1',
            'difficulty'   => 'required|in:easy,medium,hard',
            'nutrition'    => 'nullable|array',
            'image_url'    => 'nullable|string',
        ]);

        $ingredients = array_map(function ($ing) {
            $ing['normalized'] = $this->normaliser->normalize($ing['name'] ?? '');
            return $ing;
        }, $validated['ingredients']);

        $recipe = Recipe::create(array_merge($validated, ['ingredients' => $ingredients, 'source' => 'admin', 'status' => 'published', 'created_by' => (string) $request->user()->_id]));
        return $this->success(array_merge($recipe->toArray(), ['id' => (string) $recipe->_id]), 'Recipe created.', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $recipe = Recipe::findOrFail($id);
        $validated = $request->validate([
            'title'        => 'sometimes|string|max:200',
            'description'  => 'sometimes|string',
            'ingredients'  => 'sometimes|array',
            'instructions' => 'sometimes|array',
            'cuisine'      => 'sometimes|string',
            'tags'         => 'sometimes|array',
            'cook_time'    => 'sometimes|integer|min:1',
            'prep_time'    => 'sometimes|integer|min:1',
            'servings'     => 'sometimes|integer|min:1',
            'difficulty'   => 'sometimes|in:easy,medium,hard',
            'nutrition'    => 'sometimes|array',
            'image_url'    => 'sometimes|string',
            'status'       => 'sometimes|in:published,pending,rejected',
        ]);

        if (isset($validated['ingredients'])) {
            $validated['ingredients'] = array_map(function ($ing) {
                $ing['normalized'] = $this->normaliser->normalize($ing['name'] ?? '');
                return $ing;
            }, $validated['ingredients']);
        }

        $recipe->update($validated);
        \Illuminate\Support\Facades\Cache::forget('recipe:' . $recipe->slug);

        return $this->success(array_merge($recipe->fresh()->toArray(), ['id' => $id]), 'Recipe updated.');
    }

    public function destroy(string $id): JsonResponse
    {
        $recipe = Recipe::findOrFail($id);
        \Illuminate\Support\Facades\Cache::forget('recipe:' . $recipe->slug);
        $recipe->delete();
        return $this->success(null, 'Recipe deleted.');
    }

    public function approve(string $id): JsonResponse
    {
        $recipe = Recipe::findOrFail($id);
        $recipe->status = 'published';
        $recipe->save();

        RecipeApproved::dispatch($recipe);

        return $this->success(null, 'Recipe approved.');
    }

    public function reject(string $id): JsonResponse
    {
        $recipe = Recipe::findOrFail($id);
        $recipe->status = 'rejected';
        $recipe->save();
        return $this->success(null, 'Recipe rejected.');
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $request->validate(['recipes' => 'required|array|min:1', 'recipes.*.title' => 'required|string', 'recipes.*.ingredients' => 'required|array', 'recipes.*.instructions' => 'required|array']);
        $created = 0;
        foreach ($request->array('recipes') as $data) {
            $data['source'] = 'admin';
            $data['status'] = 'published';
            $data['created_by'] = (string) $request->user()->_id;
            if (isset($data['ingredients'])) {
                $data['ingredients'] = array_map(fn($ing) => array_merge($ing, ['normalized' => $this->normaliser->normalize($ing['name'] ?? '')]), $data['ingredients']);
            }
            Recipe::create($data);
            $created++;
        }
        return $this->success(['imported' => $created], "{$created} recipes imported.");
    }
}
