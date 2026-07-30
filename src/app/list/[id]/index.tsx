import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/use-db';
import { useColorScheme } from 'nativewind';
import { ChevronLeft, Settings as SettingsIcon, Plus, Sparkles } from 'lucide-react-native';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { bucketNudges } from '@/lib/buckets';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { NudgeRow } from '@/components/reminders/NudgeRow';
import { LIST_COLORS, FAB_SHADOW, INK_MIST_ICON_COLOR } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const list = useListsStore((s) => s.lists.find((l) => l.id === id));
  const allNudges = useNudgesStore((s) => s.nudges);
  const complete = useNudgesStore((s) => s.complete);
  const uncomplete = useNudgesStore((s) => s.uncomplete);
  const remove = useNudgesStore((s) => s.remove);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const nudges = useMemo(() => allNudges.filter((n) => n.listId === id), [allNudges, id]);
  const buckets = useMemo(() => bucketNudges(nudges), [nudges]);

  if (!list) return null;

  const swatch = LIST_COLORS[list.color][colorScheme ?? 'light'];
  const activeCount = nudges.filter((n) => n.completedAt === null).length;

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <ScrollView contentContainerClassName="pb-28">
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
          <PressableScale
            onPress={() => router.push(`/list/${list.id}/edit`)}
            className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
          >
            <SettingsIcon size={16} color="#6B655C" />
          </PressableScale>
        </View>

        <View className="px-4 pb-5 pt-5">
          <Text
            style={{ color: swatch.dot }}
            className="font-display-semibold text-[30px] tracking-tight"
          >
            {list.name}
          </Text>
          <Text className="mt-1 text-[13.5px] text-muted dark:text-muted-dark">
            {activeCount} nudge{activeCount === 1 ? '' : 's'} · {buckets.soon.length} want you soon
          </Text>
        </View>

        {buckets.soon.length > 0 && (
          <>
            <SectionLabel label="Nudging soon" />
            <Card className="mx-4 mb-5">
              {buckets.soon.map((nudge) => (
                <NudgeRow
                  key={nudge.id}
                  nudge={nudge}
                  timeLabel={formatTimeLabel(nudge)}
                  onToggleComplete={() => complete(db, list, nudge.id)}
                  onDelete={() => remove(db, nudge.id)}
                  onPress={() => router.push(`/nudge/${nudge.id}/edit`)}
                />
              ))}
            </Card>
          </>
        )}

        {buckets.whenever.length > 0 && (
          <>
            <SectionLabel label="Whenever, honestly" />
            <Card className="mx-4 mb-5">
              {buckets.whenever.map((nudge) => (
                <NudgeRow
                  key={nudge.id}
                  nudge={nudge}
                  onToggleComplete={() => complete(db, list, nudge.id)}
                  onDelete={() => remove(db, nudge.id)}
                  onPress={() => router.push(`/nudge/${nudge.id}/edit`)}
                />
              ))}
            </Card>
          </>
        )}

        {buckets.soon.length === 0 && buckets.whenever.length === 0 && (
          <EmptyState
            Icon={Sparkles}
            title="Nothing here yet"
            subtitle="Add your first nudge for this list."
          />
        )}

        {buckets.completed.length > 0 && (
          <>
            <SectionLabel label={`Nailed it · ${buckets.completed.length}`} />
            <View className="mx-4 mb-5" style={{ opacity: 0.6 }}>
              {buckets.completed.map((nudge) => (
                <NudgeRow
                  key={nudge.id}
                  nudge={nudge}
                  onToggleComplete={() => uncomplete(db, list, nudge.id)}
                  onDelete={() => remove(db, nudge.id)}
                  onPress={() => router.push(`/nudge/${nudge.id}/edit`)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 right-5 items-end"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <PressableScale
          onPress={() => router.push({ pathname: '/nudge/new', params: { listId: list.id } })}
          style={FAB_SHADOW}
          className="flex-row items-center gap-2 rounded-full bg-ink px-5 py-3.5 dark:bg-mist"
        >
          <Plus size={20} color={INK_MIST_ICON_COLOR[colorScheme ?? 'light']} />
          <Text className="font-display-semibold text-[14.5px] text-cream dark:text-night">
            Add a nudge
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="px-5 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
      {label}
    </Text>
  );
}

function formatTimeLabel(nudge: { nextOccurrenceAt: number | null; dueAt: number | null }): string {
  const timestamp = nudge.nextOccurrenceAt ?? nudge.dueAt;
  if (timestamp === null) return '';
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
