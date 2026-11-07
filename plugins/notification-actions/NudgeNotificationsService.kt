// plugins/notification-actions/NudgeNotificationsService.kt
package com.afnansohail.nudgeapp

import android.content.Context
import android.content.Intent
import expo.modules.notifications.service.NotificationsService

/**
 * Replaces expo-notifications' default receiver (registered with a higher
 * intent-filter priority, so `findDesignatedBroadcastReceiver` picks it).
 *
 * When the user taps Done / Snooze on a nudge notification, we dismiss the
 * notification natively *before* handing off to the library. The library then
 * starts the headless JS task that writes to SQLite and reschedules. That JS
 * start-up takes seconds when the app process is cold, but the user no longer
 * waits for it: the notification is already gone.
 *
 * Action identifiers must match the ACTION_* constants in src/lib/notifications.ts.
 */
class NudgeNotificationsService : NotificationsService() {
  override fun onReceiveNotificationResponse(context: Context, intent: Intent) {
    try {
      val response = getNotificationResponseFromBroadcastIntent(intent)
      if (response.actionIdentifier in INSTANT_DISMISS_ACTIONS) {
        val identifier = response.notification.notificationRequest.identifier
        getPresentationDelegate(context).dismissNotifications(listOf(identifier))
      }
    } catch (e: Exception) {
      // Never block the real handling below because of the early dismiss.
      android.util.Log.w("NudgeNotifications", "early dismiss failed", e)
    }
    super.onReceiveNotificationResponse(context, intent)
  }

  companion object {
    private val INSTANT_DISMISS_ACTIONS = setOf("mark-done", "snooze-1h", "snooze-tomorrow")
  }
}
