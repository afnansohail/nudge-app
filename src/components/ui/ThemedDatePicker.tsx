import { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import DateTimePicker, { useDefaultStyles, type DateType } from 'react-native-ui-datepicker';
import { WheelPicker } from '@/components/ui/WheelPicker';
import { LIST_COLORS } from '@/theme/tokens';

type ThemedDatePickerProps = {
  mode: 'date' | 'time';
  date: Date;
  onChange: (date: Date) => void;
};

function toJsDate(value: DateType): Date {
  return value instanceof Date ? value : new Date(value as string | number);
}

const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIOD_LABELS = ['AM', 'PM'];
// The library's time view sits in a 300px box. Keep the sheet the same size.
const TIME_CONTAINER_HEIGHT = 300;

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

  if (mode === 'time') {
    return (
      <TimeWheels
        date={date}
        onChange={onChange}
        textStyle={styles.time_label}
        indicatorStyle={styles.time_selected_indicator}
      />
    );
  }

  return (
    <DateTimePicker
      mode="single"
      date={date}
      styles={styles}
      onChange={({ date: selected }) => {
        if (selected !== null && selected !== undefined) onChange(toJsDate(selected));
      }}
    />
  );
}

/**
 * Hour and minute wheels loop (after 12 comes 1, after 59 comes 00), so the
 * user never has to scroll back through the whole list. The library's time
 * wheels stop at the ends and have no option to loop.
 */
function TimeWheels({
  date,
  onChange,
  textStyle,
  indicatorStyle,
}: {
  date: Date;
  onChange: (date: Date) => void;
  textStyle: object | undefined;
  indicatorStyle: object | undefined;
}) {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const isPm = hours24 >= 12;
  const hourIndex = (hours24 % 12 || 12) - 1; // 0 → "01" … 11 → "12"

  const emit = useCallback(
    (h24: number, m: number) => {
      const next = new Date(date);
      next.setHours(h24, m, 0, 0);
      onChange(next);
    },
    [date, onChange]
  );

  const handleHour = useCallback(
    (index: number) => {
      const hour12 = index + 1;
      emit((hour12 % 12) + (isPm ? 12 : 0), minutes);
    },
    [emit, isPm, minutes]
  );
  const handleMinute = useCallback((index: number) => emit(hours24, index), [emit, hours24]);
  const handlePeriod = useCallback(
    (index: number) => emit((hours24 % 12) + (index === 1 ? 12 : 0), minutes),
    [emit, hours24, minutes]
  );

  return (
    <View
      style={{ height: TIME_CONTAINER_HEIGHT }}
      className="flex-row items-center justify-center"
    >
      <WheelPicker
        items={HOUR_LABELS}
        selectedIndex={hourIndex}
        onChange={handleHour}
        loop
        width={64}
        textStyle={textStyle}
        indicatorStyle={indicatorStyle}
        accessibilityLabel="Hour"
      />
      <Text style={[textStyle, { marginHorizontal: 5 }]}>:</Text>
      <WheelPicker
        items={MINUTE_LABELS}
        selectedIndex={minutes}
        onChange={handleMinute}
        loop
        width={64}
        textStyle={textStyle}
        indicatorStyle={indicatorStyle}
        accessibilityLabel="Minute"
      />
      <View style={{ marginLeft: 10 }}>
        <WheelPicker
          items={PERIOD_LABELS}
          selectedIndex={isPm ? 1 : 0}
          onChange={handlePeriod}
          width={64}
          textStyle={textStyle}
          indicatorStyle={indicatorStyle}
          accessibilityLabel="AM or PM"
        />
      </View>
    </View>
  );
}
