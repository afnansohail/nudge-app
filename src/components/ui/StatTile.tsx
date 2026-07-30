import { View, Text } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

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
      className="h-[82px] justify-between rounded-[20px] px-3.5 py-3"
    >
      {/* Keyed on value so a change re-mounts the number with a pop instead of a static jump-cut.
          className must stay on the plain Text — nativewind doesn't interop Animated.Text. */}
      <Animated.View key={value} entering={ZoomIn.duration(220)}>
        <Text style={{ color: textColor }} className="font-display-semibold text-[27px]">
          {value}
        </Text>
      </Animated.View>
      <Text style={{ color: textColor }} className="font-display-medium text-[13.5px]">
        {label}
      </Text>
    </View>
  );
}
