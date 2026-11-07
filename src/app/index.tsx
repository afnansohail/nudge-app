import { ListRow } from '@/components/lists/ListRow';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { StatTile } from '@/components/ui/StatTile';
import { useDb } from '@/db/use-db';
import { formatNudgeDate } from '@/lib/date';
import { groupNudgesByStatus, isDueToday } from '@/lib/status';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { useSettingsStore } from '@/store/settings-store';
import { FAB_SHADOW, INK_MIST_ICON_COLOR, LIST_COLORS } from '@/theme/tokens';
import { router } from 'expo-router';
import { Plus, Settings as SettingsIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const db = useDb();
  const lists = useListsStore((s) => s.lists);
  const reorderLists = useListsStore((s) => s.reorder);
  const nudges = useNudgesStore((s) => s.nudges);
  const showSummaryCards = useSettingsStore((s) => s.settings.showSummaryCards);

  const groups = useMemo(() => groupNudgesByStatus(nudges), [nudges]);
  const todayCount = useMemo(() => nudges.filter((n) => isDueToday(n)).length, [nudges]);
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const insets = useSafeAreaInsets();

  // One pass over all nudges, not one filter per list row on every render.
  const activeCountByList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of nudges) {
      if (n.completedAt === null) counts.set(n.listId, (counts.get(n.listId) ?? 0) + 1);
    }
    return counts;
  }, [nudges]);

  const today = useMemo(() => formatNudgeDate(Date.now()), []);

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <NestableScrollContainer contentContainerStyle={{ paddingBottom: 112 }}>
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="flex-row items-center gap-1.5">
            <Text className="font-display-semibold text-lg text-ink dark:text-mist">
              nudge
            </Text>
            <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          </View>
          <IconButton
            Icon={SettingsIcon}
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        </View>

        <View className="px-4 pb-4 pt-5">
          <Text className="mb-2.5 font-mono text-caption uppercase tracking-widest text-muted dark:text-muted-dark">
            {today}
          </Text>
          <Text className="font-display-semibold text-title tracking-tight text-ink dark:text-mist">
            {todayCount > 0
              ? `${todayCount} nudge${todayCount === 1 ? '' : 's'} left today.`
              : 'Nothing pressing.'}
            {'\n'}
            <Text className="text-muted dark:text-muted-dark">
              {todayCount === 0 ? 'The day is yours.' : 'Then the day is yours.'}
            </Text>
          </Text>
        </View>

        {showSummaryCards && (
          <View className="flex-row flex-wrap gap-2.5 px-4 pb-6">
            <View className="basis-[47%] grow">
              <PressableScale onPress={() => router.push('/nudges/upcoming')}>
                <StatTile
                  value={groups.upcoming.length}
                  label="Upcoming"
                  tileColor={LIST_COLORS.amber[scheme].tile}
                  textColor={LIST_COLORS.amber[scheme].text}
                />
              </PressableScale>
            </View>
            <View className="basis-[47%] grow">
              <PressableScale onPress={() => router.push('/nudges/completed')}>
                <StatTile
                  value={groups.completed.length}
                  label="Completed"
                  tileColor={LIST_COLORS.mint[scheme].tile}
                  textColor={LIST_COLORS.mint[scheme].text}
                />
              </PressableScale>
            </View>
            <View className="basis-[47%] grow">
              <PressableScale onPress={() => router.push('/nudges/snoozed')}>
                <StatTile
                  value={groups.snoozed.length}
                  label="Snoozed"
                  tileColor={LIST_COLORS.lavender[scheme].tile}
                  textColor={LIST_COLORS.lavender[scheme].text}
                />
              </PressableScale>
            </View>
            <View className="basis-[47%] grow">
              <PressableScale onPress={() => router.push('/nudges/missed')}>
                <StatTile
                  value={groups.missed.length}
                  label="Overdue"
                  tileColor={LIST_COLORS.coral[scheme].tile}
                  textColor={LIST_COLORS.coral[scheme].text}
                />
              </PressableScale>
            </View>
          </View>
        )}

        <View className="flex-row items-baseline justify-between px-5 pb-2.5">
          <Text className="font-display-semibold text-lg text-ink dark:text-mist">
            Your lists
          </Text>
          <Text className="font-mono text-caption uppercase tracking-widest text-muted dark:text-muted-dark">
            {lists.length} list{lists.length === 1 ? '' : 's'}
          </Text>
        </View>

        <Card className="mx-4">
          <NestableDraggableFlatList
            data={lists}
            keyExtractor={(list) => list.id}
            renderItem={({ item, drag, isActive, getIndex }) => {
              return (
                <ListRow
                  list={item}
                  count={activeCountByList.get(item.id) ?? 0}
                  isLast={getIndex() === lists.length - 1}
                  onPress={() => router.push(`/list/${item.id}`)}
                  onDragStart={drag}
                  isDragging={isActive}
                />
              );
            }}
            onDragEnd={({ data }) => reorderLists(db, data.map((l) => l.id))}
          />
        </Card>

        <PressableScale
          onPress={() => router.push('/list/new')}
          className="mx-4 mt-4 items-center rounded-full bg-[#F1ECE3] py-3 dark:bg-night-surface"
        >
          <Text className="font-display-medium text-sm text-muted dark:text-muted-dark">
            + New list
          </Text>
        </PressableScale>
      </NestableScrollContainer>

      <View className="absolute bottom-0 right-5" style={{ paddingBottom: insets.bottom + 20 }}>
        <PressableScale
          onPress={() => router.push('/nudge/new')}
          accessibilityRole="button"
          accessibilityLabel="New nudge"
          style={FAB_SHADOW}
          className="h-[58px] w-[58px] items-center justify-center rounded-full bg-ink dark:bg-mist"
        >
          <Plus size={26} color={INK_MIST_ICON_COLOR[scheme]} />
        </PressableScale>
      </View>
    </View>
  );
}
