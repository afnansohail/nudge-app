import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { X, Trash2 } from 'lucide-react-native';
import { useDb } from '@/db/use-db';
import { NudgeForm } from '@/components/reminders/NudgeForm';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { FormScrollView } from '@/components/ui/FormScrollView';
import { IconButton } from '@/components/ui/IconButton';
import { confirmDeleteNudge } from '@/lib/confirm-delete';
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
        <IconButton Icon={X} label="Close" onPress={goBack} />
        <Text className="font-display-semibold text-base text-ink dark:text-mist">Edit nudge</Text>
        <IconButton
          Icon={Trash2}
          label="Delete nudge"
          color="#C24A2C"
          onPress={() => {
            confirmDeleteNudge(nudge, async () => {
              await remove(db, nudge.id);
              goBack();
            });
          }}
        />
      </View>

      <FormScrollView>
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
      </FormScrollView>
    </View>
  );
}
