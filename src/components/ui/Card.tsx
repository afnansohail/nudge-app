import { View, type ViewProps } from 'react-native';
import { SUBTLE_SHADOW } from '@/theme/tokens';

export function Card({
  className = '',
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-[22px] bg-white dark:bg-night-surface ${className}`}
      style={[SUBTLE_SHADOW, style]}
      {...props}
    />
  );
}
