import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Check, Trash2 } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { LIST_COLORS } from '@/theme/tokens';
import type { Nudge, Priority } from '@/lib/types';

// Priority is display-only; "gentle" is the common case and stays silent so the
// tag only draws attention for nudges the user marked as more urgent.
const PRIORITY_TAG: Record<Priority, { label: string; colorKey: 'slate' | 'coral' } | null> = {
  gentle: null,
  firm: { label: 'Firm', colorKey: 'slate' },
  relentless: { label: 'Relentless', colorKey: 'coral' },
};

type NudgeRowProps = {
  nudge: Nudge;
  timeLabel?: string;
  onToggleComplete: () => void;
  onDelete: () => void;
  onPress: () => void;
};

// Swipeable's row content has no background of its own (Card paints one
// shared background behind the whole list), so nothing actually clips the
// action panel as the row slides — the library just flips it from invisible
// to fully-visible-at-full-width the moment any drag is detected. Swipeable
// also needs our rendered content to have a fixed layout width (it measures
// that once, at gesture start, to compute open thresholds), so we can't just
// make the panel's own layout width animate. Instead: a static-width
// container for layout purposes, holding a separately-animated fill that's
// absolutely positioned and grows from 0 -> ACTION_WIDTH as `translation`
// (the live drag distance) increases.
const ACTION_WIDTH = 96;

function SwipeActionPanel({
  translation,
  align,
  color,
  children,
}: {
  translation: SharedValue<number>;
  align: 'left' | 'right';
  color: string;
  children: React.ReactNode;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const dragged = align === 'left' ? translation.value : -translation.value;
    return { width: Math.max(0, Math.min(dragged, ACTION_WIDTH)) };
  });
  const iconStyle = useAnimatedStyle(() => {
    const dragged = align === 'left' ? translation.value : -translation.value;
    const fill = Math.max(0, Math.min(dragged, ACTION_WIDTH));
    const progress = fill / ACTION_WIDTH;
    // Keep the icon centered within the currently-revealed fill (not the
    // full static container), so it rides along with the growing edge
    // instead of sitting frozen at the box's final, fully-open position.
    const centerOffset = align === 'left' ? (fill - ACTION_WIDTH) / 2 : (ACTION_WIDTH - fill) / 2;
    return {
      opacity: progress,
      transform: [{ translateX: centerOffset }, { scale: 0.6 + 0.4 * progress }],
    };
  });
  return (
    <View
      style={{ width: ACTION_WIDTH }}
      className="items-center justify-center overflow-hidden"
    >
      <Animated.View
        style={[
          { position: 'absolute', top: 0, bottom: 0, [align]: 0, backgroundColor: color },
          fillStyle,
        ]}
      />
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </View>
  );
}

export function NudgeRow({ nudge, timeLabel, onToggleComplete, onDelete, onPress }: NudgeRowProps) {
  const isDone = nudge.completedAt !== null;
  const checkStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDone ? 1 : 0, { duration: 150 }),
  }));
  const { colorScheme } = useColorScheme();
  const priorityTag = isDone ? null : PRIORITY_TAG[nudge.priority];
  const prioritySwatch = priorityTag ? LIST_COLORS[priorityTag.colorKey][colorScheme ?? 'light'] : null;
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handleSwipeOpen = (direction: SwipeDirection) => {
    swipeableRef.current?.close();
    // Swipeable's `direction` is which way the finger dragged, not which
    // panel is showing: dragging right (direction 'right') reveals the
    // left/complete panel, dragging left (direction 'left') reveals the
    // right/delete panel.
    if (direction === SwipeDirection.RIGHT) {
      onToggleComplete();
    } else {
      onDelete();
    }
  };

  return (
    <Swipeable
      ref={swipeableRef}
      onSwipeableOpen={handleSwipeOpen}
      renderLeftActions={
        isDone
          ? undefined
          : (_progress, translation) => (
              <SwipeActionPanel translation={translation} align="left" color="#35A06A">
                <Check size={18} color="#FFFFFF" />
              </SwipeActionPanel>
            )
      }
      renderRightActions={(_progress, translation) => (
        <SwipeActionPanel translation={translation} align="right" color="#E0568F">
          <Trash2 size={18} color="#FFFFFF" />
        </SwipeActionPanel>
      )}
    >
      <Pressable onPress={onPress} className="flex-row items-center gap-3 px-3.5 py-3">
        <Pressable
          onPress={onToggleComplete}
          className={
            isDone
              ? 'h-[22px] w-[22px] items-center justify-center rounded-full bg-[#35A06A]'
              : 'h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#E4DCCE]'
          }
        >
          <Animated.View style={checkStyle}>
            <Check size={12} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
        <View className="flex-1">
          <Text
            className={
              isDone
                ? 'font-display-medium text-[15px] text-muted line-through dark:text-muted-dark'
                : 'font-display-medium text-[15.5px] text-ink dark:text-mist'
            }
          >
            {nudge.title}
          </Text>
          {nudge.note ? (
            <Text className="font-display text-[12.5px] text-muted dark:text-muted-dark">
              {nudge.note}
            </Text>
          ) : null}
        </View>
        {timeLabel || prioritySwatch ? (
          <View className="items-end gap-1">
            {timeLabel ? (
              <View className="rounded-full bg-[#FFE6B0] px-[9px] py-1">
                <Text className="font-mono text-[11px] text-[#8A5A08]">{timeLabel}</Text>
              </View>
            ) : null}
            {priorityTag && prioritySwatch ? (
              <View
                style={{ backgroundColor: prioritySwatch.tile }}
                className="rounded-full px-[9px] py-1"
              >
                <Text style={{ color: prioritySwatch.text }} className="font-mono text-[11px]">
                  {priorityTag.label}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Swipeable>
  );
}
