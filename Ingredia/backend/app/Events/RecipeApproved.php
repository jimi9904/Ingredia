<?php

namespace App\Events;

use App\Models\Recipe;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RecipeApproved
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Recipe $recipe) {}
}
