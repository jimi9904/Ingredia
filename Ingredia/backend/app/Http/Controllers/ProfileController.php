<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    use ApiResponse;

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = [];

        if ($request->filled('name')) {
            $data['name'] = $request->name;
        }

        if ($request->filled('email') && $request->email !== $user->email) {
            $data['email']              = $request->email;
            $data['email_verified_at']  = null;
        }

        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return $this->error('Current password is incorrect.', 422);
            }
            $data['password'] = Hash::make($request->new_password);
        }

        if ($request->has('preferences')) {
            $current = is_array($user->preferences) ? $user->preferences : [];
            $data['preferences'] = array_merge($current, $request->preferences);
        }

        $user->update($data);

        return $this->success(new UserResource($user->fresh()), 'Profile updated successfully.');
    }
}
