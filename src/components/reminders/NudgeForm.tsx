import { ListForm } from '@/components/lists/ListForm';
import { NoteEditor } from '@/components/reminders/NoteEditor';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';
import { useDb } from '@/db/use-db';
import { formatNudgeDate, formatNudgeTime, parseTimeString } from '@/lib/date';
import { getNotificationPermissionStatus } from '@/lib/notifications';
import type { NudgeList, RecurrenceParams, RecurrenceType } from '@/lib/types';
import { useListsStore } from '@/store/lists-store';
import { useSettingsStore } from '@/store/settings-store';
import { LIST_COLORS } from '@/theme/tokens';
import { DEFAULT_LIST_ICON } from '@/constants/list-icons';
import { Bell } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type NudgeFormValues = {
  title: string;
  note: string | null;
  listId: string;
  dueAt: number | null;
  recurrenceType: RecurrenceType;
  recurrenceParams: RecurrenceParams | null;
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

  const defaultNudgeTime = useSettingsStore((s) => s.settings.defaultNudgeTime);

  const [title, setTitle] = useState(initialValues.title);
  const [note, setNote] = useState(initialValues.note ?? '');
  const [listId, setListId] = useState(initialValues.listId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialValues.dueAt !== null ? new Date(initialValues.dueAt) : null
  );
  const [selectedTime, setSelectedTime] = useState<Date | null>(
    initialValues.dueAt !== null ? new Date(initialValues.dueAt) : null
  );
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const hasSchedule = selectedDate !== null || selectedTime !== null;
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialValues.recurrenceType
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initialValues.recurrenceParams?.weekdays ?? [(selectedDate ?? new Date()).getDay()]
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    String(initialValues.recurrenceParams?.dayOfMonth ?? (selectedDate ?? new Date()).getDate())
  );
  const [intervalDays, setIntervalDays] = useState(
    String(initialValues.recurrenceParams?.intervalDays ?? 2)
  );
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [newListSheetOpen, setNewListSheetOpen] = useState(false);
  const [newListFormKey, setNewListFormKey] = useState(0);
  const db = useDb();
  const createList = useListsStore((s) => s.create);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    getNotificationPermissionStatus().then(setPermissionGranted);
  }, []);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => {
      if (prev.includes(day)) {
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
    let dueAt: number | null = null;
    if (hasSchedule) {
      const base = selectedDate ?? new Date();
      const { hours, minutes } = selectedTime
        ? { hours: selectedTime.getHours(), minutes: selectedTime.getMinutes() }
        : parseTimeString(defaultNudgeTime);
      dueAt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes).getTime();
    }
    onSubmit({
      title: title.trim(),
      note: note.trim().length > 0 ? note.trim() : null,
      listId,
      dueAt,
      recurrenceType: hasSchedule ? recurrenceType : 'none',
      recurrenceParams: hasSchedule ? buildRecurrenceParams() : null,
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
            placeholder="Remind me to..."
            placeholderTextColor="#C0B8AB"
            className="font-display-medium text-lg text-ink dark:text-mist"
          />
          <NoteEditor value={note} onChange={setNote} />
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
          <Pill
            label="+ New list"
            onPress={() => {
              setNewListFormKey((k) => k + 1);
              setNewListSheetOpen(true);
            }}
          />
        </View>

        <AppBottomSheet visible={newListSheetOpen} onClose={() => setNewListSheetOpen(false)}>
          <Text className="mb-4 font-display-semibold text-base text-ink dark:text-mist">
            New list
          </Text>
          <View className="-mx-5" style={{ height: windowHeight * 0.6 }}>
            <ListForm
              key={newListFormKey}
              initialValues={{ name: '', icon: DEFAULT_LIST_ICON, color: 'coral' }}
              submitLabel="Create list"
              onSubmit={async (values) => {
                const list = await createList(db, values);
                setListId(list.id);
                setNewListSheetOpen(false);
              }}
            />
          </View>
        </AppBottomSheet>
      </View>

      <View>
        <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
          When should I nudge?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Pill
            label={selectedDate ? formatNudgeDate(selectedDate.getTime()) : 'Date'}
            selected={selectedDate !== null}
            onPress={() => setPickerMode('date')}
            onClear={() => setSelectedDate(null)}
          />
          <Pill
            label={selectedTime ? formatNudgeTime(selectedTime.getTime()) : 'Time'}
            selected={selectedTime !== null}
            onPress={() => setPickerMode('time')}
            onClear={() => setSelectedTime(null)}
          />
        </View>

        {hasSchedule && (
          <Pressable
            onPress={() => {
              setSelectedDate(null);
              setSelectedTime(null);
            }}
            className="mt-2.5 self-start"
          >
            <Text className="font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
              Clear
            </Text>
          </Pressable>
        )}

        <AppBottomSheet visible={pickerMode !== null} onClose={() => setPickerMode(null)}>
          <ThemedDatePicker
            mode={pickerMode ?? 'date'}
            date={(pickerMode === 'time' ? selectedTime : selectedDate) ?? new Date()}
            onChange={(picked) => {
              if (pickerMode === 'date') setSelectedDate(picked);
              else setSelectedTime(picked);
            }}
          />
          <Button
            label="Done"
            onPress={() => {
              // The picker always shows a concrete date/time (defaulting to
              // now), but only calls onChange once the user actually
              // interacts with it — so confirm whatever's currently shown
              // even if they tapped Done without touching anything.
              if (pickerMode === 'date' && selectedDate === null) setSelectedDate(new Date());
              if (pickerMode === 'time' && selectedTime === null) setSelectedTime(new Date());
              setPickerMode(null);
            }}
          />
        </AppBottomSheet>

        {hasSchedule && permissionGranted === false && (
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

      {hasSchedule && (
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

      <Button label={submitLabel} disabled={title.trim().length === 0} onPress={handleSubmit} />
    </View>
  );
}
