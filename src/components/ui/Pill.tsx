import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { X } from 'lucide-react-native';
import { INK_MIST_ICON_COLOR } from '@/theme/tokens';

const UNSELECTED_LABEL_COLOR = { light: 'rgba(26, 24, 21, 0.7)', dark: 'rgba(245, 241, 234, 0.7)' };

type PillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onClear?: () => void;
  dotColor?: string;
};

export function Pill({ label, selected, onPress, onClear, dotColor }: PillProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';

  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? 'flex-row items-center gap-2 rounded-full bg-ink px-4 py-2.5 dark:bg-mist'
          : 'flex-row items-center gap-2 rounded-full bg-[#F1ECE3] px-4 py-2.5 dark:bg-night-surface'
      }
    >
      {dotColor ? (
        <View
          style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: dotColor }}
        />
      ) : null}
      <Text
        className={selected ? 'font-display-medium text-sm text-cream dark:text-night' : 'font-display-medium text-sm'}
        style={selected ? undefined : { color: UNSELECTED_LABEL_COLOR[scheme] }}
      >
        {label}
      </Text>
      {selected && onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <X size={13} color={INK_MIST_ICON_COLOR[scheme]} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
