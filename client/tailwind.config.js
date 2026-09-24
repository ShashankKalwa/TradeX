/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      // Overriding theme.colors drops Tailwind's built-ins, so restore the ones
      // the UI actually relies on: `bg-transparent` silently emitted no CSS
      // (leaving UA button/input backgrounds and dead tag neutralisers).
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      // Desk — the lamp-lit chrome the paper sits on
      desk: {
        950: '#14120e',
        900: '#191713',
        800: '#211e18',
        line: '#3a352b'
      },
      // Paper — the data surfaces
      paper: {
        50: '#f4eee1',
        100: '#ece4d4'
      },
      // Ruled lines and edges on paper
      rule: {
        DEFAULT: '#c9bda2',
        strong: '#a99a78'
      },
      // Ink — text on paper (muted clears 4.5:1 on paper)
      ink: {
        DEFAULT: '#241f1a',
        secondary: '#5c5344',
        muted: '#6f6552'
      },
      // Semantic palette law — countable, one job each
      buy: { text: '#1e5c46', mark: '#0a7d54' },
      sell: { text: '#a33327', mark: '#b04a37' },
      accent: { text: '#2b5b84', mark: '#1a5fa8' },
      warn: { text: '#7a581f', mark: '#d96c1e' }
    },
    fontFamily: {
      sans: ['Archivo', 'system-ui', 'sans-serif'],
      mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace']
    },
    extend: {
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }]
      },
      borderRadius: {
        // Tickets have slightly-clipped corners, not pills
        ticket: '3px'
      },
      boxShadow: {
        // Paper depth: real offset + soft blur, warm
        paper: '0 1px 2px rgba(30,24,14,0.18), 0 3px 8px rgba(30,24,14,0.14)',
        'paper-lift': '0 2px 4px rgba(30,24,14,0.2), 0 8px 20px rgba(30,24,14,0.22)',
        stamp: '0 0 0 1px rgba(36,31,26,0.08), 0 1px 3px rgba(30,24,14,0.3)',
        'inset-line': 'inset 0 -1px 0 rgba(36,31,26,0.06)'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        'stamp-press': {
          '0%': { transform: 'scale(2.2) rotate(-9deg)', opacity: '0' },
          '55%': { transform: 'scale(0.94) rotate(-3deg)', opacity: '1' },
          '75%': { transform: 'scale(1.04) rotate(-3.5deg)' },
          '100%': { transform: 'scale(1) rotate(-3.5deg)', opacity: '1' }
        },
        'flash-up': {
          '0%': { backgroundColor: 'rgba(10,125,84,0.28)' },
          '100%': { backgroundColor: 'transparent' }
        },
        'flash-down': {
          '0%': { backgroundColor: 'rgba(163,51,39,0.24)' },
          '100%': { backgroundColor: 'transparent' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' }
        },
        chase: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        }
      },
      animation: {
        marquee: 'marquee 45s linear infinite',
        'stamp-press': 'stamp-press 380ms cubic-bezier(0.16,1,0.3,1) both',
        'flash-up': 'flash-up 900ms ease-out',
        'flash-down': 'flash-down 900ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        chase: 'chase 1.4s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 280ms cubic-bezier(0.16,1,0.3,1) both'
      }
    }
  },
  plugins: []
}
