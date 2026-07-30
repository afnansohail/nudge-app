import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { useColorScheme } from 'nativewind';
import '@/global.css';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { useDb } from '@/db/use-db';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { useSettingsStore } from '@/store/settings-store';
import { ensureNotificationSetup, attachNotificationResponseHandler } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
          <AppShell />
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const db = useDb();
  const { setColorScheme } = useColorScheme();

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  const listsLoaded = useListsStore((s) => s.loaded);
  const nudgesLoaded = useNudgesStore((s) => s.loaded);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadLists = useListsStore((s) => s.load);
  const loadNudges = useNudgesStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);
  const themePreference = useSettingsStore((s) => s.settings.themePreference);
  const completeNudge = useNudgesStore((s) => s.complete);
  const snoozeNudge = useNudgesStore((s) => s.snooze);
  const catchUpLapsed = useNudgesStore((s) => s.catchUpLapsed);

  useEffect(() => {
    loadLists(db);
    loadNudges(db);
    loadSettings(db);
    ensureNotificationSetup();
  }, [db, loadLists, loadNudges, loadSettings]);

  useEffect(() => {
    setColorScheme(themePreference);
  }, [themePreference, setColorScheme]);

  useEffect(() => {
    return attachNotificationResponseHandler({
      onSnooze: async (nudgeId, until) => {
        const nudge = useNudgesStore.getState().nudges.find((n) => n.id === nudgeId);
        if (!nudge) return;
        const list = useListsStore.getState().lists.find((l) => l.id === nudge.listId);
        if (!list) return;
        await snoozeNudge(db, list, nudgeId, until);
      },
      onComplete: async (nudgeId) => {
        const nudge = useNudgesStore.getState().nudges.find((n) => n.id === nudgeId);
        if (!nudge) return;
        const list = useListsStore.getState().lists.find((l) => l.id === nudge.listId);
        if (!list) return;
        await completeNudge(db, list, nudgeId);
      },
    });
  }, [db, snoozeNudge, completeNudge]);

  useEffect(() => {
    if (!listsLoaded || !nudgesLoaded) return;

    const runCatchUp = () => catchUpLapsed(db, useListsStore.getState().lists);
    runCatchUp();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCatchUp();
    });
    return () => subscription.remove();
  }, [db, listsLoaded, nudgesLoaded, catchUpLapsed]);

  const ready = fontsLoaded && listsLoaded && nudgesLoaded && settingsLoaded;

  const hideSplash = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="list/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="list/[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="nudge/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="nudge/[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
