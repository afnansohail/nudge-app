import * as listsDb from '@/db/lists';
import { claimNotificationAction } from '@/db/notification-action-log';
import * as nudgesDb from '@/db/nudges';
import {
  ACTION_MARK_DONE,
  ACTION_SNOOZE_1H,
  ACTION_SNOOZE_TOMORROW,
  scheduleNudgeNotification,
} from '@/lib/notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

export type NudgeNotificationResponse = {
  actionIdentifier: string;
  notification: {
    date: number;
    request: { identifier: string };
  };
};

// Single source of truth for what a Done/Snooze notification action does to a
// nudge. Used by the headless background task, the cold-start (app launched
// by tapping an action) path, and the live in-app listener alike, so the
// mutation always happens the same way regardless of how the tap reached JS.
// Operates directly on SQLite (not the Zustand stores) since the headless
// task runs in its own JS instance with no store to update — callers running
// inside the live app must resync their stores from `db` afterward.
export async function applyNudgeNotificationResponse(
  db: SQLiteDatabase,
  response: NudgeNotificationResponse
): Promise<void> {
  try {
    const nudgeId = response.notification.request.identifier;
    const actionIdentifier = response.actionIdentifier;

    const isKnownAction = (
      [ACTION_MARK_DONE, ACTION_SNOOZE_1H, ACTION_SNOOZE_TOMORROW] as string[]
    ).includes(actionIdentifier);
    if (!isKnownAction) return; // e.g. a plain tap on the notification body

    const dedupeKey = `${nudgeId}:${actionIdentifier}:${response.notification.date}`;
    const claimed = await claimNotificationAction(db, dedupeKey);
    if (!claimed) return;

    if (actionIdentifier === ACTION_MARK_DONE) {
      const { nudge } = await nudgesDb.completeNudge(db, nudgeId);
      const list = await listsDb.getListById(db, nudge.listId);
      if (list) await scheduleNudgeNotification(nudge, list);
      return;
    }

    const until =
      actionIdentifier === ACTION_SNOOZE_1H
        ? Date.now() + 60 * 60 * 1000
        : actionIdentifier === ACTION_SNOOZE_TOMORROW
          ? Date.now() + 24 * 60 * 60 * 1000
          : null;
    if (until === null) return;

    await nudgesDb.snoozeNudge(db, nudgeId, until);
    const nudge = await nudgesDb.getNudgeById(db, nudgeId);
    if (nudge) {
      const list = await listsDb.getListById(db, nudge.listId);
      if (list) await scheduleNudgeNotification(nudge, list);
    }
  } catch (error) {
    console.warn('[notification-action-handler] failed to apply action', error);
  }
}
