@component('mail::message')
# Reset Your Password

Hi {{ $userName }},

We received a request to reset the password for your Ingredia account. Click the button below to choose a new password.

@component('mail::button', ['url' => $resetUrl, 'color' => 'error'])
Reset Password
@endcomponent

This link will expire in **60 minutes**. If you did not request a password reset, no action is needed — your password will remain unchanged.

**The Ingredia Team**

@component('mail::subcopy')
If the button doesn't work, copy and paste this URL into your browser: {{ $resetUrl }}
@endcomponent
@endcomponent
