// Plain-text note body, with URLs auto-detected so the read-only display can
// render them as tappable links.

export type NoteSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; url: string };

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

function parseLineSegments(line: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: 'text', value: line.slice(lastIndex, start) });
    }

    let raw = match[0];
    let trailing = '';
    const trailingMatch = raw.match(TRAILING_PUNCTUATION);
    if (trailingMatch) {
      trailing = trailingMatch[0];
      raw = raw.slice(0, raw.length - trailing.length);
    }

    const url = raw.toLowerCase().startsWith('www.') ? `https://${raw}` : raw;
    segments.push({ type: 'link', value: raw, url });
    if (trailing) segments.push({ type: 'text', value: trailing });

    lastIndex = start + raw.length + trailing.length;
  }

  if (lastIndex < line.length) {
    segments.push({ type: 'text', value: line.slice(lastIndex) });
  }
  if (segments.length === 0) segments.push({ type: 'text', value: '' });

  return segments;
}

export function parseNoteLines(note: string): NoteSegment[][] {
  return note.split('\n').map(parseLineSegments);
}
