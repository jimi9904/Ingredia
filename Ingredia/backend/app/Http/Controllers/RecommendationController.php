<?php

namespace App\Http\Controllers;

use App\Services\RecommendationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class RecommendationController extends Controller
{
    use ApiResponse;

    public function __construct(protected RecommendationService $service) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cacheKey = 'recommendations:user:' . (string) $user->_id;

        $recipes = Cache::remember($cacheKey, 3600, function () use ($user) {
            return $this->service->forUser($user)->map(fn($r) => [
                'id'           => (string) $r->_id,
                'title'        => $r->title,
                'slug'         => $r->slug,
                'cuisine'      => $r->cuisine,
                'tags'         => $r->tags,
                'cook_time'    => $r->cook_time,
                'difficulty'   => $r->difficulty,
                'avg_rating'   => $r->avg_rating,
                'rating_count' => $r->rating_count,
                'image_url'    => $r->image_url,
            ])->values();
        });

        return $this->success($recipes);
    }
}
