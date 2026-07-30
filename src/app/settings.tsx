import { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Alert, DevSettings } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { useDb } from '@/db/use-db';
import { X, Bell, Trash2 } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settings-store';
import { PressableScale } from '@/components/ui/PressableScale';
import { goBack } from '@/lib/navigation';
import { getNotificationPermissionStatus, cancelAllNudgeNotifications } from '@/lib/notifications';
import { DATABASE_NAME } from '@/db/migrations';
import { SUBTLE_SHADOW } from '@/theme/tokens';
import type { ThemePreference } from '@/lib/types';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const db = useDb();
  const themePreference = useSettingsStore((s) => s.settings.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getNotificationPermissionStatus().then(setPermissionGranted);
  }, []);

  const resetAllData = () => {
    Alert.alert('Reset all data', 'This deletes every list and nudge on this device. For dev use only.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await cancelAllNudgeNotifications();
          await db.closeAsync();
          await deleteDatabaseAsync(DATABASE_NAME);
          DevSettings.reload();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-cream dark:bg-night">
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <PressableScale
          onPress={goBack}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#F1ECE3] dark:bg-night-surface"
        >
          <X size={16} color="#6B655C" />
        </PressableScale>
        <Text className="font-display-semibold text-base text-ink dark:text-mist">Settings</Text>
        <View className="w-9" />
      </View>

      <View className="gap-6 px-5 pt-6">
        <View>
          <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
            Appearance
          </Text>
          <View className="flex-row gap-1 rounded-full bg-[#F1ECE3] p-1 dark:bg-night-surface">
            {THEME_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setThemePreference(db, option.key)}
                style={themePreference === option.key ? SUBTLE_SHADOW : undefined}
                className={
                  themePreference === option.key
                    ? 'flex-1 items-center rounded-full bg-white py-2.5 dark:bg-night'
                    : 'flex-1 items-center rounded-full py-2.5'
                }
              >
                <Text
                  className={
                    themePreference === option.key
                      ? 'font-display-semibold text-sm text-ink dark:text-mist'
                      : 'font-display-medium text-sm text-muted dark:text-muted-dark'
                  }
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {permissionGranted === false && (
          <Pressable
            onPress={() => Linking.openSettings()}
            className="flex-row items-center gap-3 rounded-2xl bg-[#FFE6B0] px-4 py-3.5"
          >
            <Bell size={18} color="#8A5A08" />
            <View className="flex-1">
              <Text className="font-display-medium text-sm text-[#8A5A08]">
                Notifications are off
              </Text>
              <Text
                className="mt-0.5 font-display text-xs"
                style={{ color: 'rgba(138, 90, 8, 0.8)' }}
              >
                Timed nudges need this to reach you. Tap to enable.
              </Text>
            </View>
          </Pressable>
        )}

        {__DEV__ && (
          <View>
            <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-muted dark:text-muted-dark">
              Dev
            </Text>
            <Pressable
              onPress={resetAllData}
              className="flex-row items-center gap-3 rounded-2xl bg-[#FFD9D2] px-4 py-3.5"
            >
              <Trash2 size={18} color="#8E2F1A" />
              <Text className="font-display-medium text-sm text-[#8E2F1A]">Reset all data</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
