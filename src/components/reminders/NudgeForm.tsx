import { ListForm } from '@/components/lists/ListForm';
import { NoteEditor } from '@/components/reminders/NoteEditor';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { useRevealFormEnd } from '@/components/ui/FormScrollView';
import { Button } from '@/components/ui/Button';
import { FieldLabel } from '@/components/ui/FieldLabel';
import { Pill } from '@/components/ui/Pill';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';
import { useDb } from '@/db/use-db';
import {
  clampNumberText,
  formatNudgeTime,
  formatRelativeNudgeDate,
  isSameCalendarDay,
  nextTimeOfDay,
  parseTimeString,
} from '@/lib/date';
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
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  autoFocusTitle?: boolean;
};

export function NudgeForm({
  lists,
  initialValues,
  onSubmit,
  submitLabel,
  autoFocusTitle = false,
}: NudgeFormProps) {
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
  const revealFormEnd = useRevealFormEnd();
  const warning = LIST_COLORS.amber[scheme];
  // Time with no date, and that time has already passed today.
  const timeOnlyIsTomorrow =
    selectedDate === null &&
    selectedTime !== null &&
    !isSameCalendarDay(
      nextTimeOfDay(selectedTime.getHours(), selectedTime.getMinutes()),
      Date.now()
    );

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
    if (recurrenceType === 'monthly') {
      return { dayOfMonth: Number(clampNumberText(dayOfMonth, 1, 31)) };
    }
    if (recurrenceType === 'every_n_days') {
      return { intervalDays: Number(clampNumberText(intervalDays, 1, 365)) };
    }
    return null;
  };

  const handleSubmit = () => {
    let dueAt: number | null = null;
    if (hasSchedule) {
      const { hours, minutes } = selectedTime
        ? { hours: selectedTime.getHours(), minutes: selectedTime.getMinutes() }
        : parseTimeString(defaultNudgeTime);
      if (selectedDate) {
        dueAt = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          hours,
          minutes
        ).getTime();
      } else {
        // Only a time: the next time the clock shows it. Before, a time that
        // had passed today saved as overdue at once.
        dueAt = nextTimeOfDay(hours, minutes);
      }
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
        <FieldLabel>What are we nudging you about?</FieldLabel>
        <View className="rounded-card bg-white px-4 py-3.5 dark:bg-night-surface">
          <TextInput
            autoFocus={autoFocusTitle}
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
        <FieldLabel>Which list?</FieldLabel>
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
        <FieldLabel>When should I nudge?</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          <Pill
            label={selectedDate ? formatRelativeNudgeDate(selectedDate.getTime()) : 'Date'}
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

        {timeOnlyIsTomorrow && (
          <Text className="mt-2 font-display text-xs text-muted dark:text-muted-dark">
            This time has passed today, so the nudge is set for tomorrow.
          </Text>
        )}

        {hasSchedule && (
          <Pressable
            onPress={() => {
              setSelectedDate(null);
              setSelectedTime(null);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear date and time"
            className="mt-2.5 self-start"
          >
            <Text className="font-display-medium text-xs text-muted dark:text-muted-dark">
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
            style={{ backgroundColor: warning.tile }}
            className="mt-3 flex-row items-center gap-3 rounded-field px-4 py-3.5"
          >
            <Bell size={18} color={warning.text} />
            <View className="flex-1">
              <Text style={{ color: warning.text }} className="font-display-medium text-sm">
                Notifications are off
              </Text>
              <Text
                className="mt-0.5 font-display text-xs"
                style={{ color: warning.text, opacity: 0.8 }}
              >
                This nudge won&rsquo;t reach you at the right time. Tap to enable.
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {hasSchedule && (
        <View>
          <FieldLabel>Repeat?</FieldLabel>
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
                  hitSlop={4}
                  accessibilityRole="checkbox"
                  accessibilityLabel={WEEKDAY_NAMES[day]}
                  accessibilityState={{ checked: weekdays.includes(day) }}
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
                onFocus={revealFormEnd}
                onBlur={() => setDayOfMonth((v) => clampNumberText(v, 1, 31))}
                selectTextOnFocus
                maxLength={2}
                accessibilityLabel="Day of the month"
                keyboardType="number-pad"
                className="w-16 rounded-tile bg-white px-3 py-2 text-center font-mono text-sm text-ink dark:bg-night-surface dark:text-mist"
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
                onFocus={revealFormEnd}
                onBlur={() => setIntervalDays((v) => clampNumberText(v, 1, 365))}
                selectTextOnFocus
                maxLength={3}
                accessibilityLabel="Number of days"
                keyboardType="number-pad"
                className="w-16 rounded-tile bg-white px-3 py-2 text-center font-mono text-sm text-ink dark:bg-night-surface dark:text-mist"
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
