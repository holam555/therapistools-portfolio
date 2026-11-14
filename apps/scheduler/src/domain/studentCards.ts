/*
 * Builds the printable "who sees this student, when" card: one row per
 * service, sorted by time of day, the way a teacher reads a wall card.
 *
 * Student numbers only - a card is meant to be printed and handed to a
 * classroom teacher, so it must never carry a name.
 */

import type { Student, Workspace } from './types';

export interface CardRow {
  provider: string;
  days: string;
  time: string;
}

export interface StudentCard {
  /** Numeric display id, e.g. "1" - never a name. */
  studentId: string;
  rows: CardRow[];
}

/** Single day reads as a word; several days abbreviate, as on a hand-written card. */
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const DAY_SHORT = ['M', 'T', 'W', 'Th', 'Fri'] as const;

export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return DAY_FULL[sorted[0]];
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

/**
 * "9-9:30", "9:50-10:10", "10:30-11:00" - a start on the hour drops its
 * ":00" the way people write it by hand, the end time always keeps it.
 */
export function formatCardTime(start: number, end: number): string {
  const hour = (m: number) => {
    const h = Math.floor(m / 60) % 12;
    return h === 0 ? 12 : h;
  };
  const startText = start % 60 === 0 ? `${hour(start)}` : `${hour(start)}:${String(start % 60).padStart(2, '0')}`;
  const endText = `${hour(end)}:${String(end % 60).padStart(2, '0')}`;
  return `${startText}-${endText}`;
}

/** Discipline is what a teacher recognises ("OT", "Speech"); fall back to the row name. */
function providerLabel(ws: Workspace, providerId: string): string {
  const p = ws.providers.find((x) => x.id === providerId);
  if (!p) return 'Unknown';
  return p.discipline?.trim() || p.name;
}

interface Slot {
  providerId: string;
  day: number;
  start: number;
  end: number;
  recurrence: string;
  parity: string;
}

/**
 * Joins sessions that run straight into each other - two 15-minute OT blocks
 * at 10:30 and 10:45 are one 10:30-11:00 visit as far as the classroom is
 * concerned, and reading them as two lines makes a card look busier than the
 * day really is. Only the same provider on the same day in the same week can
 * join, and only where one ends exactly as the next begins.
 */
function mergeConsecutive(slots: Slot[]): Slot[] {
  const byLane = new Map<string, Slot[]>();
  for (const slot of slots) {
    const lane = [slot.providerId, slot.day, slot.recurrence, slot.parity].join('|');
    const found = byLane.get(lane);
    if (found) found.push(slot);
    else byLane.set(lane, [slot]);
  }

  const merged: Slot[] = [];
  for (const lane of byLane.values()) {
    lane.sort((a, b) => a.start - b.start);
    let run = { ...lane[0] };
    for (const next of lane.slice(1)) {
      // <= rather than === also folds any accidental overlap into one block.
      if (next.start <= run.end) run.end = Math.max(run.end, next.end);
      else {
        merged.push(run);
        run = { ...next };
      }
    }
    merged.push(run);
  }
  return merged;
}

function rowsForStudent(ws: Workspace, student: Student): CardRow[] {
  const slots: Slot[] = ws.sessions
    .filter((s) => s.studentIds.includes(student.id))
    .map((s) => ({
      providerId: s.providerId,
      day: s.day,
      start: s.start,
      end: s.start + s.durationMin,
      recurrence: s.recurrence,
      parity: s.weekParity ?? '',
    }));

  // Same provider at the same clock time collapses across days: four identical
  // 10:30 LS blocks read as "M, T, Th, Fri", not four rows.
  const groups = new Map<string, { slot: Slot; days: number[] }>();
  for (const slot of mergeConsecutive(slots)) {
    const key = [slot.providerId, slot.start, slot.end, slot.recurrence, slot.parity].join('|');
    const found = groups.get(key);
    if (found) found.days.push(slot.day);
    else groups.set(key, { slot, days: [slot.day] });
  }

  return [...groups.values()]
    .sort(
      (a, b) =>
        a.slot.start - b.slot.start ||
        providerLabel(ws, a.slot.providerId).localeCompare(providerLabel(ws, b.slot.providerId)),
    )
    .map(({ slot, days }) => {
      // A fortnightly session says so, or the card would overstate the service.
      const everyOther = slot.recurrence === 'biweekly' ? ` (week ${slot.parity})` : '';
      return {
        provider: providerLabel(ws, slot.providerId),
        days: formatDays(days) + everyOther,
        time: formatCardTime(slot.start, slot.end),
      };
    });
}

/**
 * One card per student, in student-number order. Students with nothing
 * booked are left out - a card with no services is not worth printing.
 */
export function buildStudentCards(ws: Workspace, onlyStudentIds?: string[]): StudentCard[] {
  const wanted = onlyStudentIds ? new Set(onlyStudentIds) : null;
  return ws.students
    .filter((s) => !wanted || wanted.has(s.id))
    .map((s) => ({ studentId: s.displayId, rows: rowsForStudent(ws, s) }))
    .filter((c) => c.rows.length > 0)
    .sort((a, b) => (Number(a.studentId) || 0) - (Number(b.studentId) || 0) || a.studentId.localeCompare(b.studentId));
}
