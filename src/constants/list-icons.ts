import {
  List,
  CheckCheck,
  LayoutGrid,
  Boxes,
  Home,
  Briefcase,
  Laptop,
  ShoppingCart,
  Wallet,
  PiggyBank,
  Heart,
  Dumbbell,
  Stethoscope,
  BookOpen,
  GraduationCap,
  Plane,
  Car,
  Utensils,
  Coffee,
  Gift,
  Baby,
  Dog,
  Leaf,
  Wrench,
  Palette,
  Music,
  Camera,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react-native';

export type ListIconKey =
  | 'list'
  | 'check-check'
  | 'layout-grid'
  | 'boxes'
  | 'home'
  | 'briefcase'
  | 'laptop'
  | 'shopping-cart'
  | 'wallet'
  | 'piggy-bank'
  | 'heart'
  | 'dumbbell'
  | 'stethoscope'
  | 'book-open'
  | 'graduation-cap'
  | 'plane'
  | 'car'
  | 'utensils'
  | 'coffee'
  | 'gift'
  | 'baby'
  | 'dog'
  | 'leaf'
  | 'wrench'
  | 'palette'
  | 'music'
  | 'camera'
  | 'sparkles'
  | 'star';

export const LIST_ICONS: Record<ListIconKey, LucideIcon> = {
  list: List,
  'check-check': CheckCheck,
  'layout-grid': LayoutGrid,
  boxes: Boxes,
  home: Home,
  briefcase: Briefcase,
  laptop: Laptop,
  'shopping-cart': ShoppingCart,
  wallet: Wallet,
  'piggy-bank': PiggyBank,
  heart: Heart,
  dumbbell: Dumbbell,
  stethoscope: Stethoscope,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  plane: Plane,
  car: Car,
  utensils: Utensils,
  coffee: Coffee,
  gift: Gift,
  baby: Baby,
  dog: Dog,
  leaf: Leaf,
  wrench: Wrench,
  palette: Palette,
  music: Music,
  camera: Camera,
  sparkles: Sparkles,
  star: Star,
};

export const DEFAULT_LIST_ICON: ListIconKey = 'list';

export const LIST_ICON_KEYS = Object.keys(LIST_ICONS) as ListIconKey[];
