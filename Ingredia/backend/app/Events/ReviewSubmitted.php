<?php

namespace App\Events;

use App\Models\Recipe;
use App\Models\Review;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReviewSubmitted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Review $review,
        public readonly Recipe $recipe
    ) {}
}
