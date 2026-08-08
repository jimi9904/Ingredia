<?php

namespace App\Http\Controllers;

use App\Models\SavedCollection;
use App\Models\Recipe;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedRecipeController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $userId = (string) $request->user()->_id;
        $collections = SavedCollection::where('user_id', $userId)->get();

        $allRecipeIds = $collections->flatMap(fn($col) => $col->recipe_ids ?? [])->unique()->values()->toArray();

        $recipes = Recipe::whereIn('_id', $allRecipeIds)->get()->map(fn($r) => [
            'id'           => (string) $r->_id,
            'title'        => $r->title,
            'slug'         => $r->slug,
            'image_url'    => $r->image_url,
            'cuisine'      => $r->cuisine,
            'tags'         => $r->tags ?? [],
            'avg_rating'   => $r->avg_rating,
            'rating_count' => $r->rating_count,
            'cook_time'    => $r->cook_time,
            'prep_time'    => $r->prep_time,
            'difficulty'   => $r->difficulty,
            'ingredients'  => $r->ingredients ?? [],
            'servings'     => $r->servings,
        ]);

        return $this->success($recipes);
    }

    public function store(Request $request, string $recipeId): JsonResponse
    {
        $request->validate(['collection_name' => 'nullable|string|max:100']);
        $collectionName = $request->string('collection_name', 'Saved Recipes');
        $userId = (string) $request->user()->_id;

        $collection = SavedCollection::firstOrCreate(
            ['user_id' => $userId, 'name' => $collectionName],
            ['recipe_ids' => []]
        );

        $ids = $collection->recipe_ids ?? [];
        if (!in_array($recipeId, $ids)) {
            $ids[] = $recipeId;
            $collection->recipe_ids = $ids;
            $collection->save();
        }

        return $this->success(null, 'Recipe saved.');
    }

    public function destroy(Request $request, string $recipeId): JsonResponse
    {
        $userId = (string) $request->user()->_id;
        $collections = SavedCollection::where('user_id', $userId)->get();
        foreach ($collections as $col) {
            $ids = array_filter($col->recipe_ids ?? [], fn($id) => $id !== $recipeId);
            $col->recipe_ids = array_values($ids);
            $col->save();
        }
        return $this->success(null, 'Recipe removed from saved.');
    }

    public function collections(Request $request): JsonResponse
    {
        $collections = SavedCollection::where('user_id', (string) $request->user()->_id)
            ->get(['name', 'recipe_ids'])
            ->map(fn($c) => ['name' => $c->name, 'count' => count($c->recipe_ids ?? [])]);
        return $this->success($collections);
    }

    public function createCollection(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:100']);
        $userId = (string) $request->user()->_id;

        $exists = SavedCollection::where('user_id', $userId)->where('name', $request->string('name'))->exists();
        if ($exists) {
            return $this->error('Collection with this name already exists.', 422);
        }

        $collection = SavedCollection::create(['user_id' => $userId, 'name' => $request->string('name'), 'recipe_ids' => []]);
        return $this->success(['id' => (string) $collection->_id, 'name' => $collection->name], 'Collection created.', 201);
    }
}
