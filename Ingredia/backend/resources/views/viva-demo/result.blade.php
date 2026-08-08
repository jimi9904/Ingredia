<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Viva Demo — Saved</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 640px;
            margin: 40px auto;
            padding: 24px;
            background: {{ $theme === 'dark' ? '#1a1a1a' : '#fff' }};
            color: {{ $theme === 'dark' ? '#eee' : '#222' }};
        }
        .info { background: {{ $theme === 'dark' ? '#223' : '#eef' }}; padding: 12px; border-radius: 4px; }
        a { color: #1D9E75; }
    </style>
</head>
<body>
    <h1>Saved ✓</h1>
    <div class="info">
        <p><strong>Session</strong> <code>last_ingredient</code>: {{ $sessionItem }}</p>
        <p><strong>Cookie</strong> <code>viva_theme</code>: {{ $theme }}</p>
    </div>
    <p><a href="{{ route('viva.demo.form') }}">← Back to form</a></p>
</body>
</html>
