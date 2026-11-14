import { describe, expect, it } from 'vitest';
import { clampBlocks, covers, invertBlocks, mergeBlocks, overlaps, snapTo5, subtractBlocks } from './intervals';
import type { TimeBlock } from './types';

const b = (day: number, start: number, end: number): TimeBlock => ({ day: day as TimeBlock['day'], start, end });

describe('snapTo5', () => {
  it('snaps to nearest 5', () => {
    expect(snapTo5(452)).toBe(450);
    expect(snapTo5(453)).toBe(455);
    expect(snapTo5(455)).toBe(455);
  });
});

describe('overlaps', () => {
  it('detects overlap on same day only', () => {
    expect(overlaps(b(0, 600, 630), b(0, 615, 645))).toBe(true);
    expect(overlaps(b(0, 600, 630), b(1, 615, 645))).toBe(false);
  });
  it('adjacent blocks do not overlap (end exclusive)', () => {
    expect(overlaps(b(0, 600, 630), b(0, 630, 660))).toBe(false);
  });
});

describe('mergeBlocks', () => {
  it('coalesces overlapping and adjacent blocks', () => {
    expect(mergeBlocks([b(0, 600, 630), b(0, 630, 660), b(0, 650, 700)])).toEqual([b(0, 600, 700)]);
  });
  it('keeps different days separate', () => {
    expect(mergeBlocks([b(0, 600, 630), b(1, 600, 630)])).toEqual([b(0, 600, 630), b(1, 600, 630)]);
  });
  it('drops degenerate blocks', () => {
    expect(mergeBlocks([b(0, 600, 600), b(0, 700, 650)])).toEqual([]);
  });
});

describe('subtractBlocks', () => {
  it('splits a block around a hole', () => {
    expect(subtractBlocks([b(0, 600, 700)], [b(0, 630, 645)])).toEqual([b(0, 600, 630), b(0, 645, 700)]);
  });
  it('removes fully covered blocks', () => {
    expect(subtractBlocks([b(0, 600, 700)], [b(0, 550, 720)])).toEqual([]);
  });
  it('ignores other days', () => {
    expect(subtractBlocks([b(0, 600, 700)], [b(1, 600, 700)])).toEqual([b(0, 600, 700)]);
  });
  it('handles multiple holes', () => {
    expect(subtractBlocks([b(0, 600, 700)], [b(0, 610, 620), b(0, 640, 650)])).toEqual([
      b(0, 600, 610),
      b(0, 620, 640),
      b(0, 650, 700),
    ]);
  });
});

describe('invertBlocks', () => {
  it('complements within window across all 5 days', () => {
    const inv = invertBlocks([b(0, 600, 700)], { start: 450, end: 930 });
    expect(inv).toContainEqual(b(0, 450, 600));
    expect(inv).toContainEqual(b(0, 700, 930));
    for (let d = 1; d < 5; d++) expect(inv).toContainEqual(b(d, 450, 930));
    expect(inv).toHaveLength(6);
  });
  it('full-day block leaves nothing on that day', () => {
    const inv = invertBlocks([b(2, 450, 930)], { start: 450, end: 930 });
    expect(inv.filter((x) => x.day === 2)).toEqual([]);
  });
});

describe('clampBlocks', () => {
  it('clamps to window and drops outside blocks', () => {
    expect(clampBlocks([b(0, 400, 500), b(0, 940, 990)], { start: 450, end: 930 })).toEqual([b(0, 450, 500)]);
  });
});

describe('covers', () => {
  it('true when union contains target', () => {
    expect(covers([b(0, 600, 630), b(0, 630, 700)], b(0, 610, 690))).toBe(true);
  });
  it('false when a gap exists', () => {
    expect(covers([b(0, 600, 630), b(0, 640, 700)], b(0, 610, 690))).toBe(false);
  });
});
