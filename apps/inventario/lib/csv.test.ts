// Tests for csv.
import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('renders header + rows, quoting only when needed', () => {
    const csv = toCsv([
      { id: 1, name: 'plain', note: 'has, comma' },
      { id: 2, name: 'quote "x"', note: null },
    ]);
    expect(csv).toBe('id,name,note\n1,plain,"has, comma"\n2,"quote ""x""",');
  });

  it('handles empty input and explicit columns', () => {
    expect(toCsv([])).toBe('');
    expect(toCsv([{ a: 1, b: 2 }], ['b'])).toBe('b\n2');
  });

  it('serializes dates as ISO', () => {
    const d = new Date('2026-07-03T00:00:00Z');
    expect(toCsv([{ at: d }])).toBe('at\n2026-07-03T00:00:00.000Z');
  });
});
