/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        olympia: {
          navy: '#0b1f4e',
          blue: '#123b8f',
          gold: '#f2b705',
          red: '#c0392b'
        }
      },
      fontFamily: {
        display: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
