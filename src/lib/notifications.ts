import type { Nudge, NudgeList } from '@/lib/types';
import type * as NotificationsType from 'expo-notifications';
import { LogBox, Platform } from 'react-native';

const CHANNEL_ID = 'nudges';
const NUDGE_CATEGORY = 'nudge-actions';

export const ACTION_SNOOZE_1H = 'snooze-1h';
export const ACTION_SNOOZE_TOMORROW = 'snooze-tomorrow';
export const ACTION_MARK_DONE = 'mark-done';

LogBox.ignoreLogs([
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

let Notifications: typeof NotificationsType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('[notifications] expo-notifications unavailable in this runtime:', error);
}

export async function ensureNotificationSetup(): Promise<void> {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Nudges',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    await Notifications.setNotificationCategoryAsync(NUDGE_CATEGORY, [
      { identifier: ACTION_MARK_DONE, buttonTitle: 'Done' },
      { identifier: ACTION_SNOOZE_1H, buttonTitle: 'Snooze 1hr' },
      { identifier: ACTION_SNOOZE_TOMORROW, buttonTitle: 'Snooze 1d' },
    ]);

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (error) {
    console.warn('[notifications] setup failed, continuing without notifications:', error);
  }
}

export async function getNotificationPermissionStatus(): Promise<boolean | null> {
  if (!Notifications) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('[notifications] could not read permission status:', error);
    return null;
  }
}

export async function cancelNudgeNotification(nudge: Pick<Nudge, 'id'>): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(nudge.id);
    await Notifications.dismissNotificationAsync(nudge.id);
  } catch (error) {
    console.warn('[notifications] cancel failed:', error);
  }
}

export async function cancelAllNudgeNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[notifications] cancel all failed:', error);
  }
}

export async function scheduleNudgeNotification(
  nudge: Nudge,
  list: Pick<NudgeList, 'name'>
): Promise<string | null> {
  if (!Notifications) return null;
  await cancelNudgeNotification(nudge);

  if (nudge.completedAt !== null) return null;
  const fireAt = nudge.snoozedUntil ?? nudge.nextOccurrenceAt ?? nudge.dueAt;
  if (fireAt === null) return null;

  const fireDate = new Date(Math.max(fireAt, Date.now() + 1000));

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: nudge.id,
      content: {
        title: nudge.title,
        body: list.name,
        categoryIdentifier: NUDGE_CATEGORY,
        data: { nudgeId: nudge.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: CHANNEL_ID,
      },
    });
  } catch (error) {
    console.warn('[notifications] schedule failed:', error);
    return null;
  }
}

export function attachNotificationResponseHandler(handlers: {
  onSnooze: (nudgeId: string, until: number) => Promise<void>;
  onComplete: (nudgeId: string) => Promise<void>;
}): () => void {
  if (!Notifications) return () => {};

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const nudgeId = response.notification.request.identifier;
        const actionId = response.actionIdentifier;

        if (actionId === ACTION_SNOOZE_1H) {
          await handlers.onSnooze(nudgeId, Date.now() + 60 * 60 * 1000);
        } else if (actionId === ACTION_SNOOZE_TOMORROW) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          await handlers.onSnooze(nudgeId, tomorrow.getTime());
        } else if (actionId === ACTION_MARK_DONE) {
          await handlers.onComplete(nudgeId);
        }
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.warn('[notifications] listener attach failed:', error);
    return () => {};
  }
}
