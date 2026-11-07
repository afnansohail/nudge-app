import { Text } from 'react-native';

/**
 * The label above a form field. Sentence case on purpose: form labels are
 * often questions ("When should I nudge?"), and long text in capitals with
 * wide letter spacing is hard to read.
 *
 * Short section headers in lists and settings ("Upcoming", "Backup") stay
 * uppercase mono; that is a different job (scanning, not reading).
 */
export function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 font-display-medium text-sm text-muted dark:text-muted-dark">
      {children}
    </Text>
  );
}
