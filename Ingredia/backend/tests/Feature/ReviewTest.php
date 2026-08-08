<?php

namespace Tests\Feature;

use App\Events\ReviewSubmitted;
use App\Models\Recipe;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private User   $user;
    private Recipe $recipe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user   = User::factory()->create();
        $this->recipe = Recipe::factory()->create(['status' => 'published', 'avg_rating' => 0, 'rating_count' => 0]);
    }

    public function test_authenticated_user_can_submit_a_review(): void
    {
        Event::fake();

        $response = $this->actingAs($this->user, 'sanctum')
                         ->postJson("/api/recipes/{$this->recipe->_id}/reviews", [
                             'rating'  => 5,
                             'comment' => 'Absolutely delicious!',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.rating', 5);

        Event::assertDispatched(ReviewSubmitted::class);
    }

    public function test_review_validation_requires_rating(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
                         ->postJson("/api/recipes/{$this->recipe->_id}/reviews", [
                             'comment' => 'No rating here',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['rating']);
    }

    public function test_rating_must_be_between_1_and_5(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
                         ->postJson("/api/recipes/{$this->recipe->_id}/reviews", [
                             'rating' => 6,
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['rating']);
    }

    public function test_user_cannot_review_same_recipe_twice(): void
    {
        Review::create(['recipe_id' => (string) $this->recipe->_id, 'user_id' => (string) $this->user->_id, 'rating' => 4]);

        $response = $this->actingAs($this->user, 'sanctum')
                         ->postJson("/api/recipes/{$this->recipe->_id}/reviews", [
                             'rating' => 5,
                         ]);

        $response->assertStatus(422);
    }

    public function test_user_can_delete_their_own_review(): void
    {
        $review = Review::create(['recipe_id' => (string) $this->recipe->_id, 'user_id' => (string) $this->user->_id, 'rating' => 3]);

        $response = $this->actingAs($this->user, 'sanctum')
                         ->deleteJson("/api/reviews/{$review->_id}");

        $response->assertOk();
    }

    public function test_user_cannot_delete_another_users_review(): void
    {
        $otherUser = User::factory()->create();
        $review    = Review::create(['recipe_id' => (string) $this->recipe->_id, 'user_id' => (string) $otherUser->_id, 'rating' => 3]);

        $response = $this->actingAs($this->user, 'sanctum')
                         ->deleteJson("/api/reviews/{$review->_id}");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_submit_review(): void
    {
        $response = $this->postJson("/api/recipes/{$this->recipe->_id}/reviews", ['rating' => 5]);
        $response->assertStatus(401);
    }
}
