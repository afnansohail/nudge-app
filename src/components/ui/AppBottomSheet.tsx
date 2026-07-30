import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

type AppBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function AppBottomSheet({ visible, onClose, children }: AppBottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.duration(220)}
          exiting={SlideOutDown.duration(180)}
          className="rounded-t-[28px] bg-cream px-5 pb-8 pt-5 dark:bg-night-surface"
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
