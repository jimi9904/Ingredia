<?php

namespace App\Providers;

use App\Events\RecipeApproved;
use App\Events\ReviewSubmitted;
use App\Events\UserRegistered;
use App\Listeners\NotifyRecipeSubmitter;
use App\Listeners\SendWelcomeEmail;
use App\Listeners\UpdateRecipeRating;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        ReviewSubmitted::class => [
            UpdateRecipeRating::class,
        ],
        RecipeApproved::class => [
            NotifyRecipeSubmitter::class,
        ],
        UserRegistered::class => [
            SendWelcomeEmail::class,
        ],
    ];

    public function boot(): void {}
}
