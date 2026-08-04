import type { Nudge, NudgeList } from '@/lib/types';
import type * as NotificationsType from 'expo-notifications';
import { LogBox, Platform } from 'react-native';

const CHANNEL_ID = 'nudges';
const NUDGE_CATEGORY = 'nudge-actions';

export const ACTION_SNOOZE_1H = 'snooze-1h';
export const ACTION_SNOOZE_TOMORROW = 'snooze-tomorrow';
export const ACTION_MARK_DONE = 'mark-done';
export const BACKGROUND_NOTIFICATION_TASK = 'nudge-notification-response-task';

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
      {
        identifier: ACTION_MARK_DONE,
        buttonTitle: 'Done',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE_1H,
        buttonTitle: 'Snooze 1hr',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE_TOMORROW,
        buttonTitle: 'Snooze 1d',
        options: { opensAppToForeground: false },
      },
    ]);

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      } catch (error) {
        console.warn('[notifications] background task registration failed:', error);
      }
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

const NOTE_PREVIEW_MAX_CHARS = 100;

function truncateNotePreview(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length <= NOTE_PREVIEW_MAX_CHARS) return trimmed;
  const cut = trimmed.slice(0, NOTE_PREVIEW_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
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
        subtitle: list.name,
        body: nudge.note ? truncateNotePreview(nudge.note) : undefined,
        categoryIdentifier: NUDGE_CATEGORY,
        data: { nudgeId: nudge.id },
        sticky: true,
        autoDismiss: false,
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

export async function getInitialNotificationResponse(): Promise<NotificationsType.NotificationResponse | null> {
  if (!Notifications) return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) await Notifications.clearLastNotificationResponseAsync();
    return response;
  } catch (error) {
    console.warn('[notifications] could not read last response:', error);
    return null;
  }
}

export function attachNotificationResponseHandler(
  onResponse: (response: NotificationsType.NotificationResponse) => Promise<void>
): () => void {
  if (!Notifications) return () => {};

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => subscription.remove();
  } catch (error) {
    console.warn('[notifications] listener attach failed:', error);
    return () => {};
  }
}
