<?php

use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminRecipeController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\PantryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SavedRecipeController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\ShoppingListController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login',    [AuthController::class, 'login'])->middleware('throttle:auth');
Route::get('/auth/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
Route::get('/auth/{provider}/redirect',  [SocialAuthController::class, 'redirect']);
Route::get('/auth/{provider}/callback',  [SocialAuthController::class, 'callback']);
Route::post('/auth/forgot-password',     [PasswordResetController::class, 'sendLink'])->middleware('throttle:auth');
Route::post('/auth/reset-password',      [PasswordResetController::class, 'reset']);

Route::get('/recipes/popular',  [RecipeController::class, 'popular']);
Route::get('/recipes/search',   [SearchController::class, 'search'])->middleware('throttle:search');
Route::get('/recipes',          [RecipeController::class, 'index']);
Route::get('/recipes/{slug}/similar', [RecipeController::class, 'similar']);
Route::get('/recipes/{slug}',   [RecipeController::class, 'show']);
Route::get('/recipes/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/ingredients/autocomplete', [SearchController::class, 'autocomplete']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // Profile
    Route::put('/profile', [ProfileController::class, 'update']);

    Route::get('/recommendations', [RecommendationController::class, 'index']);

    // Pantry
    Route::get('/pantry/ingredients',             [PantryController::class, 'index']);
    Route::post('/pantry/ingredients',            [PantryController::class, 'store']);
    Route::delete('/pantry/ingredients/{name}',   [PantryController::class, 'destroy']);
    Route::post('/pantry/sync',                   [PantryController::class, 'sync']);

    // Saved recipes
    Route::post('/recipes/{id}/save',   [SavedRecipeController::class, 'store']);
    Route::delete('/recipes/{id}/save', [SavedRecipeController::class, 'destroy']);
    Route::get('/saved',                [SavedRecipeController::class, 'index']);
    Route::get('/saved/collections',    [SavedRecipeController::class, 'collections']);
    Route::post('/saved/collections',   [SavedRecipeController::class, 'createCollection']);

    // Reviews
    Route::post('/recipes/{id}/reviews',    [ReviewController::class, 'store'])->middleware('throttle:reviews');
    Route::delete('/reviews/{id}',          [ReviewController::class, 'destroy']);

    // Shopping list
    Route::get('/shopping-list/{recipeId}',          [ShoppingListController::class, 'preview']);
    Route::get('/shopping-list/{recipeId}/download', [ShoppingListController::class, 'download']);

    // User recipe submission
    Route::middleware('role:admin')->group(function () {
        Route::post('/recipes', [RecipeController::class, 'submitUserRecipe']);
    });

    // Admin routes
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/recipes',                      [AdminRecipeController::class, 'index']);
        Route::post('/recipes',                     [AdminRecipeController::class, 'store']);
        Route::put('/recipes/{id}',                 [AdminRecipeController::class, 'update']);
        Route::delete('/recipes/{id}',              [AdminRecipeController::class, 'destroy']);
        Route::patch('/recipes/{id}/approve',       [AdminRecipeController::class, 'approve']);
        Route::patch('/recipes/{id}/reject',        [AdminRecipeController::class, 'reject']);
        Route::post('/recipes/bulk-import',         [AdminRecipeController::class, 'bulkImport']);

        Route::get('/users',              [AdminUserController::class, 'index']);
        Route::get('/users/{id}',         [AdminUserController::class, 'show']);
        Route::patch('/users/{id}/role',  [AdminUserController::class, 'updateRole']);

        Route::get('/analytics/dashboard', [AdminAnalyticsController::class, 'dashboard']);
    });
});
 