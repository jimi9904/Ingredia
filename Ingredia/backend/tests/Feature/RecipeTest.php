<?php

namespace Tests\Feature;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecipeTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_list_published_recipes(): void
    {
        Recipe::factory()->count(3)->create(['status' => 'published']);

        $response = $this->getJson('/api/recipes');

        $response->assertOk()
                 ->assertJsonStructure(['success', 'data', 'meta']);
    }

    public function test_recipe_show_returns_single_recipe_by_slug(): void
    {
        $recipe = Recipe::factory()->create(['status' => 'published', 'slug' => 'test-recipe']);

        $response = $this->getJson('/api/recipes/test-recipe');

        $response->assertOk()
                 ->assertJsonPath('data.slug', 'test-recipe');
    }

    public function test_pending_recipe_is_not_accessible_publicly(): void
    {
        $recipe = Recipe::factory()->create(['status' => 'pending', 'slug' => 'secret-recipe']);

        $response = $this->getJson('/api/recipes/secret-recipe');

        $response->assertStatus(404);
    }

    public function test_authenticated_user_can_submit_recipe(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/recipes', [
                             'title'        => 'My Homemade Pasta',
                             'description'  => 'A lovely pasta dish',
                             'ingredients'  => [['name' => 'pasta', 'amount' => '200g'], ['name' => 'tomato sauce', 'amount' => '1 cup']],
                             'instructions' => ['Boil the pasta.', 'Add the sauce.', 'Serve hot.'],
                             'cuisine'      => 'Italian',
                             'cook_time'    => 30,
                             'prep_time'    => 10,
                             'servings'     => 2,
                             'difficulty'   => 'easy',
                         ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('recipes', ['title' => 'My Homemade Pasta', 'status' => 'pending']);
    }

    public function test_recipe_submission_validates_required_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/recipes', []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['title', 'description', 'ingredients', 'instructions', 'cuisine', 'cook_time', 'prep_time', 'servings', 'difficulty']);
    }

    public function test_admin_can_approve_a_pending_recipe(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $recipe = Recipe::factory()->create(['status' => 'pending']);

        $response = $this->actingAs($admin, 'sanctum')
                         ->patchJson("/api/admin/recipes/{$recipe->_id}/approve");

        $response->assertOk();
        $this->assertEquals('published', $recipe->fresh()->status);
    }

    public function test_regular_user_cannot_access_admin_routes(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/admin/recipes');

        $response->assertStatus(403);
    }

    public function test_popular_recipes_endpoint_returns_results(): void
    {
        Recipe::factory()->count(5)->create(['status' => 'published']);

        $response = $this->getJson('/api/recipes/popular');

        $response->assertOk()
                 ->assertJsonStructure(['success', 'data']);
    }
}
