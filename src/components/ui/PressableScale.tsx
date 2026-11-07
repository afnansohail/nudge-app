import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Strong ease-out: the press responds at once, then settles.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// 0.92 was heavy on full-width buttons. 0.96 is still clear on small ones.
const PRESSED_SCALE = 0.96;

export function PressableScale({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      // Spread first: the scale handlers below must not be replaced by a
      // caller's onPressIn/onPressOut. They call the caller's handler too.
      {...props}
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withTiming(PRESSED_SCALE, { duration: 100, easing: EASE_OUT });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150, easing: EASE_OUT });
        onPressOut?.(e);
      }}
    />
  );
}
