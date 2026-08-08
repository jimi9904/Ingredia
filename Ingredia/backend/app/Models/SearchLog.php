<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class SearchLog extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'search_logs';

    protected $fillable = [
        'user_id',
        'ingredients_searched',
        'filters_applied',
        'results_count',
        'clicked_recipe_id',
        'session_id',
    ];

    protected $casts = [
        'ingredients_searched' => 'array',
        'filters_applied'      => 'array',
        'results_count'        => 'integer',
    ];
}
