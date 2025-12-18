/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#FFFFFF",
      },
      fontFamily: {
        mono: ['"Roboto Mono"', "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
      },
    },
  },
  plugins: [],
};
