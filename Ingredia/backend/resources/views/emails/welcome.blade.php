@component('mail::message')
# Welcome to Ingredia, {{ $user->name }}! 🍽

You've successfully created your account. We're so excited to have you with us.

**Here's what you can do:**
- 🔍 Search recipes by the ingredients you already have
- 🥦 Build your ingredient pantry
- 🔖 Save your favourite recipes
- ⭐ Leave reviews and ratings
- 📝 Submit your own recipes for approval

@component('mail::button', ['url' => config('app.frontend_url') . '/home', 'color' => 'success'])
Start Exploring Recipes
@endcomponent

Happy cooking,
**The Ingredia Team**

@component('mail::subcopy')
If you didn't create this account, you can safely ignore this email.
@endcomponent
@endcomponent
