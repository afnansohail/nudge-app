import { describe, it, expect } from 'vitest';
import { parseNoteLines } from '@/lib/notes';

describe('parseNoteLines', () => {
  it('parses a plain line as a single text segment', () => {
    const [line] = parseNoteLines('just a note');
    expect(line).toEqual([{ type: 'text', value: 'just a note' }]);
  });

  it('splits multiple lines', () => {
    const lines = parseNoteLines('one\ntwo\nthree');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual([{ type: 'text', value: 'one' }]);
    expect(lines[1]).toEqual([{ type: 'text', value: 'two' }]);
    expect(lines[2]).toEqual([{ type: 'text', value: 'three' }]);
  });

  it('detects an http(s) link surrounded by text', () => {
    const [line] = parseNoteLines('see https://example.com/path for details');
    expect(line).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', value: 'https://example.com/path', url: 'https://example.com/path' },
      { type: 'text', value: ' for details' },
    ]);
  });

  it('detects a www. link and adds a protocol for the url', () => {
    const [line] = parseNoteLines('check www.example.com');
    expect(line).toEqual([
      { type: 'text', value: 'check ' },
      { type: 'link', value: 'www.example.com', url: 'https://www.example.com' },
    ]);
  });

  it('strips trailing sentence punctuation from a link', () => {
    const [line] = parseNoteLines('go to https://example.com.');
    expect(line).toEqual([
      { type: 'text', value: 'go to ' },
      { type: 'link', value: 'https://example.com', url: 'https://example.com' },
      { type: 'text', value: '.' },
    ]);
  });
});
