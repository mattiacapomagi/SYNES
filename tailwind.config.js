/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'sans-serif'], // Default font
      },
      colors: {
        // Playful Palette
        brick: {
          red: '#EF4444',
          blue: '#3B82F6',
          yellow: '#F59E0B',
          green: '#10B981',
          slate: '#475569',
        },
        surface: '#F8FAFC',
      },
      boxShadow: {
        'plastic': '0 4px 0 0 rgba(0,0,0,0.1)', // Tactile "plastic" depth
        'plastic-active': '0 1px 0 0 rgba(0,0,0,0.1)',
        'tray': 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
