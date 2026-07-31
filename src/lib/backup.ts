import type { ListIconKey } from '@/constants/list-icons';
import type { Nudge, NudgeList, RecurrenceParams, RecurrenceType } from '@/lib/types';
import type { ListColorKey } from '@/theme/tokens';


export const EXPORT_VERSION = 1;

const RECURRENCE_TYPES: RecurrenceType[] = ['none', 'daily', 'weekly', 'monthly', 'every_n_days'];

export type ExportedList = {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
};

export type ExportedNudge = {
  id: string;
  listId: string;
  title: string;
  note: string | null;
  dueAt: number | null;
  recurrenceType: string;
  recurrenceParams: RecurrenceParams | null;
  nextOccurrenceAt: number | null;
  createdAt: number;
};

export type ExportPayload = {
  version: number;
  exportedAt: number;
  lists: ExportedList[];
  nudges: ExportedNudge[];
};

export function buildExportPayload(
  lists: NudgeList[],
  nudges: Nudge[],
  exportedAt: number
): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt,
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      icon: list.icon,
      color: list.color,
      createdAt: list.createdAt,
    })),
    nudges: nudges
      .filter((nudge) => nudge.completedAt === null)
      .map((nudge) => ({
        id: nudge.id,
        listId: nudge.listId,
        title: nudge.title,
        note: nudge.note,
        dueAt: nudge.dueAt,
        recurrenceType: nudge.recurrenceType,
        recurrenceParams: nudge.recurrenceParams,
        nextOccurrenceAt: nudge.nextOccurrenceAt,
        createdAt: nudge.createdAt,
      })),
  };
}

export type ParseImportResult =
  | { ok: true; payload: ExportPayload }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseImportPayload(json: string): ParseImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'This doesn’t look like a Nudge backup file.' };
  }
  if (typeof parsed.version !== 'number' || parsed.version !== EXPORT_VERSION) {
    return { ok: false, error: 'This backup file is from an unsupported app version.' };
  }
  if (!Array.isArray(parsed.lists) || !Array.isArray(parsed.nudges)) {
    return { ok: false, error: 'This doesn’t look like a Nudge backup file.' };
  }

  return {
    ok: true,
    payload: {
      version: parsed.version,
      exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : 0,
      lists: parsed.lists as ExportedList[],
      nudges: parsed.nudges as ExportedNudge[],
    },
  };
}

export type SanitizedList = {
  originalId: string;
  name: string;
  icon: ListIconKey;
  color: ListColorKey;
  createdAt: number;
};

export function sanitizeImportedLists(
  rawLists: unknown[],
  validIcons: ReadonlySet<string>,
  validColors: ReadonlySet<string>,
  fallbackIcon: ListIconKey,
  fallbackColor: ListColorKey
): SanitizedList[] {
  const sanitized: SanitizedList[] = [];
  for (const raw of rawLists) {
    if (!isPlainObject(raw)) continue;
    if (typeof raw.id !== 'string' || typeof raw.name !== 'string') continue;
    if (typeof raw.icon !== 'string' || typeof raw.color !== 'string') continue;

    sanitized.push({
      originalId: raw.id,
      name: raw.name,
      icon: validIcons.has(raw.icon) ? (raw.icon as ListIconKey) : fallbackIcon,
      color: validColors.has(raw.color) ? (raw.color as ListColorKey) : fallbackColor,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    });
  }
  return sanitized;
}

export type SanitizedNudge = {
  originalListId: string;
  title: string;
  note: string | null;
  dueAt: number | null;
  recurrenceType: RecurrenceType;
  recurrenceParams: RecurrenceParams | null;
  nextOccurrenceAt: number | null;
  createdAt: number;
};

export function sanitizeImportedNudges(
  rawNudges: unknown[],
  validOriginalListIds: ReadonlySet<string>
): SanitizedNudge[] {
  const sanitized: SanitizedNudge[] = [];
  for (const raw of rawNudges) {
    if (!isPlainObject(raw)) continue;
    if (typeof raw.listId !== 'string' || !validOriginalListIds.has(raw.listId)) continue;
    if (typeof raw.title !== 'string') continue;
    if (typeof raw.recurrenceType !== 'string') continue;
    if (!RECURRENCE_TYPES.includes(raw.recurrenceType as RecurrenceType)) continue;

    sanitized.push({
      originalListId: raw.listId,
      title: raw.title,
      note: typeof raw.note === 'string' ? raw.note : null,
      dueAt: typeof raw.dueAt === 'number' ? raw.dueAt : null,
      recurrenceType: raw.recurrenceType as RecurrenceType,
      recurrenceParams: isPlainObject(raw.recurrenceParams)
        ? (raw.recurrenceParams as RecurrenceParams)
        : null,
      nextOccurrenceAt: typeof raw.nextOccurrenceAt === 'number' ? raw.nextOccurrenceAt : null,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    });
  }
  return sanitized;
}

export type SanitizedImportBundle = {
  lists: SanitizedList[];
  nudges: SanitizedNudge[];
};

// Nudges are sanitized against the lists that *survived* sanitization, not the
// raw payload — a nudge pointing at a list entry that itself got dropped
// (missing name, wrong types, etc.) is an orphan and must be dropped too.
export function sanitizeImportPayload(
  payload: ExportPayload,
  validIcons: ReadonlySet<string>,
  validColors: ReadonlySet<string>,
  fallbackIcon: ListIconKey,
  fallbackColor: ListColorKey
): SanitizedImportBundle {
  const lists = sanitizeImportedLists(
    payload.lists,
    validIcons,
    validColors,
    fallbackIcon,
    fallbackColor
  );
  const validListIds = new Set(lists.map((list) => list.originalId));
  const nudges = sanitizeImportedNudges(payload.nudges, validListIds);
  return { lists, nudges };
}
