import { WorksheetConfig, WorksheetData, generateWorksheet } from '@/lib/shapes';

/**
 * Deterministic worksheet generation for stable gallery thumbnails.
 *
 * The generation engine (shapes.ts) uses global Math.random throughout. Rather
 * than touching that engine, we temporarily swap Math.random for a seeded PRNG
 * for the duration of a single generateWorksheet() call, then restore it. This
 * gives every gallery card a fixed, repeatable preview while leaving the live
 * editor (and every existing generator) completely unchanged.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simple string → 32-bit hash so a template id can act as a stable seed. */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateWorksheetSeeded(config: WorksheetConfig, seed: number): WorksheetData {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return generateWorksheet(config);
  } finally {
    Math.random = original;
  }
}
