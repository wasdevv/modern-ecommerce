import type { Config } from 'tailwindcss';

// Tokens follow Shopify's Dawn theme: near-black ink, body text at 75% opacity, square buttons.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121212',
        mist: '#f3f3f1',
        checkout: { DEFAULT: '#1773b0', dark: '#135f93', panel: '#f5f5f5', line: '#dedede' },
      },
      fontFamily: { sans: ['var(--font-assistant)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      letterSpacing: { dawn: '0.06rem', btn: '0.1rem', label: '0.13rem' },
      maxWidth: { page: '120rem' },
    },
  },
  plugins: [],
} satisfies Config;
