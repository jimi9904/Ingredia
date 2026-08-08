<?php

namespace App\Http\Controllers;

use App\Services\ShoppingListService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShoppingListController extends Controller
{
    use ApiResponse;

    public function __construct(protected ShoppingListService $service) {}

    public function preview(Request $request, string $recipeId): JsonResponse
    {
        $data = $this->service->generate($recipeId, $request->user());
        return $this->success([
            'recipe'     => ['id' => (string) $data['recipe']->_id, 'title' => $data['recipe']->title, 'servings' => $data['recipe']->servings],
            'missing'    => $data['missing'],
            'pantry_has' => $data['pantry_has'],
        ]);
    }

    public function download(Request $request, string $recipeId)
    {
        return $this->service->generatePDF($recipeId, $request->user());
    }
}
