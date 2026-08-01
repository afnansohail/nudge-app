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

export function formatNudgeDate(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(includesDifferentYear(timestamp, now) ? { year: 'numeric' as const } : {}),
  });
}

export function formatNudgeTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
