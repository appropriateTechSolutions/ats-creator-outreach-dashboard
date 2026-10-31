/** @type {import('tailwindcss').Config} */

// "The Ledger" design system — warm editorial luxury for Qui Tequila.
// Paper-warm neutrals, deep agave pine as the brand color, plum as the
// secondary accent. Fraunces (display serif) + Spline Sans (UI).
//
// `indigo` intentionally aliases the pine primary scale and `purple` the plum
// accent scale, so legacy hardcoded `indigo-*` / `purple-*` classes across the
// app pick up the brand palette without per-file edits.

const pine = {
  50: '#f1f7f3',
  100: '#dcebe1',
  200: '#b9d7c6',
  300: '#8dbca3',
  400: '#5c9c7d',
  500: '#3d7f60',
  600: '#2b654b', // Base primary
  650: '#255741',
  700: '#1f4f3b',
  800: '#193f30',
  900: '#143427',
  950: '#0a1f17',
};

// Desaturated "fountain-pen ink" blue — keeps info-state semantics for the
// many hardcoded `blue-*` classes while sitting comfortably on warm paper.
const inkBlue = {
  50: '#f4f6f8',
  100: '#e6ebf0',
  200: '#cbd7e1',
  300: '#a4bac9',
  400: '#7495ac',
  500: '#547891',
  600: '#426078',
  700: '#374f63',
  800: '#2f4252',
  900: '#2a3946',
  950: '#1b2630',
};

const plum = {
  50: '#f9f5f8',
  100: '#f0e6ee',
  200: '#ddc7d9',
  300: '#c4a1bd',
  400: '#a4749a',
  500: '#85517b',
  600: '#6d3f64',
  700: '#573250',
  800: '#43273e',
  900: '#331e30',
  950: '#1f101d',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Spline Sans"', 'system-ui', 'sans-serif'],
        // Legacy alias — `font-outfit` is used across ~60 files as the
        // "display face" class; it now renders Fraunces.
        outfit: ['Fraunces', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        primary: pine,
        indigo: pine,
        purple: plum,
        plum,
        blue: inkBlue,
        // Refined Success
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669', // Base success
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Refined Warning
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706', // Base warning
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Refined Error
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626', // Base error
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Warm stone neutrals — the "paper" of the ledger
        gray: {
          50: '#faf8f5',
          100: '#f3f0ea',
          200: '#e7e2d8',
          300: '#d5cec0',
          400: '#a89f8f',
          500: '#7d7466',
          600: '#5c5548',
          700: '#453f35',
          800: '#2e2a23',
          900: '#1f1b16',
          950: '#12100c',
        },
      },
    },
  },
  plugins: [],
};
