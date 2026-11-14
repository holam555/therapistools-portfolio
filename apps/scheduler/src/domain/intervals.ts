// Interval algebra on TimeBlock lists. All functions are pure and treat
// blocks on different days as independent. Blocks with start >= end are
// ignored as degenerate.

import type { Minutes, TimeBlock } from './types';

export function snapTo5(min: Minutes): Minutes {
  return Math.round(min / 5) * 5;
}

export function overlaps(a: TimeBlock, b: TimeBlock): boolean {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

/** Sort by (day, start) and coalesce overlapping or adjacent blocks per day. */
export function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const valid = blocks.filter((b) => b.start < b.end);
  const sorted = [...valid].sort((a, b) => a.day - b.day || a.start - b.start);
  const out: TimeBlock[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && last.day === b.day && b.start <= last.end) {
      if (b.end > last.end) last.end = b.end;
    } else {
      out.push({ ...b });
    }
  }
  return out;
}

/** base minus the union of `minus`, per day. Result is merged and sorted. */
export function subtractBlocks(base: TimeBlock[], minus: TimeBlock[]): TimeBlock[] {
  const mergedMinus = mergeBlocks(minus);
  const out: TimeBlock[] = [];
  for (const b of mergeBlocks(base)) {
    let pieces: TimeBlock[] = [{ ...b }];
    for (const m of mergedMinus) {
      if (m.day !== b.day) continue;
      const next: TimeBlock[] = [];
      for (const p of pieces) {
        if (!(m.start < p.end && p.start < m.end)) {
          next.push(p);
          continue;
        }
        if (p.start < m.start) next.push({ day: p.day, start: p.start, end: m.start });
        if (m.end < p.end) next.push({ day: p.day, start: m.end, end: p.end });
      }
      pieces = next;
    }
    out.push(...pieces);
  }
  return out;
}

/** Complement of `blocks` within the daily window, across all 5 days. */
export function invertBlocks(
  blocks: TimeBlock[],
  window: { start: Minutes; end: Minutes },
): TimeBlock[] {
  const full: TimeBlock[] = [0, 1, 2, 3, 4].map((day) => ({
    day: day as TimeBlock['day'],
    start: window.start,
    end: window.end,
  }));
  return subtractBlocks(full, blocks);
}

/** Clamp blocks to the daily window, dropping anything fully outside. */
export function clampBlocks(
  blocks: TimeBlock[],
  window: { start: Minutes; end: Minutes },
): TimeBlock[] {
  return blocks
    .map((b) => ({ ...b, start: Math.max(b.start, window.start), end: Math.min(b.end, window.end) }))
    .filter((b) => b.start < b.end);
}

/** True if the union of `cover` fully contains `target`. */
export function covers(cover: TimeBlock[], target: TimeBlock): boolean {
  return subtractBlocks([target], cover).length === 0;
}
