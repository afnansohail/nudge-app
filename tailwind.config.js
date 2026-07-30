/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#FCFAF7',
        canvas: '#EFEAE1',
        ink: '#1A1815',
        muted: '#A69E92',
        accent: '#F4674A',
        'accent-deep': '#C24A2C',
        border: '#F4EFE7',
        night: '#17140F',
        'night-surface': '#211D17',
        mist: '#F5F1EA',
        'muted-dark': '#8F8A80',
        'accent-dark': '#FF7A57',
        'border-dark': '#2A251E',
      },
      fontFamily: {
        display: ['Outfit_400Regular'],
        'display-medium': ['Outfit_500Medium'],
        'display-semibold': ['Outfit_600SemiBold'],
        'display-bold': ['Outfit_700Bold'],
        mono: ['DMMono_400Regular'],
        'mono-medium': ['DMMono_500Medium'],
      },
    },
  },
  plugins: [],
};
