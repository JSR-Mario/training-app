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
        dark: {
          bg: '#121212',
          surface: '#1e1e1e',
          border: '#333333',
          text: '#e6e6e6'
        }
      }
    },
  },
  plugins: [],
}
