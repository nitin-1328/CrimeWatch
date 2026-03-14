// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {

      // ── Colors ──────────────────────────────────
      colors: {
        // Primary blue-purple gradient colors
        primary: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
        },
        accent: {
          DEFAULT: '#7C3AED',
          light: '#A78BFA',
          dark: '#5B21B6',
        },

        // Background shades
        bg: {
          DEFAULT: '#0B1220',
          secondary: '#0D1526',
        },

        // Card surfaces
        card: {
          DEFAULT: '#0F1A26',
          hover: '#132030',
        },

        // Text colors
        muted: '#9AA8B2',

        // Semantic colors
        danger: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
        info: '#3B82F6',

        // Crime risk colors
        risk: {
          low: '#22C55E',
          medium: '#F59E0B',
          high: '#EF4444',
          critical: '#DC2626',
        },
      },

      // ── Typography ───────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '24px' }],
        lg: ['17px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },

      // ── Border radius ────────────────────────────
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        full: '9999px',
      },

      // ── Shadows ──────────────────────────────────
      boxShadow: {
        'card-dark': '0 6px 18px rgba(4,8,16,0.65)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.25)',
        'glow-red': '0 0 20px rgba(239,68,68,0.25)',
        'glow-green': '0 0 20px rgba(34,197,94,0.25)',
        'inner-dark': 'inset 0 2px 8px rgba(0,0,0,0.4)',
        'xl-dark': '0 20px 60px rgba(0,0,0,0.5)',
      },

      // ── Background images ─────────────────────────
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B82F6, #7C3AED)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444, #DC2626)',
        'gradient-success': 'linear-gradient(135deg, #22C55E, #16A34A)',
        'gradient-dark': 'linear-gradient(180deg, #0D1526 0%, #0B1220 100%)',
      },

      // ── Animations ────────────────────────────────
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(59,130,246,0.3)' },
          '50%': { borderColor: 'rgba(124,58,237,0.5)' },
        },
      },

      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'shimmer': 'shimmer 1.5s linear infinite',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
      },

      // ── Transitions ───────────────────────────────
      transitionDuration: {
        '0': '0ms',
        '150': '150ms',
        '250': '250ms',
        '400': '400ms',
      },

      // ── Z-index ───────────────────────────────────
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        '100': '100',
        '1000': '1000',
      },
    },
  },

  plugins: [
    require('@tailwindcss/forms'),
  ],
};