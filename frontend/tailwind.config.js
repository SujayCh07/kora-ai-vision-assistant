/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'kora-dark': '#0a0e17',
        'kora-bg': '#121823',
        'kora-panel': '#1a2332',
        'kora-border': '#2a3647',
        'kora-blue': '#3b82f6',
        'kora-cyan': '#06b6d4',
        'kora-accent': '#8b5cf6',
      },
      backgroundImage: {
        'kora-gradient': 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #8b5cf6 100%)',
        'kora-gradient-dark': 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)',
      },
      boxShadow: {
        'kora-glow': '0 0 20px rgba(59, 130, 246, 0.5)',
        'kora-glow-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
        'kora-glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      animationDelay: {
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5), 0 0 10px rgba(59, 130, 246, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.8), 0 0 30px rgba(6, 182, 212, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
