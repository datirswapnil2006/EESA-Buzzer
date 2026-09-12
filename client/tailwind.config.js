/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eesa: {
          primary: '#2563EB',
          primaryLight: '#EFF6FF',
          primaryHover: '#1D4ED8',
          secondary: '#0F766E',
          success: '#16A34A',
          successLight: '#DCFCE7',
          warning: '#F59E0B',
          warningLight: '#FEF3C7',
          danger: '#DC2626',
          dangerLight: '#FEE2E2',
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          textPrimary: '#0F172A',
          textSecondary: '#64748B',
          textMuted: '#94A3B8',
          border: '#E2E8F0',
          borderDark: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'buzzer': '0 8px 24px -4px rgba(220, 38, 38, 0.35)',
        'btn-primary': '0 2px 8px -1px rgba(37, 99, 235, 0.3)',
      },
      borderRadius: {
        'button': '8px',
        'card': '12px',
        'modal': '16px',
      },
    },
  },
  plugins: [],
};
