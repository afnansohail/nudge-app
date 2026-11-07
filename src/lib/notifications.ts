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

  const fireAt = getNudgeFireAt(nudge);
  if (fireAt === null) return null;

  try {
    return await Notifications.scheduleNotificationAsync(
      buildNudgeNotificationRequest(Notifications, nudge, list, Math.max(fireAt, Date.now() + 1000))
    );
  } catch (error) {
    console.warn('[notifications] schedule failed:', error);
    return null;
  }
}

function getNudgeFireAt(nudge: Nudge): number | null {
  if (nudge.completedAt !== null) return null;
  return nudge.snoozedUntil ?? nudge.nextOccurrenceAt ?? nudge.dueAt;
}

function buildNudgeNotificationRequest(
  notifications: typeof NotificationsType,
  nudge: Nudge,
  list: Pick<NudgeList, 'name'>,
  fireAt: number
): NotificationsType.NotificationRequestInput {
  return {
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
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
      channelId: CHANNEL_ID,
    },
  };
}

// Schedules every future nudge notification again. Runs once per app launch.
//
// Why: expo-notifications sets its alarms again only when it receives the
// BOOT_COMPLETED or MY_PACKAGE_REPLACED broadcast. Some Android skins (seen on
// Realme UI) do not send these to apps without "Auto launch", so after a
// reboot or an app update the alarms are lost or stay in their old form
// (for example inexact, from before the exact-alarm permission). Scheduling
// with the same identifier replaces the old alarm.
//
// This only touches nudges that are due in the future. It never dismisses a
// notification that is on screen, and it does not show overdue nudges again.
export async function resyncFutureNudgeNotifications(
  nudges: Nudge[],
  lists: Pick<NudgeList, 'id' | 'name'>[]
): Promise<void> {
  if (!Notifications) return;
  const now = Date.now();
  const listById = new Map(lists.map((list) => [list.id, list]));

  for (const nudge of nudges) {
    const fireAt = getNudgeFireAt(nudge);
    const list = listById.get(nudge.listId);
    if (fireAt === null || fireAt <= now || !list) continue;
    try {
      await Notifications.scheduleNotificationAsync(
        buildNudgeNotificationRequest(Notifications, nudge, list, fireAt)
      );
    } catch (error) {
      console.warn('[notifications] resync failed for', nudge.id, error);
    }
  }
}

// Shows a nudge notification again at once. Used when a Done/Snooze action
// failed: the native receiver (NudgeNotificationsService) already dismissed
// the notification, so without this the user would lose it with no sign that
// the action did not work. The content comes from the tap response, not from
// the database, so this works even when the database is the thing that failed.
export async function presentNudgeNotificationNow(
  identifier: string,
  content: { title?: string | null; subtitle?: string | null; body?: string | null }
): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: content.title ?? undefined,
        subtitle: content.subtitle ?? undefined,
        body: content.body ?? undefined,
        categoryIdentifier: NUDGE_CATEGORY,
        data: { nudgeId: identifier },
        sticky: true,
        autoDismiss: false,
      },
      trigger: { channelId: CHANNEL_ID },
    });
  } catch (error) {
    console.warn('[notifications] could not restore notification:', error);
  }
}

export async function getInitialNotificationResponse():Promise<NotificationsType.NotificationResponse | null> {
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
