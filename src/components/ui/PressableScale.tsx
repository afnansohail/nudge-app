import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({ style, ...props }: PressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withTiming(0.92, { duration: 100 });
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150 });
        props.onPressOut?.(e);
      }}
      {...props}
    />
  );
}
