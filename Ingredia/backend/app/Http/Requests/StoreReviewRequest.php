<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'photo'   => 'nullable|image|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'rating.required' => 'A star rating is required.',
            'rating.min'      => 'Rating must be at least 1 star.',
            'rating.max'      => 'Rating cannot exceed 5 stars.',
            'comment.max'     => 'Your review must be under 1000 characters.',
        ];
    }
}
