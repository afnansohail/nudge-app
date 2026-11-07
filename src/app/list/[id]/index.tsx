import { NudgeRow } from '@/components/reminders/NudgeRow';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { useDb } from '@/db/use-db';
import { formatNudgeDateTime } from '@/lib/date';
import { goBack } from '@/lib/navigation';
import { groupNudgesByStatus } from '@/lib/status';
import type { Nudge } from '@/lib/types';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { useSettingsStore } from '@/store/settings-store';
import { FAB_SHADOW, INK_MIST_ICON_COLOR, LIST_COLORS } from '@/theme/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Plus, Settings as SettingsIcon, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState } from 'react';
import { Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// This screen is one ScrollView (it must be, for drag-to-reorder), so it
// mounts every row it shows. A list can have hundreds of completed nudges,
// and each row has a swipe gesture and animations. So completed rows are
// added in batches as the user scrolls near the bottom.
const COMPLETED_BATCH = 30;
const LOAD_MORE_DISTANCE = 800;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const list = useListsStore((s) => s.lists.find((l) => l.id === id));
  const allNudges = useNudgesStore((s) => s.nudges);
  const complete = useNudgesStore((s) => s.complete);
  const uncomplete = useNudgesStore((s) => s.uncomplete);
  const remove = useNudgesStore((s) => s.remove);
  const reorder = useNudgesStore((s) => s.reorder);
  const hideCompletedSection = useSettingsStore((s) => s.settings.hideCompletedSection);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const nudges = useMemo(() => allNudges.filter((n) => n.listId === id), [allNudges, id]);
  const groups = useMemo(() => groupNudgesByStatus(nudges), [nudges]);
  const [completedLimit, setCompletedLimit] = useState(COMPLETED_BATCH);
  const completedTotal = groups.completed.length;

  // Stable callbacks: NudgeRow is memoized, so rows that did not change do
  // not re-render when one nudge changes.
  const handleComplete = useCallback(
    (nudge: Nudge) => (list ? complete(db, list, nudge.id) : undefined),
    [db, list, complete]
  );
  const handleUncomplete = useCallback(
    (nudge: Nudge) => (list ? uncomplete(db, list, nudge.id) : undefined),
    [db, list, uncomplete]
  );
  const handleDelete = useCallback((nudge: Nudge) => remove(db, nudge.id), [db, remove]);
  const handleOpen = useCallback((nudge: Nudge) => router.push(`/nudge/${nudge.id}/edit`), []);

  const showMoreCompletedIfNearEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromEnd = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromEnd > LOAD_MORE_DISTANCE) return;
      setCompletedLimit((limit) => (limit < completedTotal ? limit + COMPLETED_BATCH : limit));
    },
    [completedTotal]
  );

  if (!list) return null;

  const swatch = LIST_COLORS[list.color][colorScheme ?? 'light'];
  const activeCount = nudges.filter((n) => n.completedAt === null).length;

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <NestableScrollContainer
        contentContainerStyle={{ paddingBottom: 112 }}
        // NestableScrollContainer uses onScroll itself; these two are free.
        onScrollEndDrag={showMoreCompletedIfNearEnd}
        onMomentumScrollEnd={showMoreCompletedIfNearEnd}
      >
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <IconButton Icon={ChevronLeft} label="Back" size={18} onPress={goBack} />
          <IconButton
            Icon={SettingsIcon}
            label="Edit list"
            onPress={() => router.push(`/list/${list.id}/edit`)}
          />
        </View>

        <View className="px-4 pb-5 pt-5">
          <Text
            style={{ color: swatch.dot }}
            className="font-display-semibold text-title tracking-tight"
          >
            {list.name}
          </Text>
          <Text className="mt-1 font-display text-sm text-muted dark:text-muted-dark">
            {activeCount} nudge{activeCount === 1 ? '' : 's'}
            {groups.missed.length > 0 ? ` · ${groups.missed.length} overdue` : ''}
          </Text>
        </View>

        {groups.missed.length > 0 && (
          <>
            <SectionLabel label="Overdue" />
            <Card className="mx-4 mb-5">
              {groups.missed.map((nudge) => (
                <NudgeRow
                  key={nudge.id}
                  nudge={nudge}
                  timeLabel={formatTimeLabel(nudge)}
                  onToggleComplete={handleComplete}
                  onDelete={handleDelete}
                  onPress={handleOpen}
                />
              ))}
            </Card>
          </>
        )}

        {groups.upcoming.length > 0 && (
          <>
            <SectionLabel label="Upcoming" />
            <Card className="mx-4 mb-5">
              <NestableDraggableFlatList
                data={groups.upcoming}
                keyExtractor={(nudge) => nudge.id}
                renderItem={({ item, drag, isActive }) => (
                  <NudgeRow
                    nudge={item}
                    timeLabel={formatTimeLabel(item)}
                    onToggleComplete={handleComplete}
                    onDelete={handleDelete}
                    onPress={handleOpen}
                    onDragStart={drag}
                    isDragging={isActive}
                  />
                )}
                onDragEnd={({ data }) => reorder(db, data.map((n) => n.id))}
              />
            </Card>
          </>
        )}

        {groups.snoozed.length > 0 && (
          <>
            <SectionLabel label="Snoozed" />
            <Card className="mx-4 mb-5">
              {groups.snoozed.map((nudge) => (
                <NudgeRow
                  key={nudge.id}
                  nudge={nudge}
                  timeLabel={formatTimeLabel(nudge)}
                  onToggleComplete={handleComplete}
                  onDelete={handleDelete}
                  onPress={handleOpen}
                />
              ))}
            </Card>
          </>
        )}

        {groups.missed.length === 0 && groups.upcoming.length === 0 && groups.snoozed.length === 0 && (
          <EmptyState
            Icon={Sparkles}
            {...(completedTotal > 0
              ? { title: 'All done here', subtitle: 'Every nudge in this list is done.' }
              : { title: 'Nothing here yet', subtitle: 'Add your first nudge for this list.' })}
          />
        )}

        {!hideCompletedSection && completedTotal > 0 && (
          <>
            <SectionLabel label={`Nailed it · ${completedTotal}`} />
            <View className="mx-4 mb-5" style={{ opacity: 0.6 }}>
              {groups.completed.slice(0, completedLimit).map((nudge) => (
                <NudgeRow
                  key={nudge.id}
                  nudge={nudge}
                  onToggleComplete={handleUncomplete}
                  onDelete={handleDelete}
                  onPress={handleOpen}
                />
              ))}
            </View>
          </>
        )}
      </NestableScrollContainer>

      <View
        className="absolute bottom-0 right-5 items-end"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <PressableScale
          onPress={() => router.push({ pathname: '/nudge/new', params: { listId: list.id } })}
          accessibilityRole="button"
          style={FAB_SHADOW}
          className="flex-row items-center gap-2 rounded-full bg-ink px-5 py-3.5 dark:bg-mist"
        >
          <Plus size={20} color={INK_MIST_ICON_COLOR[colorScheme ?? 'light']} />
          <Text className="font-display-semibold text-sm text-cream dark:text-night">
            Nudge me
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="px-5 pb-2 font-mono text-caption uppercase tracking-widest text-muted dark:text-muted-dark">
      {label}
    </Text>
  );
}

function formatTimeLabel(nudge: { nextOccurrenceAt: number | null; dueAt: number | null }): string {
  const timestamp = nudge.nextOccurrenceAt ?? nudge.dueAt;
  if (timestamp === null) return '';
  return formatNudgeDateTime(timestamp);
}
