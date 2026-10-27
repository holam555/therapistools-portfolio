// Booking validation. Returns ALL conflicts so the booking UI can list every
// reason. Any conflict is a hard block (no override in Phase 1).

import { covers, overlaps } from './intervals';
import { paritiesOverlap, sessionScope } from './parity';
import { blockedLabelAt, effectiveBlockedTime, providerAvailableBlocks, sessionBlock } from './schedule';
import { myProvider } from './serviceLog';
import type {
  DayOfWeek,
  Minutes,
  Session,
  SessionLength,
  TimeBlock,
  WeekParity,
  WeekScope,
  Workspace,
} from './types';

export interface SessionDraft {
  providerId: string;
  studentIds: string[];
  day: DayOfWeek;
  start: Minutes;
  durationMin: SessionLength;
  recurrence: 'weekly' | 'biweekly';
  weekParity?: WeekParity;
}

export type Conflict =
  | { type: 'outside-school-day' }
  | { type: 'off-grid' }
  | { type: 'no-students' }
  | { type: 'provider-unavailable'; providerId: string }
  | { type: 'provider-busy'; providerId: string; sessionId: string }
  | { type: 'student-blocked'; studentId: string; label?: string }
  | { type: 'student-busy'; studentId: string; sessionId: string };

export function validateBooking(
  draft: SessionDraft,
  ws: Workspace,
  excludeSessionId?: string,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const block: TimeBlock = { day: draft.day, start: draft.start, end: draft.start + draft.durationMin };
  const scope: WeekScope = sessionScope(draft);

  if (draft.start % 5 !== 0) conflicts.push({ type: 'off-grid' });
  if (block.start < ws.settings.schoolDayStart || block.end > ws.settings.schoolDayEnd) {
    conflicts.push({ type: 'outside-school-day' });
  }
  if (draft.studentIds.length === 0) conflicts.push({ type: 'no-students' });

  // The parities this draft can occupy: weekly = both, biweekly = one.
  const parities: WeekParity[] = scope === 'both' ? ['A', 'B'] : [scope];

  // Provider must be on site for the whole block in every parity the draft occupies.
  const uncovered = parities.some(
    (p) => !covers(providerAvailableBlocks(draft.providerId, p, ws), block),
  );
  if (uncovered) conflicts.push({ type: 'provider-unavailable', providerId: draft.providerId });

  const others = ws.sessions.filter((s) => s.id !== excludeSessionId);

  for (const s of others) {
    if (!paritiesOverlap(sessionScope(s), scope)) continue;
    if (!overlaps(sessionBlock(s), block)) continue;
    if (s.providerId === draft.providerId) {
      conflicts.push({ type: 'provider-busy', providerId: draft.providerId, sessionId: s.id });
    }
    for (const studentId of draft.studentIds) {
      if (s.studentIds.includes(studentId)) {
        conflicts.push({ type: 'student-busy', studentId, sessionId: s.id });
      }
    }
  }

  for (const studentId of draft.studentIds) {
    const student = ws.students.find((st) => st.id === studentId);
    if (!student) continue;
    const grade = ws.grades.find((g) => g.id === student.gradeId);
    const optIn = student.optionalBlocks ?? [];
    const blocked = effectiveBlockedTime(grade, student.overrides, ws.settings, optIn);
    const hit = blocked.find((b) => overlaps(b, block));
    if (hit) {
      const label = blockedLabelAt(grade, student.overrides, block, optIn);
      conflicts.push({ type: 'student-blocked', studentId, label });
    }
  }

  return conflicts;
}

/**
 * A cross-provider overlap: the student is busy, but with a DIFFERENT provider.
 * Per user policy these are soft - bookable with a warning - since some services
 * (e.g. para support) legitimately overlap other providers' time.
 */
export function isCrossProviderOverlap(c: Conflict, draft: SessionDraft, ws: Workspace): boolean {
  if (c.type !== 'student-busy') return false;
  const other = ws.sessions.find((s) => s.id === c.sessionId);
  return other !== undefined && other.providerId !== draft.providerId;
}

/**
 * A colleague booked into the student's blocked time. The block is the
 * user's own planning constraint; other providers schedule around different
 * rules, and their imported reality often lands inside it. Per user policy
 * that is bookable with a warning - only the user's OWN sessions treat a
 * student block as hard.
 */
export function isOtherProviderIntoBlock(c: Conflict, draft: SessionDraft, ws: Workspace): boolean {
  if (c.type !== 'student-blocked') return false;
  return draft.providerId !== myProvider(ws)?.id;
}

/** Team rows (several people sharing one provider) legitimately overlap themselves. */
function isTeamSelfOverlap(c: Conflict, ws: Workspace): boolean {
  if (c.type !== 'provider-busy' && c.type !== 'student-busy') return false;
  const other = ws.sessions.find((s) => s.id === c.sessionId);
  if (!other) return false;
  return ws.providers.find((p) => p.id === other.providerId)?.isTeam === true;
}

/** Stable identity for a conflict, for comparing before/after an edit. */
export function conflictKey(c: Conflict): string {
  return [
    c.type,
    'studentId' in c ? c.studentId : '',
    'sessionId' in c ? c.sessionId : '',
    'providerId' in c ? c.providerId : '',
    'label' in c ? (c.label ?? '') : '',
  ].join('|');
}

/**
 * Conflicts the stored session already has today. When editing, these are
 * pre-existing reality (often from bulk imports) - they warn but never lock
 * the dialog; only conflicts the edit newly introduces block saving.
 */
export function existingConflictKeys(session: Session, ws: Workspace): Set<string> {
  const draft: SessionDraft = {
    providerId: session.providerId,
    studentIds: session.studentIds,
    day: session.day,
    start: session.start,
    durationMin: session.durationMin,
    recurrence: session.recurrence,
    weekParity: session.weekParity,
  };
  return new Set(validateBooking(draft, ws, session.id).map(conflictKey));
}

/** Split validation results into hard blockers and bookable-with-warning issues. */
export function partitionConflicts(
  conflicts: Conflict[],
  draft: SessionDraft,
  ws: Workspace,
  grandfathered: Set<string> = new Set(),
): { hard: Conflict[]; soft: Conflict[] } {
  const hard: Conflict[] = [];
  const soft: Conflict[] = [];
  for (const c of conflicts) {
    const isSoft =
      isCrossProviderOverlap(c, draft, ws) ||
      isOtherProviderIntoBlock(c, draft, ws) ||
      isTeamSelfOverlap(c, ws) ||
      grandfathered.has(conflictKey(c));
    (isSoft ? soft : hard).push(c);
  }
  return { hard, soft };
}

/** Human-readable conflict messages, using display IDs rather than internal ids. */
export function describeConflict(c: Conflict, ws: Workspace): string {
  const studentName = (id: string) =>
    `Student ${ws.students.find((s) => s.id === id)?.displayId ?? '?'}`;
  const sessionDesc = (id: string) => {
    const s = ws.sessions.find((x) => x.id === id);
    if (!s) return 'another session';
    const p = ws.providers.find((p) => p.id === s.providerId);
    return `${p?.name ?? 'a provider'}'s session`;
  };
  switch (c.type) {
    case 'outside-school-day':
      return 'Outside the school day';
    case 'off-grid':
      return 'Start time must be on a 5-minute mark';
    case 'no-students':
      return 'Select at least one student';
    case 'provider-unavailable':
      return 'Provider is not on site at this time';
    case 'provider-busy':
      return `Provider already has ${sessionDesc(c.sessionId)} here`;
    case 'student-blocked':
      return `${studentName(c.studentId)} is blocked${c.label ? `: ${c.label}` : ' (master schedule)'}`;
    case 'student-busy':
      return `${studentName(c.studentId)} is already in ${sessionDesc(c.sessionId)}`;
  }
}
