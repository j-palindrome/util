import type { Config } from 'tailwindcss'

export default {
  content: ['src/**/*.{tsx,css}', 'index.html'],
  theme: {
    fontFamily: {
      mono: 'Courier New'
    },
    extend: {}
  },
  plugins: []
} satisfies Config
