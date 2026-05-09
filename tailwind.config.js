/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        sidebar: '#111113',
        neon: '#9B2BFF',
      }
    },
  },
  plugins: [],
}
