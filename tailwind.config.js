/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#09090b',
        surface: '#18181b',
        surfaceHighlight: '#27272a',
        border: '#27272a',
        text: '#e4e4e7',
        textDim: '#a1a1aa',
        primary: '#ffffff',
        accent: '#3b82f6',
      }
    },
  },
  plugins: [],
}