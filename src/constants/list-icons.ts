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
  Pizza,
  PiggyBank,
  Laptop,
  TreePine,
  Hammer,
  Pill,
  Gamepad2,
  Utensils,
  Bike,
  Stethoscope,
  Umbrella,
  Camera,
  Scissors,
  ShoppingBag,
  Banknote,
  Film,
  Headphones,
  Cake,
  Droplet,
  Flower2,
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
  | 'star'
  | 'pizza'
  | 'piggy-bank'
  | 'laptop'
  | 'tree-pine'
  | 'hammer'
  | 'pill'
  | 'gamepad-2'
  | 'utensils'
  | 'bike'
  | 'stethoscope'
  | 'umbrella'
  | 'camera'
  | 'scissors'
  | 'shopping-bag'
  | 'banknote'
  | 'film'
  | 'headphones'
  | 'cake'
  | 'droplet'
  | 'flower-2';

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
  pizza: Pizza,
  'piggy-bank': PiggyBank,
  laptop: Laptop,
  'tree-pine': TreePine,
  hammer: Hammer,
  pill: Pill,
  'gamepad-2': Gamepad2,
  utensils: Utensils,
  bike: Bike,
  stethoscope: Stethoscope,
  umbrella: Umbrella,
  camera: Camera,
  scissors: Scissors,
  'shopping-bag': ShoppingBag,
  banknote: Banknote,
  film: Film,
  headphones: Headphones,
  cake: Cake,
  droplet: Droplet,
  'flower-2': Flower2,
};

export const LIST_ICON_KEYS = Object.keys(LIST_ICONS) as ListIconKey[];
