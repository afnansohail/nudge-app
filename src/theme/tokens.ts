export type ColorScheme = 'light' | 'dark';

export type ListColorKey =
  | 'coral'
  | 'blue'
  | 'amber'
  | 'mint'
  | 'lavender'
  | 'rose'
  | 'teal'
  | 'slate'
  | 'indigo'
  | 'emerald'
  | 'orange'
  | 'cyan'
  | 'fuchsia'
  | 'olive'
  | 'plum'
  | 'sky';

type Swatch = { tile: string; dot: string; text: string };

export const LIST_COLORS: Record<ListColorKey, Record<ColorScheme, Swatch>> = {
  coral: {
    light: { tile: '#FFD9D2', dot: '#F4674A', text: '#8E2F1A' },
    dark: { tile: '#4A2A22', dot: '#FF7A57', text: '#FFD9D2' },
  },
  blue: {
    light: { tile: '#D3E6FB', dot: '#3D8BE0', text: '#2E6FB8' },
    dark: { tile: '#213347', dot: '#5FA3EE', text: '#D3E6FB' },
  },
  amber: {
    light: { tile: '#FFE6B0', dot: '#E9A020', text: '#8A5A08' },
    dark: { tile: '#453A15', dot: '#F3B94A', text: '#FFE6B0' },
  },
  mint: {
    light: { tile: '#CDECD8', dot: '#35A06A', text: '#1F6B45' },
    dark: { tile: '#1E3A2B', dot: '#4CBB84', text: '#CDECD8' },
  },
  lavender: {
    light: { tile: '#E2DBF7', dot: '#7C5CE0', text: '#4E3A9E' },
    dark: { tile: '#2E2749', dot: '#9B7FEE', text: '#E2DBF7' },
  },
  rose: {
    light: { tile: '#FBD9E6', dot: '#E0568F', text: '#9E2F5C' },
    dark: { tile: '#3E2530', dot: '#EE7FAD', text: '#FBD9E6' },
  },
  teal: {
    light: { tile: '#CFEDEA', dot: '#2A9D8F', text: '#1B6B62' },
    dark: { tile: '#1D3936', dot: '#4FC3B6', text: '#CFEDEA' },
  },
  slate: {
    light: { tile: '#E4E7EC', dot: '#5C6B7A', text: '#3A454E' },
    dark: { tile: '#2B323A', dot: '#98A6B3', text: '#E4E7EC' },
  },
  indigo: {
    light: { tile: '#DCDCFB', dot: '#5C5CE0', text: '#35358E' },
    dark: { tile: '#29294A', dot: '#7A7AEE', text: '#DCDCFB' },
  },
  emerald: {
    light: { tile: '#C6EED8', dot: '#1D9A5D', text: '#145E3A' },
    dark: { tile: '#1A3626', dot: '#3FBE81', text: '#C6EED8' },
  },
  orange: {
    light: { tile: '#FFDFC2', dot: '#E8791E', text: '#8A4708' },
    dark: { tile: '#4A3218', dot: '#FFA352', text: '#FFDFC2' },
  },
  cyan: {
    light: { tile: '#C9F0F5', dot: '#1FA9BF', text: '#0F6672' },
    dark: { tile: '#1B3A3F', dot: '#4DC7D9', text: '#C9F0F5' },
  },
  fuchsia: {
    light: { tile: '#F9D3F0', dot: '#C93FAE', text: '#7A2467' },
    dark: { tile: '#3D2038', dot: '#E066C8', text: '#F9D3F0' },
  },
  olive: {
    light: { tile: '#E8E7C2', dot: '#97923A', text: '#5A5720' },
    dark: { tile: '#3A3920', dot: '#B3AE55', text: '#E8E7C2' },
  },
  plum: {
    light: { tile: '#E6D3F0', dot: '#8B4FBF', text: '#532E73' },
    dark: { tile: '#33253D', dot: '#A876D6', text: '#E6D3F0' },
  },
  sky: {
    light: { tile: '#D6EAFB', dot: '#4FA3E8', text: '#2A6296' },
    dark: { tile: '#223447', dot: '#6FBBF5', text: '#D6EAFB' },
  },
};

export const LIST_COLOR_KEYS = Object.keys(LIST_COLORS) as ListColorKey[];

// Icon color for content sitting on a `bg-ink dark:bg-mist` surface — the surface color
// inverts between schemes, so a hardcoded icon color disappears in one of the two modes.
export const INK_MIST_ICON_COLOR: Record<ColorScheme, string> = {
  light: '#FCFAF7', // matches text-cream
  dark: '#17140F', // matches text-night
};

// Shadows as inline styles, not `shadow-sm`/`shadow-lg` utility classes: NativeWind's
// runtime CSS-interop parsing for shadow/opacity utilities races with Expo Router's
// navigation context on a color-scheme switch and crashes the app (nativewind#1557, #1711).
export const SUBTLE_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
};

export const FAB_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
};
