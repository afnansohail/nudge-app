import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useDb } from '@/db/use-db';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { groupNudgesByStatus, STATUS_LABELS, type NudgeStatus } from '@/lib/status';
import { formatNudgeDateTime } from '@/lib/date';
import type { Nudge, NudgeList } from '@/lib/types';
import { LIST_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { NudgeRow } from '@/components/reminders/NudgeRow';
import { goBack } from '@/lib/navigation';

const VALID_STATUSES: NudgeStatus[] = ['upcoming', 'completed', 'snoozed', 'missed'];

// The screen is one flat, virtualized list: a header item for each list,
// then that list's nudges. FlashList mounts only the rows near the screen
// and recycles them while scrolling. The completed list grows forever, so
// mounting every row (each with a swipe gesture and animations) made this
// screen slow to open and slow to update.
//
// Each row draws its own slice of the list's card: the first row has the top
// corners, the last row has the bottom corners.
type Item =
  | { type: 'header'; key: string; list: NudgeList }
  | { type: 'row'; key: string; list: NudgeList; nudge: Nudge; isFirst: boolean; isLast: boolean };

function buildItems(lists: NudgeList[], nudges: Nudge[]): Item[] {
  const byList = new Map<string, Nudge[]>();
  for (const nudge of nudges) {
    const items = byList.get(nudge.listId);
    if (items) items.push(nudge);
    else byList.set(nudge.listId, [nudge]);
  }

  const items: Item[] = [];
  for (const list of lists) {
    const listNudges = byList.get(list.id);
    if (!listNudges) continue;
    items.push({ type: 'header', key: `header:${list.id}`, list });
    listNudges.forEach((nudge, index) => {
      items.push({
        type: 'row',
        key: nudge.id,
        list,
        nudge,
        isFirst: index === 0,
        isLast: index === listNudges.length - 1,
      });
    });
  }
  return items;
}

export default function NudgeCategoryScreen() {
  const { status: statusParam } = useLocalSearchParams<{ status: string }>();
  const status: NudgeStatus = VALID_STATUSES.includes(statusParam as NudgeStatus)
    ? (statusParam as NudgeStatus)
    : 'upcoming';

  const db = useDb();
  const lists = useListsStore((s) => s.lists);
  const allNudges = useNudgesStore((s) => s.nudges);
  const complete = useNudgesStore((s) => s.complete);
  const uncomplete = useNudgesStore((s) => s.uncomplete);
  const remove = useNudgesStore((s) => s.remove);
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  const items = useMemo(
    () => buildItems(lists, groupNudgesByStatus(allNudges)[status]),
    [lists, allNudges, status]
  );

  const renderItem = ({ item }: { item: Item }) => {
    if (item.type === 'header') {
      const swatch = LIST_COLORS[item.list.color][colorScheme ?? 'light'];
      return (
        <Text
          className="px-5 pb-2 pt-5 font-mono text-[11px] uppercase tracking-widest"
          style={{ color: swatch.dot }}
        >
          {item.list.name}
        </Text>
      );
    }

    const { nudge, list, isFirst, isLast } = item;
    const date = nudge.nextOccurrenceAt ?? nudge.dueAt;
    return (
      <View
        className={`mx-4 bg-white dark:bg-night-surface ${isFirst ? 'rounded-t-[22px]' : ''} ${
          isLast ? 'mb-1 rounded-b-[22px]' : ''
        }`}
      >
        <NudgeRow
          nudge={nudge}
          animateLayout={false}
          timeLabel={date ? formatNudgeDateTime(date) : undefined}
          onToggleComplete={() =>
            status === 'completed' ? uncomplete(db, list, nudge.id) : complete(db, list, nudge.id)
          }
          onDelete={() => remove(db, nudge.id)}
          onPress={() => router.push(`/nudge/${nudge.id}/edit`)}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View
            className="flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 16 }}
          >
            <PressableScale
              onPress={goBack}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
            >
              <ChevronLeft size={18} color="#6B655C" />
            </PressableScale>
            <Text className="font-display-semibold text-base text-ink dark:text-mist">
              {STATUS_LABELS[status]}
            </Text>
            <View className="w-9" />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            Icon={Sparkles}
            title={`No ${STATUS_LABELS[status].toLowerCase()} nudges`}
            subtitle="Nothing to show here right now."
          />
        }
      />
    </View>
  );
}
