/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1a',
        foreground: '#ffffff',
        panel: '#111827',
        border: '#1f2937',
        muted: '#4b5563',
        accent: '#3b82f6',
      },
    },
  },
  plugins: [],
} 