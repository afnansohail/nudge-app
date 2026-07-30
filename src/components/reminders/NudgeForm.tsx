import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Linking } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'nativewind';
import { Bell } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { LIST_COLORS, PRIORITY_LABELS, SUBTLE_SHADOW } from '@/theme/tokens';
import { getNotificationPermissionStatus } from '@/lib/notifications';
import type { NudgeList, Priority, RecurrenceParams, RecurrenceType } from '@/lib/types';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type NudgeFormValues = {
  title: string;
  note: string | null;
  listId: string;
  dueAt: number | null;
  recurrenceType: RecurrenceType;
  recurrenceParams: RecurrenceParams | null;
  priority: Priority;
};

type NudgeFormProps = {
  lists: NudgeList[];
  initialValues: NudgeFormValues;
  onSubmit: (values: NudgeFormValues) => void;
  submitLabel: string;
};

export function NudgeForm({ lists, initialValues, onSubmit, submitLabel }: NudgeFormProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';

  const [title, setTitle] = useState(initialValues.title);
  const [note, setNote] = useState(initialValues.note ?? '');
  const [listId, setListId] = useState(initialValues.listId);
  const [hasDueDate, setHasDueDate] = useState(initialValues.dueAt !== null);
  const [date, setDate] = useState(new Date(initialValues.dueAt ?? 0));
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialValues.recurrenceType
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initialValues.recurrenceParams?.weekdays ?? [date.getDay()]
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    String(initialValues.recurrenceParams?.dayOfMonth ?? date.getDate())
  );
  const [intervalDays, setIntervalDays] = useState(
    String(initialValues.recurrenceParams?.intervalDays ?? 2)
  );
  const [priority, setPriority] = useState<Priority>(initialValues.priority);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    getNotificationPermissionStatus().then(setPermissionGranted);
  }, []);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => {
      if (prev.includes(day)) {
        // Keep at least one day selected — an empty set silently falls back to
        // "today", which looks unselected but isn't, so don't let the UI get there.
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort();
    });
  };

  const buildRecurrenceParams = (): RecurrenceParams | null => {
    if (recurrenceType === 'weekly') return { weekdays };
    if (recurrenceType === 'monthly') return { dayOfMonth: Number(dayOfMonth) || 1 };
    if (recurrenceType === 'every_n_days') return { intervalDays: Number(intervalDays) || 1 };
    return null;
  };

  const handleSubmit = () => {
    onSubmit({
      title: title.trim(),
      note: note.trim().length > 0 ? note.trim() : null,
      listId,
      dueAt: hasDueDate ? date.getTime() : null,
      recurrenceType: hasDueDate ? recurrenceType : 'none',
      recurrenceParams: hasDueDate ? buildRecurrenceParams() : null,
      priority,
    });
  };

  return (
    <View className="gap-6 px-4 pb-10 pt-2">
      <View>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          What are we nudging you about?
        </Text>
        <View className="rounded-[20px] bg-white px-4 py-3.5 dark:bg-night-surface">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Water the fig tree"
            placeholderTextColor="#C0B8AB"
            className="font-display-medium text-lg text-ink dark:text-mist"
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note, if it helps…"
            placeholderTextColor="#C0B8AB"
            className="mt-1.5 font-display text-[13.5px] text-muted dark:text-muted-dark"
          />
        </View>
      </View>

      <View>
        <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          Which list?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {lists.map((list) => (
            <Pill
              key={list.id}
              label={list.name}
              selected={listId === list.id}
              dotColor={LIST_COLORS[list.color][scheme].dot}
              onPress={() => setListId(list.id)}
            />
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          When should I nudge?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Pill label="No date" selected={!hasDueDate} onPress={() => setHasDueDate(false)} />
          <Pill
            label="Pick date & time"
            selected={hasDueDate}
            onPress={() => {
              if (!hasDueDate) {
                const fresh = new Date(Date.now() + 60 * 60 * 1000);
                setDate(fresh);
                setWeekdays([fresh.getDay()]);
                setDayOfMonth(String(fresh.getDate()));
              }
              setHasDueDate(true);
              setPickerMode('date');
            }}
          />
        </View>

        {hasDueDate && (
          <Pressable
            onPress={() => setPickerMode('date')}
            className="mt-3 rounded-2xl border-[1.5px] border-[#F0EAE1] bg-white px-4 py-3 dark:border-border-dark dark:bg-night-surface"
          >
            <Text className="font-mono text-[13.5px] text-ink dark:text-mist">
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {'  ·  '}
              {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </Pressable>
        )}

        {pickerMode && (
          <DateTimePicker
            value={date}
            mode={pickerMode}
            display="default"
            onChange={(event, selected) => {
              if (event.type === 'dismissed' || !selected) {
                setPickerMode(null);
                return;
              }
              if (pickerMode === 'date') {
                const next = new Date(date);
                next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                setDate(next);
                setPickerMode('time');
              } else {
                const next = new Date(date);
                next.setHours(selected.getHours(), selected.getMinutes());
                setDate(next);
                setPickerMode(null);
              }
            }}
          />
        )}

        {hasDueDate && permissionGranted === false && (
          <Pressable
            onPress={() => Linking.openSettings()}
            className="mt-3 flex-row items-center gap-3 rounded-2xl bg-[#FFE6B0] px-4 py-3.5"
          >
            <Bell size={18} color="#8A5A08" />
            <View className="flex-1">
              <Text className="font-display-medium text-sm text-[#8A5A08]">
                Notifications are off
              </Text>
              <Text
                className="mt-0.5 font-display text-xs"
                style={{ color: 'rgba(138, 90, 8, 0.8)' }}
              >
                This nudge won&rsquo;t reach you at the right time. Tap to enable.
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {hasDueDate && (
        <View>
          <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
            Repeat?
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Pill
              label="Never"
              selected={recurrenceType === 'none'}
              onPress={() => setRecurrenceType('none')}
            />
            <Pill
              label="Daily"
              selected={recurrenceType === 'daily'}
              onPress={() => setRecurrenceType('daily')}
            />
            <Pill
              label="Weekly"
              selected={recurrenceType === 'weekly'}
              onPress={() => setRecurrenceType('weekly')}
            />
            <Pill
              label="Monthly"
              selected={recurrenceType === 'monthly'}
              onPress={() => setRecurrenceType('monthly')}
            />
            <Pill
              label="Every N days"
              selected={recurrenceType === 'every_n_days'}
              onPress={() => setRecurrenceType('every_n_days')}
            />
          </View>

          {recurrenceType === 'weekly' && (
            <View className="mt-3 flex-row gap-2">
              {WEEKDAY_LABELS.map((label, day) => (
                <Pressable
                  key={day}
                  onPress={() => toggleWeekday(day)}
                  className={
                    weekdays.includes(day)
                      ? 'h-9 w-9 items-center justify-center rounded-full bg-ink dark:bg-mist'
                      : 'h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface'
                  }
                >
                  <Text
                    className={
                      weekdays.includes(day)
                        ? 'font-display-medium text-xs text-cream dark:text-night'
                        : 'font-display-medium text-xs text-ink dark:text-mist'
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {recurrenceType === 'monthly' && (
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="font-display text-sm text-muted dark:text-muted-dark">Day</Text>
              <TextInput
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="number-pad"
                className="w-16 rounded-xl bg-white px-3 py-2 text-center font-mono text-sm text-ink dark:bg-night-surface dark:text-mist"
              />
              <Text className="font-display text-sm text-muted dark:text-muted-dark">
                of each month
              </Text>
            </View>
          )}

          {recurrenceType === 'every_n_days' && (
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="font-display text-sm text-muted dark:text-muted-dark">Every</Text>
              <TextInput
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="number-pad"
                className="w-16 rounded-xl bg-white px-3 py-2 text-center font-mono text-sm text-ink dark:bg-night-surface dark:text-mist"
              />
              <Text className="font-display text-sm text-muted dark:text-muted-dark">days</Text>
            </View>
          )}
        </View>
      )}

      <View>
        <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          How pushy should I be?
        </Text>
        <View className="flex-row gap-1 rounded-full bg-[#F1ECE3] p-1 dark:bg-night-surface">
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setPriority(key)}
              style={priority === key ? SUBTLE_SHADOW : undefined}
              className={
                priority === key
                  ? 'flex-1 items-center rounded-full bg-white py-2.5 dark:bg-night'
                  : 'flex-1 items-center rounded-full py-2.5'
              }
            >
              <Text
                className={
                  priority === key
                    ? 'font-display-semibold text-sm text-ink dark:text-mist'
                    : 'font-display-medium text-sm text-muted dark:text-muted-dark'
                }
              >
                {PRIORITY_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button label={submitLabel} disabled={title.trim().length === 0} onPress={handleSubmit} />
    </View>
  );
}
