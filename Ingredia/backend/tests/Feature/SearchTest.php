<?php

namespace Tests\Feature;

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_returns_paginated_recipes(): void
    {
        Recipe::factory()->count(5)->create(['status' => 'published']);

        $response = $this->getJson('/api/recipes/search');

        $response->assertOk()
                 ->assertJsonStructure(['success', 'data', 'meta' => ['total', 'page', 'per_page']]);
    }

    public function test_search_by_name_filters_results(): void
    {
        Recipe::factory()->create(['title' => 'Chicken Tikka Masala', 'status' => 'published']);
        Recipe::factory()->create(['title' => 'Beef Burger', 'status' => 'published']);

        $response = $this->getJson('/api/recipes/search?q=Chicken');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $recipe) {
            $this->assertStringContainsStringIgnoringCase('chicken', $recipe['title']);
        }
    }

    public function test_search_by_cuisine_filters_results(): void
    {
        Recipe::factory()->create(['cuisine' => 'Indian', 'status' => 'published']);
        Recipe::factory()->create(['cuisine' => 'Italian', 'status' => 'published']);

        $response = $this->getJson('/api/recipes/search?cuisine=indian');

        $response->assertOk();
        $data = $response->json('data');
        foreach ($data as $recipe) {
            $this->assertEquals('Indian', $recipe['cuisine']);
        }
    }

    public function test_search_respects_difficulty_filter(): void
    {
        Recipe::factory()->create(['difficulty' => 'easy', 'status' => 'published']);
        Recipe::factory()->create(['difficulty' => 'hard', 'status' => 'published']);

        $response = $this->getJson('/api/recipes/search?difficulty=easy');

        $response->assertOk();
        foreach ($response->json('data') as $recipe) {
            $this->assertEquals('Easy', $recipe['difficulty']);
        }
    }

    public function test_search_invalid_difficulty_returns_validation_error(): void
    {
        $response = $this->getJson('/api/recipes/search?difficulty=extreme');
        $response->assertStatus(422);
    }

    public function test_autocomplete_returns_suggestions(): void
    {
        $response = $this->getJson('/api/ingredients/autocomplete?q=tom');
        $response->assertOk()
                 ->assertJsonStructure(['success', 'data']);
    }

    public function test_autocomplete_requires_minimum_two_characters(): void
    {
        $response = $this->getJson('/api/ingredients/autocomplete?q=t');
        $response->assertOk()
                 ->assertJsonPath('data', []);
    }

    public function test_only_published_recipes_appear_in_search(): void
    {
        Recipe::factory()->create(['title' => 'Hidden Recipe', 'status' => 'pending']);
        Recipe::factory()->create(['title' => 'Visible Recipe', 'status' => 'published']);

        $response = $this->getJson('/api/recipes/search?q=Recipe');

        $data = $response->json('data');
        foreach ($data as $recipe) {
            $this->assertNotEquals('Hidden Recipe', $recipe['title']);
        }
    }
}
