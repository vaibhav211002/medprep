/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F6F0',
        surface: '#FFFFFF',
        ink: '#25352E',
        slate: '#718078',
        pine: {
          DEFAULT: '#174C3C',
          dark: '#103B30',
          light: '#E5EFE9',
        },
        amber: {
          DEFAULT: '#C18B43',
          dark: '#8F632D',
          light: '#F6EEDC',
        },
        line: '#DCE5DE',
      },
      boxShadow: {
        card: '0 8px 24px rgba(16, 59, 48, 0.06)',
      },
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
