// Week A/B parity. A single anchor Monday in settings defines Week A;
// parity alternates every calendar week from there.

import type { Settings, WeekParity, WeekScope } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local-midnight Date for an ISO yyyy-mm-dd string. */
function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday 00:00 (local) of the week containing `date`. Weekend days belong to the preceding week. */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // Sun=0
  const daysSinceMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function parityForDate(date: Date, settings: Settings): WeekParity {
  const anchor = mondayOf(parseISODateLocal(settings.weekAAnchorMonday));
  const monday = mondayOf(date);
  const weeks = Math.round((monday.getTime() - anchor.getTime()) / (7 * MS_PER_DAY));
  // ((weeks % 2) + 2) % 2 keeps negative week offsets (dates before the anchor) correct
  return ((weeks % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

/**
 * Do two week scopes ever land on the same week? 'both' (weekly) collides
 * with everything; 'A' collides with 'A' and 'both'; 'A' vs 'B' never collide.
 */
export function paritiesOverlap(a: WeekScope | WeekParity, b: WeekScope | WeekParity): boolean {
  if (a === 'both' || b === 'both') return true;
  return a === b;
}

/** The week scope a session occupies, from its recurrence fields. */
export function sessionScope(s: { recurrence: 'weekly' | 'biweekly'; weekParity?: WeekParity }): WeekScope {
  return s.recurrence === 'weekly' ? 'both' : (s.weekParity ?? 'A');
}
