import * as listsDb from '@/db/lists';
import { claimNotificationAction, releaseNotificationAction } from '@/db/notification-action-log';
import * as nudgesDb from '@/db/nudges';
import {
  ACTION_MARK_DONE,
  ACTION_SNOOZE_1H,
  ACTION_SNOOZE_TOMORROW,
  presentNudgeNotificationNow,
  scheduleNudgeNotification,
} from '@/lib/notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

export type NudgeNotificationResponse = {
  actionIdentifier: string;
  notification: {
    date: number;
    request: {
      identifier: string;
      content?: { title?: string | null; subtitle?: string | null; body?: string | null };
    };
  };
};

function isNudgeAction(actionIdentifier: string): boolean {
  return (
    [ACTION_MARK_DONE, ACTION_SNOOZE_1H, ACTION_SNOOZE_TOMORROW] as string[]
  ).includes(actionIdentifier);
}

// Single source of truth for what a Done/Snooze notification action does to a
// nudge. Used by the headless background task, the cold-start (app launched
// by tapping an action) path, and the live in-app listener alike, so the
// mutation always happens the same way regardless of how the tap reached JS.
// Operates directly on SQLite (not the Zustand stores) since the headless
// task runs in its own JS instance with no store to update — callers running
// inside the live app must resync their stores from `db` afterward.
//
// On Android the native receiver dismisses the notification before this runs
// (see plugins/notification-actions). So if the action fails, we release the
// dedupe claim and show the notification again, so the user can see that it
// did not work and tap it again.
export async function applyNudgeNotificationResponse(
  db: SQLiteDatabase,
  response: NudgeNotificationResponse
): Promise<void> {
  const nudgeId = response.notification.request.identifier;
  const actionIdentifier = response.actionIdentifier;
  if (!isNudgeAction(actionIdentifier)) return; // e.g. a plain tap on the notification body

  const dedupeKey = `${nudgeId}:${actionIdentifier}:${response.notification.date}`;
  let claimed = false;
  try {
    claimed = await claimNotificationAction(db, dedupeKey);
    if (!claimed) return; // the other delivery path already handled this tap

    await applyNudgeAction(db, nudgeId, actionIdentifier);
  } catch (error) {
    console.warn('[notification-action-handler] failed to apply action', error);
    if (claimed) {
      await releaseNotificationAction(db, dedupeKey).catch((releaseError: unknown) =>
        console.warn('[notification-action-handler] failed to release claim', releaseError)
      );
    }
    await restoreNudgeNotificationAfterFailure(response);
  }
}

// Shows the notification again after a failed Done/Snooze. Also used by the
// headless task when it fails before it can call applyNudgeNotificationResponse
// (for example, when the database does not open).
export async function restoreNudgeNotificationAfterFailure(
  response: NudgeNotificationResponse
): Promise<void> {
  if (!isNudgeAction(response.actionIdentifier)) return;
  const { identifier, content } = response.notification.request;
  await presentNudgeNotificationNow(identifier, content ?? {});
}

async function applyNudgeAction(
  db: SQLiteDatabase,
  nudgeId: string,
  actionIdentifier: string
): Promise<void> {
  // A deleted nudge is not a failure: there is nothing to show again.
  const existing = await nudgesDb.getNudgeById(db, nudgeId);
  if (!existing) return;

  if (actionIdentifier === ACTION_MARK_DONE) {
    const { nudge } = await nudgesDb.completeNudge(db, nudgeId);
    const list = await listsDb.getListById(db, nudge.listId);
    if (list) await scheduleNudgeNotification(nudge, list);
    return;
  }

  const until =
    actionIdentifier === ACTION_SNOOZE_1H
      ? Date.now() + 60 * 60 * 1000
      : Date.now() + 24 * 60 * 60 * 1000;

  await nudgesDb.snoozeNudge(db, nudgeId, until);
  const nudge = await nudgesDb.getNudgeById(db, nudgeId);
  if (nudge) {
    const list = await listsDb.getListById(db, nudge.listId);
    if (list) await scheduleNudgeNotification(nudge, list);
  }
}
