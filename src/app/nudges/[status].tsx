import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useDb } from '@/db/use-db';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import {
  groupNudgesByStatus,
  sortAcrossLists,
  STATUS_LABELS,
  type NudgeStatus,
} from '@/lib/status';
import { formatNudgeDateTime } from '@/lib/date';
import type { Nudge, NudgeList } from '@/lib/types';
import { LIST_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Pill } from '@/components/ui/Pill';
import { NudgeRow } from '@/components/reminders/NudgeRow';
import { goBack } from '@/lib/navigation';

const VALID_STATUSES: NudgeStatus[] = ['upcoming', 'completed', 'snoozed', 'missed'];

// The screen is one flat, virtualized list of nudges from all lists, sorted
// by time (see sortAcrossLists). It is not grouped by list: grouping made the
// user scroll past all of list 1 to reach the newest nudge of list 2. Each
// row shows its list as a dot and name instead, and chips at the top filter
// to one list.
//
// FlashList mounts only the rows near the screen and recycles them. The
// completed list grows forever, so mounting every row (each with a swipe
// gesture and animations) made this screen slow.
//
// All rows sit in one card: each row draws its own slice of it. The first
// row has the top corners, the last row has the bottom corners.
type Item = { key: string; list: NudgeList; nudge: Nudge; isFirst: boolean; isLast: boolean };

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
  const scheme = colorScheme ?? 'light';
  const listRef = useRef<FlashListRef<Item>>(null);
  const [filterListId, setFilterListId] = useState<string | null>(null);

  const nudges = useMemo(
    () => sortAcrossLists(groupNudgesByStatus(allNudges)[status], status),
    [allNudges, status]
  );

  // Chips only for lists that have nudges on this screen, in the user's list
  // order.
  const listsWithNudges = useMemo(() => {
    const ids = new Set(nudges.map((n) => n.listId));
    return lists.filter((l) => ids.has(l.id));
  }, [lists, nudges]);

  // If the filtered list has no nudges left here (e.g. its last one was
  // completed), fall back to All.
  const activeFilter = listsWithNudges.some((l) => l.id === filterListId) ? filterListId : null;

  const items = useMemo(() => {
    const listById = new Map(lists.map((l) => [l.id, l]));
    const shown = activeFilter ? nudges.filter((n) => n.listId === activeFilter) : nudges;
    const rows: Item[] = [];
    shown.forEach((nudge) => {
      const list = listById.get(nudge.listId);
      if (list) rows.push({ key: nudge.id, list, nudge, isFirst: false, isLast: false });
    });
    if (rows.length > 0) {
      rows[0].isFirst = true;
      rows[rows.length - 1].isLast = true;
    }
    return rows;
  }, [lists, nudges, activeFilter]);

  const selectFilter = (listId: string | null) => {
    setFilterListId(listId);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // Stable callbacks so memoized rows skip re-renders. Rows pass the nudge
  // back; find its list here.
  const listFor = useCallback(
    (nudge: Nudge) => lists.find((l) => l.id === nudge.listId),
    [lists]
  );
  const handleToggle = useCallback(
    (nudge: Nudge) => {
      const list = listFor(nudge);
      if (!list) return;
      return status === 'completed' ? uncomplete(db, list, nudge.id) : complete(db, list, nudge.id);
    },
    [listFor, status, db, complete, uncomplete]
  );
  const handleDelete = useCallback((nudge: Nudge) => remove(db, nudge.id), [db, remove]);
  const handleOpen = useCallback((nudge: Nudge) => router.push(`/nudge/${nudge.id}/edit`), []);

  const renderItem = ({ item }: { item: Item }) => {
    const { nudge, list, isFirst, isLast } = item;
    const date = nudge.nextOccurrenceAt ?? nudge.dueAt;
    return (
      <View
        className={`mx-4 bg-white dark:bg-night-surface ${isFirst ? 'rounded-t-card' : ''} ${
          isLast ? 'rounded-b-card' : ''
        }`}
      >
        <NudgeRow
          nudge={nudge}
          animateLayout={false}
          timeLabel={date ? formatNudgeDateTime(date) : undefined}
          listName={list.name}
          listDotColor={LIST_COLORS[list.color][scheme].dot}
          // Every row on this screen has the same status; the badge says nothing.
          showStatusBadge={false}
          showRecurrence={false}
          onToggleComplete={handleToggle}
          onDelete={handleDelete}
          onPress={handleOpen}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <FlashList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View className="pb-4">
            <View
              className="flex-row items-center justify-between px-4"
              style={{ paddingTop: insets.top + 16 }}
            >
              <IconButton Icon={ChevronLeft} label="Back" size={18} onPress={goBack} />
              <Text className="font-display-semibold text-base text-ink dark:text-mist">
                {STATUS_LABELS[status]}
              </Text>
              <View className="w-9" />
            </View>

            {/* With one list, "All" and that list are the same thing. */}
            {listsWithNudges.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-5"
                contentContainerClassName="gap-2 px-4"
              >
                <Pill label="All" selected={activeFilter === null} onPress={() => selectFilter(null)} />
                {listsWithNudges.map((list) => (
                  <Pill
                    key={list.id}
                    label={list.name}
                    dotColor={LIST_COLORS[list.color][scheme].dot}
                    selected={activeFilter === list.id}
                    onPress={() => selectFilter(list.id)}
                  />
                ))}
              </ScrollView>
            )}
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
