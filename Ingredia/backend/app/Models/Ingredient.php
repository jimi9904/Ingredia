<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Ingredient extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'ingredients';

    protected $fillable = [
        'canonical_name',
        'aliases',
        'category',
    ];

    protected $casts = [
        // 'aliases' => 'array', // Handled by MongoDB natively
    ];
}
