<?php

namespace App\Providers;

use App\Models\Review;
use App\Policies\ReviewPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Review::class => ReviewPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
