import { useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import DateTimePicker, { useDefaultStyles, type DateType } from 'react-native-ui-datepicker';
import { LIST_COLORS } from '@/theme/tokens';

type ThemedDatePickerProps = {
  mode: 'date' | 'time';
  date: Date;
  onChange: (date: Date) => void;
};

function toJsDate(value: DateType): Date {
  return value instanceof Date ? value : new Date(value as string | number);
}

export function ThemedDatePicker({ mode, date, onChange }: ThemedDatePickerProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const defaultStyles = useDefaultStyles(scheme);
  const accent = LIST_COLORS.coral[scheme];

  const styles = useMemo(
    () => ({
      ...defaultStyles,
      selected: { ...defaultStyles.selected, backgroundColor: accent.dot },
      selected_label: { ...defaultStyles.selected_label, color: '#FFFFFF' },
      today: { ...defaultStyles.today, borderWidth: 1, borderColor: accent.dot, backgroundColor: 'transparent' },
      today_label: { ...defaultStyles.today_label, color: accent.dot },
      time_selected_indicator: { ...defaultStyles.time_selected_indicator, backgroundColor: accent.tile },
    }),
    [defaultStyles, accent]
  );

  return (
    <DateTimePicker
      mode="single"
      date={date}
      timePicker={mode === 'time'}
      hideHeader={mode === 'time'}
      initialView={mode === 'time' ? 'time' : 'day'}
      use12Hours
      styles={styles}
      onChange={({ date: selected }) => {
        if (selected !== null && selected !== undefined) onChange(toJsDate(selected));
      }}
    />
  );
}
