// plugins/notification-actions/withInstantNotificationActions.js
//
// Registers NudgeNotificationsService (a subclass of expo-notifications'
// NotificationsService) so that Done/Snooze taps dismiss the notification
// natively at once, instead of after the headless JS task boots.
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_CLASS = 'NudgeNotificationsService';
const NOTIFICATION_EVENT_ACTION = 'expo.modules.notifications.NOTIFICATION_EVENT';

function withServiceSourceFile(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const packagePath = config.android.package.replace(/\./g, '/');
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, `${SERVICE_CLASS}.kt`),
        path.join(javaDir, `${SERVICE_CLASS}.kt`)
      );
      return config;
    },
  ]);
}

function withServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication.receiver = (mainApplication.receiver ?? []).filter(
      (receiver) => receiver.$['android:name'] !== `.${SERVICE_CLASS}`
    );
    // The library's own receiver uses priority -1. expo-notifications sends
    // every event to the first receiver that matches, sorted by priority, so
    // priority 0 makes ours the designated one. We only take the
    // NOTIFICATION_EVENT action; boot/reschedule broadcasts stay with the
    // library receiver so they are not handled twice.
    mainApplication.receiver.push({
      $: {
        'android:name': `.${SERVICE_CLASS}`,
        'android:enabled': 'true',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          $: { 'android:priority': '0' },
          action: [{ $: { 'android:name': NOTIFICATION_EVENT_ACTION } }],
        },
      ],
    });
    return config;
  });
}

module.exports = function withInstantNotificationActions(config) {
  config = withServiceSourceFile(config);
  config = withServiceManifest(config);
  return config;
};
