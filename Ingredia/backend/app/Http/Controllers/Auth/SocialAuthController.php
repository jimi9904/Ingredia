<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Pantry;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    use ApiResponse;

    /**
     * Redirect to OAuth provider.
     */
    public function redirect(string $provider)
    {
        $supported = ['github', 'google'];

        if (!in_array($provider, $supported)) {
            return $this->error('Unsupported provider.', 400);
        }

        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Handle OAuth provider callback.
     */
    public function callback(string $provider)
    {
        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return redirect(config('app.frontend_url') . '/login?error=oauth_failed');
        }

        $user = User::where('email', $socialUser->getEmail())->first();

        if (!$user) {
            $user = User::create([
                'name'              => $socialUser->getName(),
                'email'             => $socialUser->getEmail(),
                'password'          => bcrypt(str()->random(32)),
                'role'              => 'user',
                'provider'          => $provider,
                'provider_id'       => $socialUser->getId(),
                'email_verified_at' => now(),
                'preferences'       => [
                    'dietary'            => [],
                    'allergies'          => [],
                    'cuisine_preference' => [],
                ],
            ]);

            Pantry::create([
                'user_id'     => (string) $user->_id,
                'ingredients' => [],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token', [$user->role])->plainTextToken;

        return redirect(config('app.frontend_url') . '/auth/callback?token=' . $token);
    }
}
