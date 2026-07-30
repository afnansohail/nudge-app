import { Text, type PressableProps } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, variant = 'primary', ...props }: ButtonProps) {
  return (
    <PressableScale
      className={
        variant === 'primary'
          ? 'items-center justify-center rounded-full bg-ink px-6 py-4 dark:bg-mist'
          : 'items-center justify-center rounded-full bg-cream px-6 py-4 dark:bg-night-surface'
      }
      {...props}
    >
      <Text
        className={
          variant === 'primary'
            ? 'font-display-semibold text-base text-cream dark:text-night'
            : 'font-display-semibold text-base text-ink dark:text-mist'
        }
      >
        {label}
      </Text>
    </PressableScale>
  );
}
