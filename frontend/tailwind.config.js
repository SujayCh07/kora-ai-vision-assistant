/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'kora-dark': '#000000',
        'kora-bg': '#1a1a1a',
        'kora-panel': '#2a2a2a',
        'kora-border': '#404040',
        'kora-primary': '#00ff00',
        'kora-danger': '#ff3333',
        'kora-warning': '#ffaa00',
        'kora-info': '#0099ff',
      },
    },
  },
  plugins: [],
}
