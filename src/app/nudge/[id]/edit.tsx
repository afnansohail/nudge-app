import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { X, Trash2 } from 'lucide-react-native';
import { useDb } from '@/db/use-db';
import { NudgeForm } from '@/components/reminders/NudgeForm';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { PressableScale } from '@/components/ui/PressableScale';
import { goBack } from '@/lib/navigation';

export default function EditNudgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const lists = useListsStore((s) => s.lists);
  const nudge = useNudgesStore((s) => s.nudges.find((n) => n.id === id));
  const update = useNudgesStore((s) => s.update);
  const remove = useNudgesStore((s) => s.remove);
  const insets = useSafeAreaInsets();

  if (!nudge) return null;

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <PressableScale
          onPress={goBack}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
        >
          <X size={16} color="#6B655C" />
        </PressableScale>
        <Text className="font-display-semibold text-base text-ink dark:text-mist">Edit nudge</Text>
        <PressableScale
          onPress={async () => {
            await remove(db, nudge.id);
            goBack();
          }}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
        >
          <Trash2 size={16} color="#C24A2C" />
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <NudgeForm
            lists={lists}
            initialValues={{
              title: nudge.title,
              note: nudge.note,
              listId: nudge.listId,
              dueAt: nudge.nextOccurrenceAt ?? nudge.dueAt,
              recurrenceType: nudge.recurrenceType,
              recurrenceParams: nudge.recurrenceParams,
            }}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              const list = lists.find((l) => l.id === values.listId);
              if (!list) return;
              await update(db, list, nudge.id, {
                ...values,
                nextOccurrenceAt: values.dueAt,
                snoozedUntil: null,
              });
              goBack();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
