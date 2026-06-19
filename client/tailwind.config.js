/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EDF1ED',
        surface: '#FFFFFF',
        ink: '#16201C',
        slate: '#5B6760',
        pine: {
          DEFAULT: '#1F6F54',
          dark: '#15503C',
          light: '#E3EFE9',
        },
        amber: {
          DEFAULT: '#F2B705',
          dark: '#B8870A',
          light: '#FDF2D0',
        },
        line: '#D8DED9',
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
