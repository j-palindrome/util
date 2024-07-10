import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
      },
      screens: {
        mouse: { raw: '(hover: none)' },
        touch: { raw: '(hover)' },
        '-md': { max: '767px' },
        '-lg': { max: '1023px' },
        '-sm': { max: '400px' }
      },
      fontSize: {
        h1: '3rem',
        h2: '2.5rem',
        h3: '2rem',
        h4: '1.5rem',
        base: '18px'
      },
      lineHeight: {
        h: '1.5em'
      },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        bg2: 'rgb(var(--bg2) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accent2: 'rgb(var(--accent2) / <alpha-value>)'
      },
      fontFamily: {
        body: 'var(--body)',
        heading: 'var(--heading)'
      },
      dropShadow: {
        text: '0 0 6px rgb(0, 0, 0)'
      },
      height: {
        topbar: 'var(--topbar)',
        'screen-topbar': 'calc(100vh - var(--topbar))',
        vmin: '100vmin'
      }
    }
  },
  plugins: [typography]
}
export default config
