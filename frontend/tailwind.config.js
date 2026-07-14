/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-pos': 'rgb(var(--color-accent-pos) / <alpha-value>)',
        'accent-neg': 'rgb(var(--color-accent-neg) / <alpha-value>)',
      }
    },
  },
  plugins: [],
}
