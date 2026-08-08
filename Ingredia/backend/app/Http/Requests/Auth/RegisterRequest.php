<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'               => 'required|string|max:100',
            'email'              => 'required|email|unique:users,email',
            'password'           => 'required|string|min:8|confirmed',
            'dietary'            => 'nullable|array',
            'dietary.*'          => 'string',
            'allergies'          => 'nullable|array',
            'allergies.*'        => 'string',
            'cuisine_preference' => 'nullable|array',
            'cuisine_preference.*' => 'string',
        ];
    }
}
