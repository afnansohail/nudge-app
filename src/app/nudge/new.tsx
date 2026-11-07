import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useDb } from '@/db/use-db';
import { NudgeForm } from '@/components/reminders/NudgeForm';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { FormScrollView } from '@/components/ui/FormScrollView';
import { IconButton } from '@/components/ui/IconButton';
import { goBack } from '@/lib/navigation';

export default function NewNudgeScreen() {
  const { listId: paramListId } = useLocalSearchParams<{ listId?: string }>();
  const db = useDb();
  const lists = useListsStore((s) => s.lists);
  const create = useNudgesStore((s) => s.create);
  const insets = useSafeAreaInsets();

  const defaultListId = paramListId ?? lists.find((l) => l.isDefault)?.id ?? lists[0]?.id;
  if (!defaultListId) return null;

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <IconButton Icon={X} label="Close" onPress={goBack} />
        <Text className="font-display-semibold text-base text-ink dark:text-mist">New nudge</Text>
        <View className="w-9" />
      </View>

      <FormScrollView>
        <NudgeForm
          lists={lists}
          initialValues={{
            title: '',
            note: null,
            listId: defaultListId,
            dueAt: null,
            recurrenceType: 'none',
            recurrenceParams: null,
          }}
          submitLabel="Set the nudge"
          autoFocusTitle
          onSubmit={async (values) => {
            const list = lists.find((l) => l.id === values.listId);
            if (!list) return;
            await create(db, list, values);
            goBack();
          }}
        />
      </FormScrollView>
    </View>
  );
}
