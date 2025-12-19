/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"PPMonumentNormal"', 'sans-serif'], // User requested this as site font
        sans: ['"PPMonumentNormal"', 'sans-serif'], 
      },
      colors: {
        // Industrial Palette
        industrial: {
          bg: '#E5E5E5',       // Concrete Gray
          surface: '#FFFFFF',   // Stark White
          text: '#000000',      // Ink Black
          accent: '#FF0000',    // Alert Red
          border: '#000000',    // Structural Black
        },
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #000000', // Hard edge shadow
        'brutal-hover': '2px 2px 0px 0px #000000',
        'brutal-active': '0px 0px 0px 0px #000000',
      },
      scale: {
        '101': '1.01',
      }
    },
  },
  plugins: [],
}
