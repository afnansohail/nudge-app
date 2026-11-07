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

/**
 * The next time the clock shows hours:minutes: today if that time is still
 * ahead, otherwise tomorrow. Used for a nudge that has a time but no date.
 */
export function nextTimeOfDay(hours: number, minutes: number, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  if (today.getTime() > now.getTime()) return today.getTime();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes).getTime();
}

/** Keeps typed number text in range, so "45" or "0" does not silently become 1. */
export function clampNumberText(text: string, min: number, max: number): string {
  const n = Number.parseInt(text, 10);
  if (Number.isNaN(n)) return String(min);
  return String(Math.min(max, Math.max(min, n)));
}
