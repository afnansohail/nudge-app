import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useDb } from '@/db/use-db';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { groupNudgesByStatus, STATUS_LABELS, type NudgeStatus } from '@/lib/status';
import { formatNudgeDateTime } from '@/lib/date';
import { LIST_COLORS } from '@/theme/tokens';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { NudgeRow } from '@/components/reminders/NudgeRow';
import { goBack } from '@/lib/navigation';

const VALID_STATUSES: NudgeStatus[] = ['upcoming', 'completed', 'snoozed', 'missed'];

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

  const matching = useMemo(() => groupNudgesByStatus(allNudges)[status], [allNudges, status]);

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <ScrollView contentContainerClassName="pb-12">
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

        {matching.length === 0 && (
          <EmptyState
            Icon={Sparkles}
            title={`No ${STATUS_LABELS[status].toLowerCase()} nudges`}
            subtitle="Nothing to show here right now."
          />
        )}

        {lists.map((list) => {
          const items = matching.filter((n) => n.listId === list.id);
          if (items.length === 0) return null;
          const swatch = LIST_COLORS[list.color][colorScheme ?? 'light'];
          return (
            <View key={list.id}>
              <Text
                className="px-5 pb-2 pt-5 font-mono text-[11px] uppercase tracking-widest"
                style={{ color: swatch.dot }}
              >
                {list.name}
              </Text>
              <Card className="mx-4 mb-1">
                {items.map((nudge) => (
                  <NudgeRow
                    key={nudge.id}
                    nudge={nudge}
                    timeLabel={
                      nudge.nextOccurrenceAt ?? nudge.dueAt
                        ? formatNudgeDateTime((nudge.nextOccurrenceAt ?? nudge.dueAt) as number)
                        : undefined
                    }
                    onToggleComplete={() =>
                      status === 'completed'
                        ? uncomplete(db, list, nudge.id)
                        : complete(db, list, nudge.id)
                    }
                    onDelete={() => remove(db, nudge.id)}
                    onPress={() => router.push(`/nudge/${nudge.id}/edit`)}
                  />
                ))}
              </Card>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
