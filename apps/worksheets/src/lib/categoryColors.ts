import { Goal } from '@/data/templates';
import { WorksheetMode } from '@/lib/shapes';

/**
 * Category palette (DESIGN_STRATEGY A0). Four skill families, each with a solid
 * accent (labels/tape/icons) and a soft tint (backgrounds only — never text).
 * Keyed off a template's goal or the worksheet mode so cards, goal pages and
 * the editor header all colour-code consistently. Contrast note: the solid
 * colours are for small accents/tape; body text stays foreground on white.
 */
export type Category = 'perception' | 'fine-motor' | 'handwriting' | 'pre-writing';

export interface CategoryStyle {
  /** Solid accent — decorative surfaces only (tape, icons, borders). */
  color: string;
  /** Darker shade of the accent for TEXT on white/tinted backgrounds —
   * every value clears WCAG AA 4.5:1 there (the mid accents don't). */
  textColor: string;
  /** Soft background tint (rgba, ~12% alpha). */
  tint: string;
  label: string;
}

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  perception: { color: '#3B82F6', textColor: '#1D4ED8', tint: 'rgba(59,130,246,0.12)', label: 'Visual perception' },
  'fine-motor': { color: '#22C55E', textColor: '#15803D', tint: 'rgba(34,197,94,0.12)', label: 'Fine motor' },
  handwriting: { color: '#8B5CF6', textColor: '#6D28D9', tint: 'rgba(139,92,246,0.12)', label: 'Handwriting' },
  'pre-writing': { color: '#F59E0B', textColor: '#92400E', tint: 'rgba(245,158,11,0.13)', label: 'Pre-writing' },
};

const GOAL_CATEGORY: Record<Goal, Category> = {
  'letter-reversals': 'handwriting',
  'handwriting-practice': 'handwriting',
  'pre-writing-strokes': 'pre-writing',
  'scissor-skills': 'fine-motor',
  'attention-scanning': 'perception',
  'copying-patterns': 'perception',
};

const MODE_CATEGORY: Record<WorksheetMode, Category> = {
  find: 'perception', pattern: 'perception', count: 'perception', copy: 'perception',
  sequence: 'perception', oddOneOut: 'perception', mirror: 'perception',
  figureGround: 'perception', closure: 'perception', visualScanning: 'perception',
  traceName: 'handwriting', handwriting: 'handwriting',
  maze: 'fine-motor', scissorSkills: 'fine-motor',
  connectDots: 'pre-writing', tracingPaths: 'pre-writing', pixelArt: 'fine-motor',
};

export function categoryForGoal(goal: Goal): Category {
  return GOAL_CATEGORY[goal];
}

export function categoryForMode(mode: WorksheetMode): Category {
  return MODE_CATEGORY[mode];
}

/** A template's primary category, from its first goal (falls back to mode). */
export function categoryForTemplate(t: { goals: Goal[]; mode: WorksheetMode }): Category {
  return t.goals.length ? GOAL_CATEGORY[t.goals[0]] : MODE_CATEGORY[t.mode];
}

export function styleForTemplate(t: { goals: Goal[]; mode: WorksheetMode }): CategoryStyle {
  return CATEGORY_STYLES[categoryForTemplate(t)];
}
