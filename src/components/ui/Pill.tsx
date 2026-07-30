import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

// Unselected label color is an inline style, not the `text-ink/70 dark:text-mist/70`
// utility class — see Card.tsx's comment on why opacity/shadow utilities are avoided.
const UNSELECTED_LABEL_COLOR = { light: 'rgba(26, 24, 21, 0.7)', dark: 'rgba(245, 241, 234, 0.7)' };

type PillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  dotColor?: string;
};

export function Pill({ label, selected, onPress, dotColor }: PillProps) {
  const { colorScheme } = useColorScheme();

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
        style={selected ? undefined : { color: UNSELECTED_LABEL_COLOR[colorScheme ?? 'light'] }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
