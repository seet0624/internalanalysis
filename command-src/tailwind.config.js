/** @type {import('tailwindcss').Config} */
// 颜色用语义 token（值在 src/index.css 的 :root），改主题只改那一处
const tok = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: tok('canvas'),
        surface: tok('surface'),
        elevated: tok('elevated'),
        line: tok('line'),
        fg: tok('fg'),
        muted: tok('muted'),
        faint: tok('faint'),
        brand: tok('brand'),
        accent: tok('accent'),
        ai: tok('ai'),
        warn: tok('warn'),
        danger: tok('danger'),
        ok: tok('ok'),
        st: {
          working: tok('st-working'), available: tok('st-available'), thinking: tok('st-thinking'),
          waiting: tok('st-waiting'), completed: tok('st-completed'), error: tok('st-error')
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      fontSize: { '2xs': ['0.6875rem', '1rem'] },
      boxShadow: {
        glass: '0 1px 2px rgb(60 64 67 / .12), 0 2px 6px 2px rgb(60 64 67 / .06)',
        glow: '0 0 0 1px rgb(var(--brand) / .25), 0 6px 18px -6px rgb(var(--brand) / .45)'
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'none' } }
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        slideUp: 'slideUp .25s ease-out both',
        slideIn: 'slideIn .25s ease-out both'
      }
    }
  },
  plugins: []
};
