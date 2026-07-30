import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { LIST_COLORS, type ListColorKey } from '@/theme/tokens';
import type { ListIconKey } from '@/constants/list-icons';

export type ListFormValues = {
  name: string;
  icon: ListIconKey;
  color: ListColorKey;
};

type ListFormProps = {
  initialValues: ListFormValues;
  onSubmit: (values: ListFormValues) => void;
  submitLabel: string;
};

export function ListForm({ initialValues, onSubmit, submitLabel }: ListFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [icon, setIcon] = useState<ListIconKey>(initialValues.icon);
  const [color, setColor] = useState<ListColorKey>(initialValues.color);
  const { colorScheme } = useColorScheme();
  const accentColor = LIST_COLORS[color][colorScheme ?? 'light'].dot;

  return (
    <View className="gap-6 px-5 pt-4">
      <View>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          List name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What's this for?"
          placeholderTextColor="#C0B8AB"
          className="rounded-2xl bg-white px-4 py-3.5 font-display-medium text-base text-ink dark:bg-night-surface dark:text-mist"
        />
      </View>

      <View>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          Color
        </Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      <View>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          Icon
        </Text>
        <IconPicker value={icon} onChange={setIcon} accentColor={accentColor} />
      </View>

      <Button
        label={submitLabel}
        disabled={name.trim().length === 0}
        onPress={() => onSubmit({ name: name.trim(), icon, color })}
      />
    </View>
  );
}
