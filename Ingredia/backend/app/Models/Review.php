<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Review extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'reviews';

    protected $fillable = [
        'recipe_id',
        'user_id',
        'rating',
        'comment',
        'photo_url',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    /**
     * Get the user who wrote this review.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the recipe for this review.
     */
    public function recipe()
    {
        return $this->belongsTo(Recipe::class, 'recipe_id');
    }
}
