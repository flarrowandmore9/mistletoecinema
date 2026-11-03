/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fbf8f3',
        pine: {
          50: '#f0f7f2',
          100: '#dcefe2',
          200: '#b9dfc8',
          300: '#8cc9a4',
          400: '#5aad7d',
          500: '#3a9166',
          600: '#2a7550',
          700: '#1f5c3f',
          800: '#17462f',
          900: '#0f3121',
        },
        ember: {
          50: '#fdf2f1',
          100: '#fbe3e0',
          200: '#f7c6c1',
          300: '#f09a92',
          400: '#e86b5f',
          500: '#d9463a',
          600: '#b8322a',
          700: '#98281f',
          800: '#7d241d',
          900: '#5f1d17',
        },
        gold: {
          50: '#fdf9ec',
          100: '#faf0cc',
          200: '#f5df99',
          300: '#eec65e',
          400: '#e6aa2f',
          500: '#cf8c1b',
          600: '#ad6a16',
          700: '#8a4e16',
          800: '#6f3e18',
          900: '#5c3418',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'modal-in': 'modal-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
