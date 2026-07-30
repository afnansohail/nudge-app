import { Text, type PressableProps } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, variant = 'primary', disabled, ...props }: ButtonProps) {
  return (
    <PressableScale
      disabled={disabled}
      className={
        disabled
          ? 'items-center justify-center rounded-full bg-[#F1ECE3] px-6 py-4 dark:bg-night-surface'
          : variant === 'primary'
            ? 'items-center justify-center rounded-full bg-ink px-6 py-4 dark:bg-mist'
            : 'items-center justify-center rounded-full bg-cream px-6 py-4 dark:bg-night-surface'
      }
      {...props}
    >
      <Text
        className={
          disabled
            ? 'font-display-semibold text-base text-muted dark:text-muted-dark'
            : variant === 'primary'
              ? 'font-display-semibold text-base text-cream dark:text-night'
              : 'font-display-semibold text-base text-ink dark:text-mist'
        }
      >
        {label}
      </Text>
    </PressableScale>
  );
}
