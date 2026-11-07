import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type FlatList,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const ITEM_HEIGHT = 44;
// Rows visible above and below the selected row.
const VISIBLE_REST = 2;
// A looping wheel repeats its items about this many times. The user starts
// in the middle, so they can never reach an end in practice.
const LOOP_TARGET_ROWS = 1200;

type WheelPickerProps = {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Wrap around: after the last item comes the first again. */
  loop?: boolean;
  width: number;
  textStyle?: TextStyle;
  indicatorStyle?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * A scroll wheel like the one in react-native-ui-datepicker, but it can loop.
 * Rows are: VISIBLE_REST spacers, then the items (repeated if looping), then
 * VISIBLE_REST spacers. So the row at data index i is centered when the
 * scroll offset is (i - VISIBLE_REST) * ITEM_HEIGHT, and "virtual index" k
 * (the k-th real row) is centered at offset k * ITEM_HEIGHT.
 */
export const WheelPicker = memo(function WheelPicker({
  items,
  selectedIndex,
  onChange,
  loop = false,
  width,
  textStyle,
  indicatorStyle,
  accessibilityLabel,
}: WheelPickerProps) {
  const count = items.length;
  const cycles = loop ? Math.max(3, Math.ceil(LOOP_TARGET_ROWS / count)) : 1;
  const middleCycle = Math.floor(cycles / 2);
  const totalRows = count * cycles;

  const data = useMemo(
    () => Array.from({ length: totalRows + VISIBLE_REST * 2 }, (_, i) => i),
    [totalRows]
  );

  const toVirtual = useCallback((index: number) => middleCycle * count + index, [middleCycle, count]);

  const listRef = useRef<FlatList<number>>(null);
  // Where the wheel starts. Read once; later changes scroll the list instead.
  const [initialVirtual] = useState(() => toVirtual(selectedIndex));
  const currentVirtual = useRef(initialVirtual);
  const momentumStarted = useRef(false);
  const scrollY = useSharedValue(initialVirtual * ITEM_HEIGHT);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const scrollToVirtual = useCallback((virtual: number, animated: boolean) => {
    currentVirtual.current = virtual;
    listRef.current?.scrollToOffset({ offset: virtual * ITEM_HEIGHT, animated });
  }, []);

  // The value changed from outside (not by scrolling this wheel).
  useEffect(() => {
    if (((currentVirtual.current % count) + count) % count === selectedIndex) return;
    scrollToVirtual(toVirtual(selectedIndex), false);
  }, [selectedIndex, count, toVirtual, scrollToVirtual]);

  const settle = useCallback(
    (offsetY: number) => {
      const virtual = Math.min(totalRows - 1, Math.max(0, Math.round(offsetY / ITEM_HEIGHT)));
      const index = virtual % count;
      currentVirtual.current = virtual;
      // Far from the middle: jump to the same value in the middle cycle.
      // Same labels at the same place, so the user sees no change.
      if (loop && Math.abs(Math.floor(virtual / count) - middleCycle) > cycles / 4) {
        scrollToVirtual(toVirtual(index), false);
      }
      if (index !== selectedIndex) onChange(index);
    },
    [totalRows, count, loop, middleCycle, cycles, selectedIndex, onChange, scrollToVirtual, toVirtual]
  );

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    momentumStarted.current = false;
    settle(event.nativeEvent.contentOffset.y);
  };

  // A slow drag can end with no momentum phase, so no momentum-end event.
  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setTimeout(() => {
      if (!momentumStarted.current) settle(offsetY);
    }, 50);
  };

  return (
    <View
      style={{ width, height: ITEM_HEIGHT * (VISIBLE_REST * 2 + 1) }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[selectedIndex] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        const next = selectedIndex + step;
        if (!loop && (next < 0 || next >= count)) return;
        onChange((next + count) % count);
      }}
    >
      <View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, right: 0, top: ITEM_HEIGHT * VISIBLE_REST, height: ITEM_HEIGHT },
          indicatorStyle,
        ]}
      />
      <Animated.FlatList
        ref={listRef}
        data={data}
        keyExtractor={(row) => String(row)}
        renderItem={({ item: row }) => (
          <WheelRow
            row={row}
            label={row < VISIBLE_REST || row >= totalRows + VISIBLE_REST ? '' : items[(row - VISIBLE_REST) % count]}
            scrollY={scrollY}
            textStyle={textStyle}
          />
        )}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={initialVirtual}
        initialNumToRender={VISIBLE_REST * 2 + 5}
        maxToRenderPerBatch={12}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={() => {
          momentumStarted.current = true;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
      />
    </View>
  );
});

const WheelRow = memo(function WheelRow({
  row,
  label,
  scrollY,
  textStyle,
}: {
  row: number;
  label: string;
  scrollY: SharedValue<number>;
  textStyle?: TextStyle;
}) {
  // Same fade as the library wheel: each row away from the center is 1/3 as
  // opaque as the one before it.
  const style = useAnimatedStyle(() => {
    const distance = Math.abs((row - VISIBLE_REST) * ITEM_HEIGHT - scrollY.value) / ITEM_HEIGHT;
    return {
      opacity: interpolate(distance, [0, 1, 2, 3], [1, 1 / 3, 1 / 9, 1 / 27], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View style={[{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.Text style={textStyle}>{label}</Animated.Text>
    </Animated.View>
  );
});
