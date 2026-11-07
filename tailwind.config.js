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
        muted: '#7A7266',
        accent: '#F4674A',
        'accent-deep': '#C24A2C',
        border: '#F4EFE7',
        night: '#17140F',
        'night-surface': '#211D17',
        mist: '#F5F1EA',
        'muted-dark': '#8F8A80',
        'accent-dark': '#FF7A57',
        'border-dark': '#2A251E',
        danger: '#F4674A',
        'danger-dark': '#FF7A57',
      },
      // The type scale. Use these, not arbitrary sizes like text-[13.5px].
      // xs (12), sm (14), base (16) and lg (18) are Tailwind's defaults.
      fontSize: {
        caption: '11px', // mono labels, timestamps, badges
        row: '15px', // list and nudge row titles
        title: ['28px', { lineHeight: '32px' }], // page titles, big numbers
      },
      // Corner radii. Use these (or rounded-full), not arbitrary values.
      borderRadius: {
        tile: '12px', // small tiles and inputs: list icon, number fields
        field: '16px', // inputs, settings rows, banners, icon picker
        card: '22px', // cards and anything card-sized
        sheet: '28px', // bottom sheet
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
