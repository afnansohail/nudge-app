import { LIST_ICONS } from '@/constants/list-icons';
import type { NudgeList } from '@/lib/types';
import { FAB_SHADOW, LIST_COLORS } from '@/theme/tokens';
import { ChevronRight, GripVertical } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

type ListRowProps = {
  list: NudgeList;
  count: number;
  onPress: () => void;
  isLast?: boolean;
  onDragStart?: () => void;
  isDragging?: boolean;
};

export function ListRow({ list, count, onPress, isLast, onDragStart, isDragging }: ListRowProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const swatch = LIST_COLORS[list.color][scheme];
  const Icon = LIST_ICONS[list.icon];

  return (
    <View style={isDragging ? [FAB_SHADOW, { opacity: 0.97 }] : { opacity: 1 }}>
      <View className={isDragging ? 'overflow-hidden rounded-3xl bg-white dark:bg-night-surface' : undefined}>
        <Pressable
          onPress={onPress}
          className={`flex-row items-center gap-3 px-3.5 py-3 ${
            isLast || isDragging ? '' : 'border-b border-border dark:border-border-dark'
          }`}
        >
          <View
            style={{ backgroundColor: swatch.tile }}
            className="h-8 w-8 items-center justify-center rounded-[11px]"
          >
            <Icon size={15} color={swatch.dot} />
          </View>
          <Text className="flex-1 font-display-medium text-[15.5px] text-ink dark:text-mist">
            {list.name}
          </Text>
          <Text className="font-mono text-[12.5px] text-muted dark:text-muted-dark">{count}</Text>
          <ChevronRight size={14} color="#CFC7B9" />
          {onDragStart ? (
            <Pressable onLongPress={onDragStart} hitSlop={10} className="py-1 pl-1">
              <GripVertical size={18} color="#C0B8AB" />
            </Pressable>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
