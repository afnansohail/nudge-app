import { View, Text } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

// A short pop from 90%, not ZoomIn's grow from nothing.
const NUMBER_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(220);

type StatTileProps = {
  value: number | string;
  label: string;
  tileColor: string;
  textColor: string;
};

export function StatTile({ value, label, tileColor, textColor }: StatTileProps) {
  return (
    <View
      style={{ backgroundColor: tileColor }}
      className="h-[82px] justify-between rounded-card px-3.5 py-3"
    >
      {/* Keyed on value so a change re-mounts the number with a pop instead of a static jump-cut.
          className must stay on the plain Text — nativewind doesn't interop Animated.Text. */}
      <Animated.View key={value} entering={NUMBER_ENTER}>
        <Text style={{ color: textColor }} className="font-display-semibold text-title">
          {value}
        </Text>
      </Animated.View>
      <Text style={{ color: textColor }} className="font-display-medium text-sm">
        {label}
      </Text>
    </View>
  );
}
