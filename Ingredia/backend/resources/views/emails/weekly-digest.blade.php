@component('mail::message')
# Your Weekly Recipe Digest 🍽

Hi {{ $user->name }},

Here are this week's top recipes picked just for you based on your tastes.

@foreach($recipes as $recipe)
---
**{{ $recipe->title }}**
{{ ucfirst($recipe->cuisine ?? 'International') }} • {{ $recipe->cook_time ?? '?' }} min • {{ ucfirst($recipe->difficulty ?? 'Medium') }}

@endforeach

---

@component('mail::button', ['url' => config('app.frontend_url') . '/home', 'color' => 'success'])
Explore All Recipes
@endcomponent

Enjoy cooking this week!
**The Ingredia Team**

@component('mail::subcopy')
You're receiving this because you have an Ingredia account. To stop receiving weekly digests, update your preferences in your profile.
@endcomponent
@endcomponent
