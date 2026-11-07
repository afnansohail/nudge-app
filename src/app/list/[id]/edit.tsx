import { View, Text, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Trash2 } from 'lucide-react-native';
import { useDb } from '@/db/use-db';
import { ListForm } from '@/components/lists/ListForm';
import { useListsStore } from '@/store/lists-store';
import { IconButton } from '@/components/ui/IconButton';
import { goBack } from '@/lib/navigation';

export default function EditListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const list = useListsStore((s) => s.lists.find((l) => l.id === id));
  const update = useListsStore((s) => s.update);
  const remove = useListsStore((s) => s.remove);
  const insets = useSafeAreaInsets();

  if (!list) return null;

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <IconButton Icon={X} label="Close" onPress={goBack} />
        <Text className="font-display-semibold text-base text-ink dark:text-mist">Edit list</Text>
        {list.isDefault ? (
          <View className="w-9" />
        ) : (
          <IconButton
            Icon={Trash2}
            label="Delete list"
            color="#C24A2C"
            onPress={() => {
              Alert.alert(
                `Delete "${list.name}"?`,
                'This also deletes every nudge in this list and cancels their reminders. This can\'t be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await remove(db, list.id);
                      router.dismissTo('/');
                    },
                  },
                ]
              );
            }}
          />
        )}
      </View>

      <ListForm
        initialValues={{ name: list.name, icon: list.icon, color: list.color }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await update(db, list.id, values);
          goBack();
        }}
      />
    </View>
  );
}
