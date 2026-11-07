import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useDb } from '@/db/use-db';
import { ListForm } from '@/components/lists/ListForm';
import { useListsStore } from '@/store/lists-store';
import { IconButton } from '@/components/ui/IconButton';
import { goBack } from '@/lib/navigation';
import { DEFAULT_LIST_ICON } from '@/constants/list-icons';

export default function NewListScreen() {
  const db = useDb();
  const create = useListsStore((s) => s.create);
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <IconButton Icon={X} label="Close" onPress={goBack} />
        <Text className="font-display-semibold text-base text-ink dark:text-mist">New list</Text>
        <View className="w-9" />
      </View>

      <ListForm
        initialValues={{ name: '', icon: DEFAULT_LIST_ICON, color: 'coral' }}
        submitLabel="Create list"
        onSubmit={async (values) => {
          await create(db, values);
          goBack();
        }}
      />
    </View>
  );
}
