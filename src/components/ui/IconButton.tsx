import type { LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { PressableScale } from '@/components/ui/PressableScale';
import { MUTED_ICON_COLOR } from '@/theme/tokens';

type IconButtonProps = {
  Icon: LucideIcon;
  /** Read by TalkBack. The button has no visible text. */
  label: string;
  onPress: () => void;
  size?: number;
  /** Defaults to the theme's muted icon grey. */
  color?: string;
};

/**
 * The round header button (back, close, settings, delete). The circle is
 * 36dp; hitSlop makes the touch target 48dp.
 */
export function IconButton({ Icon, label, onPress, size = 16, color }: IconButtonProps) {
  const { colorScheme } = useColorScheme();
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
    >
      <Icon size={size} color={color ?? MUTED_ICON_COLOR[colorScheme ?? 'light']} />
    </PressableScale>
  );
}
