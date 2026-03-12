export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          light: '#7C3AED',
          dark: '#3B82F6'
        },
        accent: '#06B6D4',
        bg: '#0B1220',
        card: '#0F1A26',
        muted: '#9AA8B2'
      },
      spacing: {
        1: '0.5rem',
        2: '1rem',
        3: '1.5rem',
        4: '2rem',
        5: '2.5rem',
        6: '3rem'
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px'
      },
      boxShadow: {
        'card-dark': '0 6px 18px rgba(4,8,16,0.65)'
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
