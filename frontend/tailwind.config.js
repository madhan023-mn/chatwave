/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cw: {
          primary:       '#00a884',
          'primary-dark':'#008069',
          'primary-light':'#25d366',
          bg:            '#0b141a',
          panel:         '#202c33',
          'panel-light': '#2a3942',
          'msg-out':     '#005c4b',
          'msg-in':      '#202c33',
          border:        '#2a373f',
          text:          '#e9edef',
          'text-muted':  '#8696a0',
          'text-link':   '#53bdeb',
          search:        '#111b21',
          icon:          '#aebac1',
          'icon-hover':  '#e9edef',
          unread:        '#00a884',
          'bubble-tail': '#005c4b',
          red:           '#f15c6d',
          blue:          '#53bdeb',
          yellow:        '#ffd279',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'fade-in':     'fadeIn 0.2s ease-out',
        'pulse-dot':   'pulseDot 1.4s ease-in-out infinite',
        'bounce-in':   'bounceIn 0.4s ease-out',
        'ring':        'ring 2s linear infinite',
      },
      keyframes: {
        slideUp:   { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        slideRight:{ from: { transform: 'translateX(-20px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        pulseDot:  { '0%,80%,100%': { transform: 'scale(0.6)', opacity: 0.5 }, '40%': { transform: 'scale(1)', opacity: 1 } },
        bounceIn:  { '0%': { transform: 'scale(0.8)', opacity: 0 }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        ring:      { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
      },
      boxShadow: {
        'msg': '0 1px 0.5px rgba(11,20,26,0.13)',
        'panel': '2px 0 10px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
