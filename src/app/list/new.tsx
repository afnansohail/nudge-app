import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useDb } from '@/db/use-db';
import { ListForm } from '@/components/lists/ListForm';
import { useListsStore } from '@/store/lists-store';
import { PressableScale } from '@/components/ui/PressableScale';
import { goBack } from '@/lib/navigation';

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
        <PressableScale
          onPress={goBack}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
        >
          <X size={16} color="#6B655C" />
        </PressableScale>
        <Text className="font-display-semibold text-base text-ink dark:text-mist">New list</Text>
        <View className="w-9" />
      </View>

      <ListForm
        initialValues={{ name: '', icon: 'sparkles', color: 'coral' }}
        submitLabel="Create list"
        onSubmit={async (values) => {
          await create(db, values);
          goBack();
        }}
      />
    </View>
  );
}
