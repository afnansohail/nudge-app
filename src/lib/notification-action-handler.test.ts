import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';

vi.mock('@/lib/notifications', () => ({
  ACTION_MARK_DONE: 'mark-done',
  ACTION_SNOOZE_1H: 'snooze-1h',
  ACTION_SNOOZE_TOMORROW: 'snooze-tomorrow',
  scheduleNudgeNotification: vi.fn(async () => 'scheduled'),
  presentNudgeNotificationNow: vi.fn(async () => undefined),
}));
vi.mock('@/db/notification-action-log', () => ({
  claimNotificationAction: vi.fn(async () => true),
  releaseNotificationAction: vi.fn(async () => undefined),
}));
vi.mock('@/db/nudges', () => ({
  getNudgeById: vi.fn(async (_db: unknown, id: string) => ({ id, listId: 'list-1' })),
  completeNudge: vi.fn(async (_db: unknown, id: string) => ({ nudge: { id, listId: 'list-1' } })),
  snoozeNudge: vi.fn(async () => undefined),
}));
vi.mock('@/db/lists', () => ({
  getListById: vi.fn(async () => ({ id: 'list-1', name: 'Inbox' })),
}));

const notifications = await import('@/lib/notifications');
const actionLog = await import('@/db/notification-action-log');
const nudgesDb = await import('@/db/nudges');
const { applyNudgeNotificationResponse, restoreNudgeNotificationAfterFailure } = await import(
  '@/lib/notification-action-handler'
);

const db = {} as SQLiteDatabase;

function makeResponse(actionIdentifier: string) {
  return {
    actionIdentifier,
    notification: {
      date: 100,
      request: {
        identifier: 'nudge-1',
        content: { title: 'Buy milk', subtitle: 'Inbox', body: 'Two litres' },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('applyNudgeNotificationResponse', () => {
  it('completes the nudge and does not restore the notification on success', async () => {
    await applyNudgeNotificationResponse(db, makeResponse('mark-done'));

    expect(nudgesDb.completeNudge).toHaveBeenCalledWith(db, 'nudge-1');
    expect(notifications.presentNudgeNotificationNow).not.toHaveBeenCalled();
    expect(actionLog.releaseNotificationAction).not.toHaveBeenCalled();
  });

  it('releases the claim and shows the notification again when the action fails', async () => {
    vi.mocked(nudgesDb.completeNudge).mockRejectedValueOnce(new Error('database is locked'));

    await applyNudgeNotificationResponse(db, makeResponse('mark-done'));

    expect(actionLog.releaseNotificationAction).toHaveBeenCalledWith(db, 'nudge-1:mark-done:100');
    expect(notifications.presentNudgeNotificationNow).toHaveBeenCalledWith('nudge-1', {
      title: 'Buy milk',
      subtitle: 'Inbox',
      body: 'Two litres',
    });
  });

  it('shows the notification again when the claim itself fails', async () => {
    vi.mocked(actionLog.claimNotificationAction).mockRejectedValueOnce(new Error('disk I/O error'));

    await applyNudgeNotificationResponse(db, makeResponse('snooze-1h'));

    expect(actionLog.releaseNotificationAction).not.toHaveBeenCalled();
    expect(notifications.presentNudgeNotificationNow).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the other delivery path already claimed the action', async () => {
    vi.mocked(actionLog.claimNotificationAction).mockResolvedValueOnce(false);

    await applyNudgeNotificationResponse(db, makeResponse('mark-done'));

    expect(nudgesDb.completeNudge).not.toHaveBeenCalled();
    expect(notifications.presentNudgeNotificationNow).not.toHaveBeenCalled();
  });

  it('does not show the notification again when the nudge was deleted', async () => {
    vi.mocked(nudgesDb.getNudgeById).mockResolvedValueOnce(null);

    await applyNudgeNotificationResponse(db, makeResponse('mark-done'));

    expect(nudgesDb.completeNudge).not.toHaveBeenCalled();
    expect(notifications.presentNudgeNotificationNow).not.toHaveBeenCalled();
  });

  it('ignores a plain tap on the notification body', async () => {
    await applyNudgeNotificationResponse(db, makeResponse('expo.modules.notifications.actions.DEFAULT'));

    expect(actionLog.claimNotificationAction).not.toHaveBeenCalled();
    expect(notifications.presentNudgeNotificationNow).not.toHaveBeenCalled();
  });
});

describe('restoreNudgeNotificationAfterFailure', () => {
  it('restores the notification for a Done/Snooze action', async () => {
    await restoreNudgeNotificationAfterFailure(makeResponse('snooze-tomorrow'));
    expect(notifications.presentNudgeNotificationNow).toHaveBeenCalledTimes(1);
  });

  it('does not restore anything for a plain tap', async () => {
    await restoreNudgeNotificationAfterFailure(
      makeResponse('expo.modules.notifications.actions.DEFAULT')
    );
    expect(notifications.presentNudgeNotificationNow).not.toHaveBeenCalled();
  });
});
