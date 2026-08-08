<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Viva Demo — Form (Units IV & V)</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 640px;
            margin: 40px auto;
            padding: 24px;
            background: {{ $theme === 'dark' ? '#1a1a1a' : '#fff' }};
            color: {{ $theme === 'dark' ? '#eee' : '#222' }};
        }
        label { display: block; margin-top: 14px; font-weight: 600; }
        input, select, textarea {
            width: 100%; padding: 8px; box-sizing: border-box; margin-top: 4px;
            background: {{ $theme === 'dark' ? '#2a2a2a' : '#fff' }};
            color: inherit; border: 1px solid #888;
        }
        .error { color: #d33; margin: 12px 0; }
        .info { background: {{ $theme === 'dark' ? '#223' : '#eef' }}; padding: 10px; margin: 12px 0; border-radius: 4px; }
        button { margin-top: 14px; padding: 10px 18px; cursor: pointer; }
        .row { display: flex; gap: 12px; }
        .row form { flex: 1; }
    </style>
</head>
<body>
    <h1>Viva Demo Form</h1>
    <p>Demonstrates <code>@@csrf</code>, <code>@@method</code>, <code>old()</code>, custom validation rule, session, cookies.</p>

    <div class="info">
        <strong>Session value</strong> (<code>last_ingredient</code>): {{ $sessionItem ?? '— not set —' }}<br>
        <strong>Cookie value</strong> (<code>viva_theme</code>): {{ $theme }}
    </div>

    @if ($errors->any())
        <div class="error">
            <strong>Validation failed:</strong>
            <ul>
                @foreach ($errors->all() as $err)
                    <li>{{ $err }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form method="POST" action="{{ route('viva.demo.submit') }}">
        @csrf
        @method('PUT')

        <label>Ingredient
            <input type="text" name="ingredient" value="{{ old('ingredient') }}" placeholder="e.g. tomato">
        </label>

        <label>Note (optional)
            <textarea name="note" rows="2">{{ old('note') }}</textarea>
        </label>

        <label>Theme
            <select name="theme">
                <option value="light" @selected(old('theme', $theme) === 'light')>Light</option>
                <option value="dark"  @selected(old('theme', $theme) === 'dark')>Dark</option>
            </select>
        </label>

        <button type="submit">Save (PUT)</button>
    </form>

    <form method="POST" action="{{ route('viva.demo.clear') }}" style="margin-top: 24px;">
        @csrf
        @method('DELETE')
        <button type="submit">Clear session & cookie (DELETE)</button>
    </form>
</body>
</html>
