import { confirmDeleteNudge } from '@/lib/confirm-delete';
import { formatRecurrenceLabel } from '@/lib/recurrence';
import { getNudgeStatus } from '@/lib/status';
import type { Nudge } from '@/lib/types';
import { FAB_SHADOW, LIST_COLORS } from '@/theme/tokens';
import { Check, GripVertical, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { memo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// The callbacks get the nudge back, so a screen can pass one stable function
// for all rows. With stable callbacks, memo() skips rows that did not change.
// That matters on lists with hundreds of completed nudges.
type NudgeRowProps = {
  nudge: Nudge;
  timeLabel?: string;
  onToggleComplete: (nudge: Nudge) => void | Promise<void>;
  onDelete: (nudge: Nudge) => void;
  onPress: (nudge: Nudge) => void;
  onDragStart?: () => void;
  isDragging?: boolean;
  /**
   * Shows which list the nudge is in: a colored dot and the name at the start
   * of the time line. For screens that mix nudges from many lists.
   * Plain strings, not the list object, so memo() can compare them.
   */
  listName?: string;
  listDotColor?: string;
  /** The Overdue/Snoozed badge. Off on screens where every row has it. */
  showStatusBadge?: boolean;
  /**
   * The repeat label ("Monthly"). Off on the summary screens: it tells little
   * there, and the line also holds the list name.
   */
  showRecurrence?: boolean;
  /**
   * Enter/exit/layout animations. Turn off inside a recycling list
   * (FlashList): recycled rows must not replay enter animations, and layout
   * animations on many rows are expensive.
   */
  animateLayout?: boolean;
};

const ACTION_WIDTH = 96;
// After a tap on the checkbox, the check shows for this long before the row
// moves to "Nailed it". Without it, the row jumps away with no visible check.
const CHECK_FEEDBACK_MS = 300;

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

export const NudgeRow = memo(function NudgeRow({
  nudge,
  timeLabel,
  onToggleComplete,
  onDelete,
  onPress,
  onDragStart,
  isDragging,
  animateLayout = true,
  listName,
  listDotColor,
  showStatusBadge = true,
  showRecurrence = true,
}: NudgeRowProps) {
  const status = getNudgeStatus(nudge);
  const isDone = status === 'completed';
  // The id, not a boolean: FlashList reuses this component for other nudges.
  const [pendingDoneId, setPendingDoneId] = useState<string | null>(null);
  const isPendingDone = pendingDoneId === nudge.id;
  const showDone = isDone || isPendingDone;
  const isOverdue = status === 'missed';
  const isSnoozed = status === 'snoozed';
  const recurrenceLabel = showRecurrence
    ? formatRecurrenceLabel(nudge.recurrenceType, nudge.recurrenceParams)
    : null;
  const checkStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showDone ? 1 : 0, { duration: 150 }),
  }));
  const { colorScheme } = useColorScheme();
  const overdueSwatch = isOverdue ? LIST_COLORS.coral[colorScheme ?? 'light'] : null;
  const snoozedSwatch = isSnoozed ? LIST_COLORS.lavender[colorScheme ?? 'light'] : null;
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handleSwipeOpen = (direction: SwipeDirection) => {
    const close = () => swipeableRef.current?.close();
    if (direction === SwipeDirection.RIGHT) {
      close();
      onToggleComplete(nudge);
      return;
    }
    // Keep the red delete panel open while the dialog shows, so the user can
    // see which row they are about to delete.
    confirmDeleteNudge(
      nudge,
      () => {
        // Close first: FlashList recycles this row view for another nudge.
        close();
        onDelete(nudge);
      },
      close
    );
  };

  const handleCheckboxPress = () => {
    if (isDone) {
      onToggleComplete(nudge);
      return;
    }
    if (isPendingDone) return;
    setPendingDoneId(nudge.id);
    setTimeout(async () => {
      try {
        await onToggleComplete(nudge);
      } finally {
        // A repeating nudge stays in the list with its next date, so the
        // check must clear again.
        setPendingDoneId(null);
      }
    }, CHECK_FEEDBACK_MS);
  };

  return (
    <Animated.View
      entering={animateLayout ? FadeIn.duration(200) : undefined}
      exiting={animateLayout ? FadeOut.duration(220) : undefined}
      layout={animateLayout ? LinearTransition.duration(220) : undefined}
    >
    <Animated.View style={isDragging ? [FAB_SHADOW, { opacity: 0.97 }] : { opacity: 1 }}>
    <View
      className={isDragging ? 'overflow-hidden rounded-card bg-white dark:bg-night-surface' : undefined}
    >
    <Swipeable
      ref={swipeableRef}
      // Default threshold is half the panel (48px), so a small sideways drag
      // while scrolling could complete or delete a nudge. Commit only when
      // the action panel is fully filled.
      leftThreshold={ACTION_WIDTH}
      rightThreshold={ACTION_WIDTH}
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
      <Pressable
        onPress={isDone ? undefined : () => onPress(nudge)}
        className="flex-row items-center gap-3 px-3.5 py-3"
      >
        <Pressable
          onPress={handleCheckboxPress}
          // 22dp circle + 13dp on each side = 48dp touch target.
          hitSlop={13}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: showDone }}
          accessibilityLabel={isDone ? `Mark "${nudge.title}" not done` : `Complete "${nudge.title}"`}
          className={
            showDone
              ? 'h-[22px] w-[22px] items-center justify-center rounded-full bg-[#35A06A]'
              : 'h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#E4DCCE] dark:border-[#4A4339]'
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
                ? 'font-display-medium text-row text-muted line-through dark:text-muted-dark'
                : isOverdue
                  ? 'font-display-medium text-row text-danger dark:text-danger-dark'
                  : 'font-display-medium text-row text-ink dark:text-mist'
            }
          >
            {nudge.title}
          </Text>
          {nudge.note ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="font-display text-xs text-muted dark:text-muted-dark"
            >
              {nudge.note}
            </Text>
          ) : null}
          {listName ? (
            <View className="mt-0.5 flex-row items-center">
              <View
                style={{ backgroundColor: listDotColor }}
                className="mr-1.5 h-1.5 w-1.5 rounded-full"
              />
              {/* The name shrinks first, so the time stays readable. */}
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, maxWidth: '45%' }}
                className="font-mono text-caption text-muted dark:text-muted-dark"
              >
                {listName}
              </Text>
              {timeLabel ? (
                <Text
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                  className="font-mono text-caption text-muted dark:text-muted-dark"
                >
                  {` · ${timeLabel}`}
                  {recurrenceLabel ? ` · ${recurrenceLabel}` : ''}
                </Text>
              ) : null}
            </View>
          ) : timeLabel ? (
            <Text className="mt-0.5 font-mono text-caption text-muted dark:text-muted-dark">
              {timeLabel}
              {recurrenceLabel ? ` · ${recurrenceLabel}` : ''}
            </Text>
          ) : null}
        </View>
        {showStatusBadge && isOverdue && overdueSwatch ? (
          <View style={{ backgroundColor: overdueSwatch.tile }} className="rounded-full px-[9px] py-1">
            <Text style={{ color: overdueSwatch.text }} className="font-mono text-caption">
              Overdue
            </Text>
          </View>
        ) : null}
        {showStatusBadge && isSnoozed && snoozedSwatch ? (
          <View style={{ backgroundColor: snoozedSwatch.tile }} className="rounded-full px-[9px] py-1">
            <Text style={{ color: snoozedSwatch.text }} className="font-mono text-caption">
              Snoozed
            </Text>
          </View>
        ) : null}
        {onDragStart ? (
          <Pressable
            onLongPress={onDragStart}
            // The grip says "drag me", so start sooner than the 500ms default.
            delayLongPress={150}
            hitSlop={10}
            accessibilityLabel="Reorder"
            className="py-1 pl-1"
          >
            <GripVertical size={18} color="#C0B8AB" />
          </Pressable>
        ) : null}
      </Pressable>
    </Swipeable>
    </View>
    </Animated.View>
    </Animated.View>
  );
});
