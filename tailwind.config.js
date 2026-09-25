/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "rgba(var(--background), <alpha-value>)",
        foreground: "rgba(var(--foreground), <alpha-value>)",
        card: "rgba(var(--card), <alpha-value>)",
        cardForeground: "rgba(var(--card-foreground), <alpha-value>)",
        border: "rgba(var(--border), <alpha-value>)",
        primary: "rgba(var(--primary), <alpha-value>)",
        primaryForeground: "rgba(var(--primary-foreground), <alpha-value>)",
        muted: "rgba(var(--muted), <alpha-value>)",
        appleGray: {
          100: '#F2F2F7',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#C7C7CC',
          500: '#AEAEB2',
          600: '#8E8E93',
        },
      }
    },
  },
  plugins: [],
}
