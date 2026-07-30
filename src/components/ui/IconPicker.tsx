import { Pressable, View } from 'react-native';
import { LIST_ICONS, LIST_ICON_KEYS, type ListIconKey } from '@/constants/list-icons';

type IconPickerProps = {
  value: ListIconKey;
  onChange: (icon: ListIconKey) => void;
  accentColor: string;
};

export function IconPicker({ value, onChange, accentColor }: IconPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {LIST_ICON_KEYS.map((key) => {
        const Icon = LIST_ICONS[key];
        const selected = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={selected ? { backgroundColor: accentColor } : undefined}
            className={
              selected
                ? 'h-12 w-12 items-center justify-center rounded-2xl'
                : 'h-12 w-12 items-center justify-center rounded-2xl bg-[#F1ECE3] dark:bg-night-surface'
            }
          >
            <Icon size={20} color={selected ? '#FFFFFF' : '#6B655C'} />
          </Pressable>
        );
      })}
    </View>
  );
}
