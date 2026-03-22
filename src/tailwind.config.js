/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

export default {
  // Le decimos a Tailwind que busque clases en todos tus archivos React
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. REEMPLAZO DE PALETA CORPORATIVA POR INFANTIL
      colors: {
        // Todo lo que programaste como "slate" (gris frío) ahora será "stone" (beige/arena cálido)
        slate: colors.stone,
        // Todo lo que programaste como "blue" (azul serio) ahora será "teal" (turquesa alegre)
        blue: colors.teal,
      },
      // 2. FUENTE REDONDA
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        mono: ['Nunito', 'monospace'], // Mantiene los números amigables
      },
      // 3. SUAVIZADO DE BORDES (Todo será más redondo)
      borderRadius: {
        'md': '0.75rem',
        'lg': '1rem',      // Botones más redondos
        'xl': '1.5rem',    // Tarjetas muy redondeadas
        '2xl': '2rem',
      }
    },
  },
  plugins: [],
}