/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Adicionado por segurança caso você tenha arquivos na raiz
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '15': 'repeat(15, minmax(0, 1fr))',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};