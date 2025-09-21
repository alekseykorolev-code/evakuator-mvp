/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2D5BFF',
        accent: '#F97316'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.08)'
      }
    },
  },
  plugins: [],
}
