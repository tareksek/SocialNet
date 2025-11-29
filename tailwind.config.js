/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        facebook: {
          blue: '#1877f2',
          dark: '#242526',
          darker: '#18191a',
          gray: '#e4e6eb',
        }
      }
    },
  },
  plugins: [],
}
