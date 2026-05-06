/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-blue':      '#003DA5',
        'brand-blue-dark': '#002B75',
        'brand-blue-light':'#1E56C4',
        'brand-gold':      '#D4A017',
        'brand-gold-dark': '#B8870F',
        'brand-gold-light':'#F0C040',
        // keep zamtel aliases so no other system breaks
        'zamtel-green':      '#003DA5',
        'zamtel-green-dark': '#002B75',
        'zamtel-pink':       '#D4A017',
      },
    },
  },
  plugins: [],
};
