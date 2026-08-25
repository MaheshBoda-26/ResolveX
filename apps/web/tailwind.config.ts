import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D98F16',
          'primary-hover': '#B87510',
          'primary-soft': '#F8E7C6',
          'primary-dark-soft': '#3A2A12',
        },
        secondary: {
          DEFAULT: '#1F2937',
          soft: '#E5E7EB',
        },
        accent: {
          DEFAULT: '#2563EB',
          soft: '#DBEAFE',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        error: {
          DEFAULT: '#B91C1C',
          soft: '#FEE2E2',
        },
        info: {
          DEFAULT: '#1D4ED8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E7EB',
        },
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          muted: '#6B7280',
        },
      },
      darkMode: 'class',
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        display: ['36px', { lineHeight: '44px', fontWeight: '700' }],
        h1: ['30px', { lineHeight: '38px', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-large': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        small: ['12px', { lineHeight: '18px', fontWeight: '500' }],
        caption: ['11px', { lineHeight: '16px', fontWeight: '500' }],
        'trace-mono': ['12px', { lineHeight: '18px', fontWeight: '400' }],
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '20': '20px',
        '24': '24px',
        '32': '32px',
        '40': '40px',
        '48': '48px',
        '64': '64px',
      },
      borderRadius: {
        card: '12px',
        container: '16px',
      },
      height: {
        control: '40px',
        button: '40px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        elevated: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config;