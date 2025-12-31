/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Cyan/Blue - Space theme)
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee', // Main brand
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Secondary (Purple/Magenta - Energy)
        secondary: {
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
        },
        // Accent (Orange/Yellow - Highlights)
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Space black
        space: {
          900: '#111827',
          950: '#030712',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'], // Headlines
        sans: ['Inter', 'system-ui', 'sans-serif'], // Body text
        mono: ['JetBrains Mono', 'monospace'], // Code/Data
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(34, 211, 238, 0.3)',
        'glow': '0 0 20px rgba(34, 211, 238, 0.4)',
        'glow-lg': '0 0 30px rgba(34, 211, 238, 0.5)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}