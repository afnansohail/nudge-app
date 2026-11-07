export function includesDifferentYear(timestamp: number, now: number = Date.now()): boolean {
  return new Date(timestamp).getFullYear() !== new Date(now).getFullYear();
}

export function isSameCalendarDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

// toLocaleDateString/toLocaleTimeString build a new Intl formatter on every
// call, which is slow on Hermes. A long list formats hundreds of dates per
// render, so we make each formatter once and reuse it.
let dateFormatter: Intl.DateTimeFormat | null = null;
let dateWithYearFormatter: Intl.DateTimeFormat | null = null;
let timeFormatter: Intl.DateTimeFormat | null = null;

export function formatNudgeDate(timestamp: number, now: number = Date.now()): string {
  if (includesDifferentYear(timestamp, now)) {
    dateWithYearFormatter ??= new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return dateWithYearFormatter.format(timestamp);
  }
  dateFormatter ??= new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return dateFormatter.format(timestamp);
}

export function formatNudgeTime(timestamp: number): string {
  timeFormatter ??= new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  return timeFormatter.format(timestamp);
}

export function formatNudgeDateTime(timestamp: number, now: number = Date.now()): string {
  return `${formatNudgeDate(timestamp, now)} · ${formatNudgeTime(timestamp)}`;
}

export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  return {
    hours: Number.isFinite(hours) ? hours : 9,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

export function formatTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
