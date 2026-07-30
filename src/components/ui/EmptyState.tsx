import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type EmptyStateProps = {
  Icon: LucideIcon;
  title: string;
  subtitle?: string;
};

export function EmptyState({ Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-3 px-8 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface">
        <Icon size={28} color="#A69E92" />
      </View>
      <Text className="text-center font-display-semibold text-lg text-ink dark:text-mist">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-center font-display text-sm text-muted dark:text-muted-dark">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
