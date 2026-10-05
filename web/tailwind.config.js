/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0B3B39',
          dark: '#072825',
          deep: '#05201F',
          50: '#eef7f6',
          100: '#d7edeb',
          200: '#aedbd7',
          300: '#7fc2bc',
          400: '#4da49d',
          500: '#2b8a82',
          600: '#177168',
          700: '#0f5a52',
          800: '#0b3b39',
          900: '#072825',
          950: '#041a19',
        },
        accent: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Noto Nastaliq Urdu',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
