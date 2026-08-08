<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name'                           => 'sometimes|string|max:100',
            'email'                          => ['sometimes', 'email', Rule::unique('users')->ignore($this->user()->_id, '_id')],
            'current_password'               => 'required_with:new_password|string',
            'new_password'                   => 'sometimes|string|min:8|confirmed',
            'preferences.dietary'            => 'sometimes|array',
            'preferences.dietary.*'          => 'string|in:vegetarian,vegan,gluten-free,dairy-free,keto,halal,kosher',
            'preferences.allergies'          => 'sometimes|array',
            'preferences.allergies.*'        => 'string|max:100',
            'preferences.cuisine_preference' => 'sometimes|array',
            'preferences.cuisine_preference.*' => 'string|max:100',
        ];
    }
}
