/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:  { DEFAULT: '#FAF6F0', 2: '#F5EDE0', 3: '#EEE0CC' },
        terra:  { DEFAULT: '#C04B2E', 2: '#A83D22', 3: '#D96B4B' },
        gold:   { DEFAULT: '#C9973A', 2: '#E8B85D' },
        sage:   { DEFAULT: '#6B7C5E', 2: '#8C9C7E' },
        deep:   { DEFAULT: '#1E120A', 2: '#3D2415' },
        muted:  '#7A5A42',
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        // Hero-only display face — chunky modern serif (DM Serif Display) to match the
        // bakery hero reference. Scoped via the `font-hero` utility so only the landing
        // hero title swaps fonts; rest of the site keeps Cormorant Garamond.
        hero:    ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card:       '0 2px 12px rgba(30,18,10,0.12)',
        'card-hover': '0 16px 48px rgba(30,18,10,0.14)',
        soft:       '0 8px 32px rgba(30,18,10,0.12)',
        cta:        '0 6px 24px rgba(192,75,46,0.32)',
      },
      backgroundImage: {
        'cream-gradient': 'linear-gradient(145deg, #FAF6F0 0%, #F5EDE0 50%, #EEE0CC 100%)',
      },
      keyframes: {
        'pulse-dot':  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        'float':      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        'float-food': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-18px)' } },
        'fade-up':    { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'pulse-dot':  'pulse-dot 2s ease-in-out infinite',
        'float':      'float 8s ease-in-out infinite',
        'float-food': 'float-food 6s ease-in-out infinite',
        'fade-up':    'fade-up 0.6s ease both',
      },
    },
  },
  plugins: [],
}
