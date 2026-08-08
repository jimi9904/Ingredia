<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    use ApiResponse;

    /** Send a password reset link to the provided email. */
    public function sendLink(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Always return success to prevent email enumeration
        if (!$user) {
            return $this->success(null, 'If that email is registered, a reset link has been sent.');
        }

        $token    = Str::random(64);
        $cacheKey = 'password_reset:' . $token;

        Cache::put($cacheKey, [
            'user_id' => (string) $user->_id,
            'email'   => $user->email,
        ], now()->addMinutes(60));

        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        Mail::to($user->email)->queue(new PasswordResetMail($resetUrl, $user->name));

        return $this->success(null, 'If that email is registered, a reset link has been sent.');
    }

    /** Reset the user's password using the provided token. */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $cacheKey = 'password_reset:' . $request->token;
        $stored   = Cache::get($cacheKey);

        if (!$stored || $stored['email'] !== $request->email) {
            return $this->error('Invalid or expired reset token.', 422);
        }

        $user = User::find($stored['user_id']);
        if (!$user) {
            return $this->error('User not found.', 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Invalidate all tokens
        $user->tokens()->delete();
        Cache::forget($cacheKey);

        return $this->success(null, 'Password reset successfully. Please log in with your new password.');
    }
}
