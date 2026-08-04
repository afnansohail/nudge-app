import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { getSerializedDb } from '@/db/serialized-db';
import { applyNudgeNotificationResponse } from '@/lib/notification-action-handler';
import { BACKGROUND_NOTIFICATION_TASK } from '@/lib/notifications';
import { openDatabaseAsync } from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';

const LOG_TAG = '[nudge-background-task]';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn(LOG_TAG, 'received error', error);
    return;
  }
  if (!data || typeof data !== 'object' || !('actionIdentifier' in data)) {
    console.log(LOG_TAG, 'ignoring non-response payload', data);
    return;
  }

  const response = data as { actionIdentifier: string; notification: { date: number; request: { identifier: string } } };
  console.log(LOG_TAG, 'handling', response.actionIdentifier, 'for', response.notification.request.identifier);

  try {
    const rawDb = await openDatabaseAsync(DATABASE_NAME);
    const db = getSerializedDb(rawDb);
    await migrateDbIfNeeded(db);
    await applyNudgeNotificationResponse(db, response);
    console.log(LOG_TAG, 'done');
  } catch (taskError) {
    console.warn(LOG_TAG, 'failed to apply action', taskError);
  }
});
