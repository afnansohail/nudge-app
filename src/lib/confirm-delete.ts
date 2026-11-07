import { Alert } from 'react-native';

import type { Nudge } from '@/lib/types';

/**
 * Asks before a nudge is deleted. Deletes cannot be undone, so every delete
 * path (swipe and the trash button) goes through here.
 *
 * `onCancel` runs when the user taps Cancel or dismisses the dialog
 * (Android back button or a tap outside it).
 */
export function confirmDeleteNudge(
  nudge: Pick<Nudge, 'title' | 'recurrenceType'>,
  onConfirm: () => void,
  onCancel?: () => void
) {
  const repeats = nudge.recurrenceType !== 'none';
  Alert.alert(
    `Delete "${nudge.title}"?`,
    repeats
      ? "This stops it from repeating and cancels its reminders. This can't be undone."
      : "This cancels its reminder. This can't be undone.",
    [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true, onDismiss: onCancel }
  );
}
