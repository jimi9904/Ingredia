<?php

namespace Tests\Feature;

use App\Events\UserRegistered;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_valid_data(): void
    {
        Event::fake();

        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test User',
            'email'                 => 'test@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['success', 'data' => ['user', 'token']]);

        Event::assertDispatched(UserRegistered::class);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Another User',
            'email'                 => 'taken@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret123')]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertOk()
                 ->assertJsonStructure(['success', 'data' => ['user', 'token', 'role']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct')]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_get_their_profile(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/auth/me');

        $response->assertOk()
                 ->assertJsonPath('data.email', $user->email);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/auth/me');
        $response->assertStatus(401);
    }

    public function test_forgot_password_does_not_reveal_email_existence(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'nonexistent@example.com',
        ]);

        // Always returns success to prevent email enumeration
        $response->assertOk();
    }
}
