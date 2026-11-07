import '@/global.css';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { useDb } from '@/db/use-db';
import { applyNudgeNotificationResponse } from '@/lib/notification-action-handler';
import {
  attachNotificationResponseHandler,
  ensureNotificationSetup,
  getInitialNotificationResponse,
  resyncFutureNudgeNotifications,
} from '@/lib/notifications';
import { useAppResetStore } from '@/store/app-reset-store';
import { useListsStore } from '@/store/lists-store';
import { useNudgesStore } from '@/store/nudges-store';
import { useSettingsStore } from '@/store/settings-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const generation = useAppResetStore((s) => s.generation);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider key={generation} databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
          <AppShell />
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const db = useDb();
  const { colorScheme, setColorScheme } = useColorScheme();

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
  const catchUpLapsed = useNudgesStore((s) => s.catchUpLapsed);
  const didResyncNotifications = useRef(false);

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
    let cancelled = false;

    const handleResponse = async (response: Parameters<typeof applyNudgeNotificationResponse>[1]) => {
      await applyNudgeNotificationResponse(db, response);
      if (cancelled) return;
      await Promise.all([loadLists(db), loadNudges(db)]);
    };

    getInitialNotificationResponse().then((response) => {
      if (response && !cancelled) handleResponse(response);
    });

    const unsubscribe = attachNotificationResponseHandler(handleResponse);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, loadLists, loadNudges]);

  useEffect(() => {
    if (!listsLoaded || !nudgesLoaded) return;

    const runCatchUp = () => catchUpLapsed(db, useListsStore.getState().lists);
    runCatchUp().finally(() => {
      // Once per launch, after catch-up has moved lapsed recurring nudges
      // forward. See resyncFutureNudgeNotifications for why.
      if (didResyncNotifications.current) return;
      didResyncNotifications.current = true;
      resyncFutureNudgeNotifications(
        useNudgesStore.getState().nudges,
        useListsStore.getState().lists
      );
    });

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
    <>
      {/* Explicit style, not "auto": "auto" follows the system theme, but the
          app can override it in Settings. Dark icons on the light theme. */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="list/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="list/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nudge/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nudge/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nudges/[status]" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
