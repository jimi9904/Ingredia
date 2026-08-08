<?php

namespace App\Http\Controllers;

use App\Rules\SafeIngredientName;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Self-contained demo for syllabus Units IV & V.
 * Demonstrates: @csrf, @method, old(), custom validation rule, cookie attach,
 * session set/get/forget, named-route redirect.
 *
 * Reachable at GET /viva-demo — does not touch any production endpoints.
 */
class DemoController extends Controller
{
    public function showForm(Request $request): View
    {
        return view('viva-demo.form', [
            'sessionItem' => session('last_ingredient'),
            'theme'       => $request->cookie('viva_theme', 'light'),
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ingredient' => ['required', new SafeIngredientName()],
            'note'       => 'nullable|string|max:200',
            'theme'      => 'required|in:light,dark',
        ]);

        session(['last_ingredient' => $validated['ingredient']]);

        return redirect()
            ->route('viva.demo.result')
            ->cookie('viva_theme', $validated['theme'], 60);
    }

    public function result(Request $request): View
    {
        return view('viva-demo.result', [
            'sessionItem' => session('last_ingredient'),
            'theme'       => $request->cookie('viva_theme', 'light'),
        ]);
    }

    public function clear(): RedirectResponse
    {
        session()->forget('last_ingredient');

        return redirect()
            ->route('viva.demo.form')
            ->withCookie(cookie()->forget('viva_theme'));
    }
}
