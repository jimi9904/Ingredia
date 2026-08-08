<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class SavedCollection extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'saved_collections';

    protected $fillable = [
        'user_id',
        'name',
        'recipe_ids',
    ];

    protected $casts = [
        'recipe_ids' => 'array',
    ];

    protected $attributes = [
        'recipe_ids' => '[]',
    ];

    /**
     * Get the user who owns this collection.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
