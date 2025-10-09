/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DECISION: Green institutional palette using CSS variables for customization
        'green-primary': 'var(--color-primary, #0a3c10)',
        'green-dark': 'var(--color-primary-dark, #062209)',
        'green-light': 'var(--color-primary-light, #1dd55c)',
        'green-subtle': 'var(--color-primary-subtle, #edf3ed)',
        'text-primary': '#040504',
        'text-secondary': '#4b504b',
        'border-gray': '#d1d5db',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

