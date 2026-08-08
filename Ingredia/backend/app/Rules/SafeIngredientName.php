<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SafeIngredientName implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value) || trim($value) === '') {
            $fail('The :attribute cannot be empty.');
            return;
        }
        if (preg_match('/[<>{};]/', $value)) {
            $fail('The :attribute cannot contain HTML or script characters.');
            return;
        }
        if (mb_strlen($value) > 60) {
            $fail('The :attribute must be under 60 characters.');
        }
    }
}
