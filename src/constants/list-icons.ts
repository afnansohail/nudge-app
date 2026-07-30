import {
  ShoppingCart,
  Home,
  Briefcase,
  Leaf,
  Heart,
  BookOpen,
  Dumbbell,
  Plane,
  Gift,
  Coffee,
  Sparkles,
  Music,
  Wallet,
  Car,
  Dog,
  Baby,
  Wrench,
  Palette,
  GraduationCap,
  Star,
  type LucideIcon,
} from 'lucide-react-native';

export type ListIconKey =
  | 'shopping-cart'
  | 'home'
  | 'briefcase'
  | 'leaf'
  | 'heart'
  | 'book-open'
  | 'dumbbell'
  | 'plane'
  | 'gift'
  | 'coffee'
  | 'sparkles'
  | 'music'
  | 'wallet'
  | 'car'
  | 'dog'
  | 'baby'
  | 'wrench'
  | 'palette'
  | 'graduation-cap'
  | 'star';

export const LIST_ICONS: Record<ListIconKey, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  home: Home,
  briefcase: Briefcase,
  leaf: Leaf,
  heart: Heart,
  'book-open': BookOpen,
  dumbbell: Dumbbell,
  plane: Plane,
  gift: Gift,
  coffee: Coffee,
  sparkles: Sparkles,
  music: Music,
  wallet: Wallet,
  car: Car,
  dog: Dog,
  baby: Baby,
  wrench: Wrench,
  palette: Palette,
  'graduation-cap': GraduationCap,
  star: Star,
};

export const LIST_ICON_KEYS = Object.keys(LIST_ICONS) as ListIconKey[];
