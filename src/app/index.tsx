import { ListRow } from '@/components/lists/ListRow';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { StatTile } from '@/components/ui/StatTile';
import { formatNudgeDate } from '@/lib/date';
import { groupNudgesByStatus, isDueToday } from '@/lib/status';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { FAB_SHADOW, INK_MIST_ICON_COLOR } from '@/theme/tokens';
import { router } from 'expo-router';
import { Plus, Settings as SettingsIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const lists = useListsStore((s) => s.lists);
  const nudges = useNudgesStore((s) => s.nudges);

  const groups = useMemo(() => groupNudgesByStatus(nudges), [nudges]);
  const todayCount = useMemo(() => nudges.filter((n) => isDueToday(n)).length, [nudges]);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => formatNudgeDate(Date.now()), []);

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <ScrollView contentContainerClassName="pb-28">
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="flex-row items-center gap-1.5">
            <Text className="font-display-semibold text-[19px] text-ink dark:text-mist">
              nudge
            </Text>
            <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          </View>
          <PressableScale
            onPress={() => router.push('/settings')}
            className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
          >
            <SettingsIcon size={16} color="#6B655C" />
          </PressableScale>
        </View>

        <View className="px-4 pb-4 pt-5">
          <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
            {today} · today
          </Text>
          <Text className="font-display-semibold text-[27px] leading-8 tracking-tight text-ink dark:text-mist">
            {todayCount > 0
              ? `${todayCount} nudge${todayCount === 1 ? '' : 's'} left today.`
              : 'Nothing pressing.'}
            {'\n'}
            <Text className="text-muted dark:text-muted-dark">
              {todayCount === 0 ? 'The day is yours.' : 'Then the day is yours.'}
            </Text>
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2.5 px-4 pb-6">
          <View className="basis-[47%] grow">
            <PressableScale onPress={() => router.push('/nudges/upcoming')}>
              <StatTile
                value={groups.upcoming.length}
                label="Upcoming"
                tileColor="#FFE6B0"
                textColor="#8A5A08"
              />
            </PressableScale>
          </View>
          <View className="basis-[47%] grow">
            <PressableScale onPress={() => router.push('/nudges/completed')}>
              <StatTile
                value={groups.completed.length}
                label="Completed"
                tileColor="#CDECD8"
                textColor="#1F6B45"
              />
            </PressableScale>
          </View>
          <View className="basis-[47%] grow">
            <PressableScale onPress={() => router.push('/nudges/snoozed')}>
              <StatTile
                value={groups.snoozed.length}
                label="Snoozed"
                tileColor="#E2DBF7"
                textColor="#4E3A9E"
              />
            </PressableScale>
          </View>
          <View className="basis-[47%] grow">
            <PressableScale onPress={() => router.push('/nudges/missed')}>
              <StatTile
                value={groups.missed.length}
                label="Overdue"
                tileColor="#FFD9D2"
                textColor="#8E2F1A"
              />
            </PressableScale>
          </View>
        </View>

        <View className="flex-row items-baseline justify-between px-5 pb-2.5">
          <Text className="font-display-semibold text-[17px] text-ink dark:text-mist">
            Your lists
          </Text>
          <Text className="font-mono text-[11px] tracking-widest text-muted dark:text-muted-dark">
            {lists.length} LIST{lists.length === 1 ? '' : 'S'}
          </Text>
        </View>

        <Card className="mx-4">
          {lists.map((list, index) => {
            const count = nudges.filter(
              (n) => n.listId === list.id && n.completedAt === null
            ).length;
            return (
              <ListRow
                key={list.id}
                list={list}
                count={count}
                isLast={index === lists.length - 1}
                onPress={() => router.push(`/list/${list.id}`)}
              />
            );
          })}
        </Card>

        <PressableScale
          onPress={() => router.push('/list/new')}
          className="mx-4 mt-4 items-center rounded-full bg-[#F1ECE3] py-3 dark:bg-night-surface"
        >
          <Text className="font-display-medium text-sm text-muted dark:text-muted-dark">
            + New list
          </Text>
        </PressableScale>
      </ScrollView>

      <View className="absolute bottom-0 right-5" style={{ paddingBottom: insets.bottom + 20 }}>
        <PressableScale
          onPress={() => router.push('/nudge/new')}
          style={FAB_SHADOW}
          className="h-[58px] w-[58px] items-center justify-center rounded-full bg-ink dark:bg-mist"
        >
          <Plus size={26} color={INK_MIST_ICON_COLOR[colorScheme ?? 'light']} />
        </PressableScale>
      </View>
    </View>
  );
}
