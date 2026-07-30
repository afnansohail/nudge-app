import { Pressable, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { LIST_COLORS, LIST_COLOR_KEYS, type ListColorKey } from '@/theme/tokens';

type ColorPickerProps = {
  value: ListColorKey;
  onChange: (color: ListColorKey) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';

  return (
    <View className="flex-row flex-wrap gap-3">
      {LIST_COLOR_KEYS.map((key) => {
        const swatch = LIST_COLORS[key][scheme];
        const selected = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              backgroundColor: swatch.dot,
              borderWidth: selected ? 3 : 0,
              borderColor: scheme === 'dark' ? '#F5F1EA' : '#1A1815',
            }}
            className="h-10 w-10 rounded-full"
          />
        );
      })}
    </View>
  );
}
