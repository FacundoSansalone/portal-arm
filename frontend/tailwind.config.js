/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tinta: azul institucional desaturado para superficies, bordes y texto secundario
        navy: {
          50: '#f3f5fa',
          100: '#e4e8f2',
          200: '#c7cfe2',
          300: '#9dabc9',
          400: '#7083a8',
          500: '#536689',
          600: '#3e4f70',
          700: '#2d3b57',
          800: '#1f2a40',
          900: '#161e30',
          950: '#0d1322',
        },
        // Bronce: acento de sello / documento oficial
        gold: {
          300: '#f0d18a',
          400: '#e6bc5c',
          500: '#d6a43f',
          600: '#b8872c',
          700: '#8f6720',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 rgb(255 255 255 / 0.03), 0 1px 2px rgb(0 0 0 / 0.3), 0 12px 32px -16px rgb(0 0 0 / 0.6)',
        pop: '0 2px 4px rgb(0 0 0 / 0.3), 0 16px 40px -12px rgb(0 0 0 / 0.7)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        stamp: {
          '0%': { opacity: '0', transform: 'scale(1.35) rotate(-14deg)' },
          '60%': { opacity: '1', transform: 'scale(0.95) rotate(-5deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-6deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        stamp: 'stamp 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}
