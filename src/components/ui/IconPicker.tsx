import { useColorScheme } from 'nativewind';
import { Pressable, View } from 'react-native';
import { LIST_ICONS, LIST_ICON_KEYS, type ListIconKey } from '@/constants/list-icons';
import { MUTED_ICON_COLOR } from '@/theme/tokens';

type IconPickerProps = {
  value: ListIconKey;
  onChange: (icon: ListIconKey) => void;
  accentColor: string;
};

export function IconPicker({ value, onChange, accentColor }: IconPickerProps) {
  const { colorScheme } = useColorScheme();
  return (
    <View className="flex-row flex-wrap gap-3">
      {LIST_ICON_KEYS.map((key) => {
        const Icon = LIST_ICONS[key];
        const selected = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityLabel={key}
            accessibilityState={{ selected }}
            style={selected ? { backgroundColor: accentColor } : undefined}
            className={
              selected
                ? 'h-12 w-12 items-center justify-center rounded-field'
                : 'h-12 w-12 items-center justify-center rounded-field bg-[#F1ECE3] dark:bg-night-surface'
            }
          >
            <Icon size={20} color={selected ? '#FFFFFF' : MUTED_ICON_COLOR[colorScheme ?? 'light']} />
          </Pressable>
        );
      })}
    </View>
  );
}
