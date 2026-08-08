<?php

use App\Http\Controllers\DemoController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Self-contained Unit IV/V demo — does not affect the rest of the app.
Route::prefix('viva-demo')->group(function () {
    Route::get('/',       [DemoController::class, 'showForm'])->name('viva.demo.form');
    Route::put('/',       [DemoController::class, 'submit'])->name('viva.demo.submit');
    Route::get('/result', [DemoController::class, 'result'])->name('viva.demo.result');
    Route::delete('/',    [DemoController::class, 'clear'])->name('viva.demo.clear');
});
