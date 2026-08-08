<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Pantry extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'pantries';

    protected $fillable = [
        'user_id',
        'ingredients',
    ];

    protected $casts = [
        'ingredients' => 'array',
    ];

    protected $attributes = [
        'ingredients' => '[]',
    ];

    /**
     * Get the user who owns this pantry.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
