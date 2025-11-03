/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Infrastructure colors
        'power': '#e63946',
        'transport': '#457b9d',
        'telecom': '#2a9d8f',
        'vulnerable': '#f77f00',
        // Status colors
        'normal': '#06d6a0',
        'degraded': '#f97316',
        'failed': '#dc2626',
        'offline': '#374151',
        // Priority colors
        'critical': '#dc2626',
        'high': '#ea580c',
        'medium': '#d97706',
        'low': '#65a30d'
      }
    },
  },
  plugins: [],
}

