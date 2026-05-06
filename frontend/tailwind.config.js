/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'zamtel-green': '#00843D',
        'zamtel-green-dark': '#006630',
        'zamtel-pink': '#E4007C',
      },
    },
  },
  plugins: [],
};
