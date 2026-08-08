@component('mail::message')
# Great news, {{ $user->name }}! 🎉

Your recipe **"{{ $recipe->title }}"** has been reviewed and approved by our team. It is now live on Ingredia for everyone to discover and cook!

**Recipe details:**
- **Cuisine:** {{ ucfirst($recipe->cuisine ?? 'International') }}
- **Cook time:** {{ $recipe->cook_time }} minutes
- **Difficulty:** {{ ucfirst($recipe->difficulty ?? 'Medium') }}

@component('mail::button', ['url' => config('app.frontend_url') . '/home?q=' . urlencode($recipe->title), 'color' => 'success'])
View Your Recipe
@endcomponent

Thank you for contributing to our recipe community! 🍳

**The Ingredia Team**

@component('mail::subcopy')
Your recipe slug is: {{ $recipe->slug }}
@endcomponent
@endcomponent
