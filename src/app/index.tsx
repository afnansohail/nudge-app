import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings as SettingsIcon, Plus } from 'lucide-react-native';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { useSettingsStore } from '@/store/settings-store';
import { StatTile } from '@/components/ui/StatTile';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { ListRow } from '@/components/lists/ListRow';
import { FAB_SHADOW, INK_MIST_ICON_COLOR } from '@/theme/tokens';

const NOW_ISH_WINDOW_MS = 3 * 60 * 60 * 1000;

export default function HomeScreen() {
  const lists = useListsStore((s) => s.lists);
  const nudges = useNudgesStore((s) => s.nudges);
  const completedCount = useSettingsStore((s) => s.settings.completedCount);

  const [stats, setStats] = useState({ nowIsh: 0, laterOn: 0, snoozed: 0 });
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const now = Date.now();
    let nowIsh = 0;
    let laterOn = 0;
    let snoozed = 0;

    for (const nudge of nudges) {
      if (nudge.completedAt !== null) continue;
      if (nudge.snoozedUntil !== null && nudge.snoozedUntil > now) {
        snoozed += 1;
        continue;
      }
      const effectiveDate = nudge.nextOccurrenceAt ?? nudge.dueAt;
      if (effectiveDate === null) continue;
      if (effectiveDate <= now + NOW_ISH_WINDOW_MS) {
        nowIsh += 1;
      } else {
        laterOn += 1;
      }
    }

    setStats({ nowIsh, laterOn, snoozed });
  }, [nudges]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    []
  );

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
            {stats.nowIsh > 0
              ? `${stats.nowIsh} nudge${stats.nowIsh === 1 ? '' : 's'} left.`
              : 'Nothing pressing.'}
            {'\n'}
            <Text className="text-muted dark:text-muted-dark">Then the day is yours.</Text>
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2.5 px-4 pb-6">
          <View className="basis-[47%] grow">
            <StatTile value={stats.nowIsh} label="Now-ish" tileColor="#FFD9D2" textColor="#8E2F1A" />
          </View>
          <View className="basis-[47%] grow">
            <StatTile
              value={stats.laterOn}
              label="Later on"
              tileColor="#FFE6B0"
              textColor="#8A5A08"
            />
          </View>
          <View className="basis-[47%] grow">
            <StatTile
              value={stats.snoozed}
              label="Snoozed"
              tileColor="#E2DBF7"
              textColor="#4E3A9E"
            />
          </View>
          <View className="basis-[47%] grow">
            <StatTile
              value={completedCount}
              label="Nailed it"
              tileColor="#CDECD8"
              textColor="#1F6B45"
            />
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

        <View className="px-5 pb-2 pt-7">
          <Text className="max-w-[200px] font-display text-[13px] leading-tight text-muted dark:text-muted-dark">
            {stats.nowIsh === 0
              ? 'Nothing overdue. Suspiciously on top of things.'
              : "Let's get through these."}
          </Text>
        </View>
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
