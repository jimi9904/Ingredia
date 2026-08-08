<?php

namespace App\Http\Controllers\Auth;

use App\Events\UserRegistered;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Pantry;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Register a new user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name'        => $request->name,
            'email'       => $request->email,
            'password'    => $request->password,
            'role'        => 'user',
            'preferences' => [
                'dietary'           => $request->dietary ?? [],
                'allergies'         => $request->allergies ?? [],
                'cuisine_preference' => $request->cuisine_preference ?? [],
            ],
        ]);

        // Create empty pantry
        Pantry::create([
            'user_id'     => (string) $user->_id,
            'ingredients' => [],
        ]);

        UserRegistered::dispatch($user);

        $token = $user->createToken('auth_token', ['user'])->plainTextToken;

        return $this->success([
            'user'  => $this->userResource($user),
            'token' => $token,
        ], 'Registered successfully. Please verify your email.', 201);
    }

    /**
     * Login an existing user.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Rate limiting
        $key = 'auth:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return $this->error("Too many login attempts. Please try again in {$seconds} seconds.", 429);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            RateLimiter::hit($key, 60);
            return $this->error('Invalid credentials.', 401);
        }

        RateLimiter::clear($key);

        $user = Auth::user();
        $user->tokens()->delete();

        $abilities = $user->isAdmin() ? ['admin', 'user'] : ['user'];
        $token = $user->createToken('auth_token', $abilities)->plainTextToken;

        return $this->success([
            'user'  => $this->userResource($user),
            'token' => $token,
            'role'  => $user->role,
        ]);
    }

    /**
     * Logout the current user.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully.');
    }

    /**
     * Get authenticated user data.
     */
    public function me(Request $request): JsonResponse
    {
        return $this->success($this->userResource($request->user()));
    }

    /**
     * Verify email address.
     */
    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        if (!hash_equals(sha1($user->email), $hash)) {
            return $this->error('Invalid verification link.', 400);
        }

        if ($user->hasVerifiedEmail()) {
            return $this->success(null, 'Email already verified.');
        }

        $user->markEmailAsVerified();

        return $this->success(null, 'Email verified successfully.');
    }

    /**
     * Format user for API responses.
     */
    private function userResource(User $user): array
    {
        return [
            'id'          => (string) $user->_id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'preferences' => $user->preferences,
            'verified'    => !is_null($user->email_verified_at),
            'created_at'  => $user->created_at,
        ];
    }
}
