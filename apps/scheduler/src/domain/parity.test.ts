import { describe, expect, it } from 'vitest';
import { mondayOf, parityForDate, paritiesOverlap, sessionScope } from './parity';
import { DEFAULT_SETTINGS } from './types';

const settings = { ...DEFAULT_SETTINGS, weekAAnchorMonday: '2026-08-17' }; // a Monday

describe('mondayOf', () => {
  it('returns same day for a Monday', () => {
    expect(mondayOf(new Date(2026, 7, 17)).getDate()).toBe(17);
  });
  it('maps mid-week back to Monday', () => {
    expect(mondayOf(new Date(2026, 7, 20)).getDate()).toBe(17); // Thursday
  });
  it('maps Sunday back to previous Monday', () => {
    expect(mondayOf(new Date(2026, 7, 23)).getDate()).toBe(17);
  });
});

describe('parityForDate', () => {
  it('anchor week is A', () => {
    expect(parityForDate(new Date(2026, 7, 17), settings)).toBe('A');
    expect(parityForDate(new Date(2026, 7, 21), settings)).toBe('A'); // Friday same week
  });
  it('next week is B, alternating after', () => {
    expect(parityForDate(new Date(2026, 7, 24), settings)).toBe('B');
    expect(parityForDate(new Date(2026, 7, 31), settings)).toBe('A');
  });
  it('weeks before the anchor alternate correctly', () => {
    expect(parityForDate(new Date(2026, 7, 10), settings)).toBe('B');
    expect(parityForDate(new Date(2026, 7, 3), settings)).toBe('A');
  });
});

describe('paritiesOverlap - all scope pairs', () => {
  it.each([
    ['both', 'both', true],
    ['both', 'A', true],
    ['both', 'B', true],
    ['A', 'both', true],
    ['B', 'both', true],
    ['A', 'A', true],
    ['B', 'B', true],
    ['A', 'B', false],
    ['B', 'A', false],
  ] as const)('%s vs %s → %s', (a, b, expected) => {
    expect(paritiesOverlap(a, b)).toBe(expected);
  });
});

describe('sessionScope', () => {
  it('weekly → both', () => {
    expect(sessionScope({ recurrence: 'weekly' })).toBe('both');
  });
  it('biweekly → its parity', () => {
    expect(sessionScope({ recurrence: 'biweekly', weekParity: 'B' })).toBe('B');
  });
});
