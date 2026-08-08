<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Weekly recipe digest — every Monday at 8 AM
Schedule::command('digest:send')->weeklyOn(1, '08:00')->withoutOverlapping();

// Pre-generate recommendations nightly at 2 AM
Schedule::command('recommendations:generate')->dailyAt('02:00')->withoutOverlapping();
