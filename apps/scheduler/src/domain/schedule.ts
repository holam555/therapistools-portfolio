// Gap computation. effectiveBlockedTime is the single choke point that
// normalizes template polarity + overrides into canonical blocked intervals;
// nothing downstream ever sees polarity.

import { clampBlocks, invertBlocks, mergeBlocks, subtractBlocks } from './intervals';
import { paritiesOverlap, sessionScope } from './parity';
import type {
  Grade,
  Minutes,
  Session,
  Settings,
  StudentOverride,
  TimeBlock,
  WeekParity,
  Workspace,
} from './types';

export type IntervalKind = 'template-block' | 'override-block' | 'session' | 'gap' | 'unavailable';

export interface ScheduleInterval extends TimeBlock {
  kind: IntervalKind;
  sessionId?: string;
  label?: string;
  /** Session was hand-verified against the source schedule. */
  verified?: boolean;
}

/**
 * Canonical blocked time for a grade template + a student's overrides,
 * clamped to the school-day window. 'available' polarity templates are
 * inverted within the window; overrides then apply in order. Optional
 * template blocks (ELD, Writing…) bind only when their label appears in
 * `optIn` - the student's opted-in categories.
 */
export function effectiveBlockedTime(
  grade: Grade | undefined,
  overrides: StudentOverride[],
  settings: Settings,
  optIn: string[] = [],
): TimeBlock[] {
  const window = { start: settings.schoolDayStart, end: settings.schoolDayEnd };
  let blocked: TimeBlock[];
  if (!grade) {
    blocked = [];
  } else if (grade.templatePolarity === 'blocked') {
    const applies = grade.templateBlocks.filter(
      (b) => !b.optional || (b.label !== undefined && optIn.includes(b.label)),
    );
    blocked = clampBlocks(mergeBlocks(applies), window);
  } else {
    blocked = invertBlocks(clampBlocks(grade.templateBlocks, window), window);
  }
  for (const o of overrides) {
    const b = clampBlocks([o.block], window);
    blocked = o.kind === 'block' ? mergeBlocks([...blocked, ...b]) : subtractBlocks(blocked, b);
  }
  return blocked;
}

export function sessionOccursIn(session: Session, parity: WeekParity): boolean {
  return paritiesOverlap(sessionScope(session), parity);
}

export function sessionBlock(s: Session): TimeBlock {
  return { day: s.day, start: s.start, end: s.start + s.durationMin };
}

function sessionsToIntervals(sessions: Session[]): ScheduleInterval[] {
  return sessions.map((s) => ({
    ...sessionBlock(s),
    kind: 'session' as const,
    sessionId: s.id,
    verified: s.verified,
  }));
}

function sortIntervals(list: ScheduleInterval[]): ScheduleInterval[] {
  return list.sort((a, b) => a.day - b.day || a.start - b.start);
}

/**
 * A student's full week for one parity: template/override blocks, sessions
 * they're in, and whatever remains as gaps.
 */
export function computeStudentWeek(
  studentId: string,
  parity: WeekParity,
  ws: Workspace,
): ScheduleInterval[] {
  const student = ws.students.find((s) => s.id === studentId);
  if (!student) return [];
  const grade = ws.grades.find((g) => g.id === student.gradeId);
  const window = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };

  const blocked = effectiveBlockedTime(grade, student.overrides, ws.settings, student.optionalBlocks ?? []);
  const notBlocked = invertBlocks(blocked, window);
  const sessions = ws.sessions.filter(
    (s) => s.studentIds.includes(studentId) && sessionOccursIn(s, parity),
  );
  const sessionBlocks = sessions.map(sessionBlock);

  const out: ScheduleInterval[] = [];
  // Render blocked time from its labeled sources so each piece keeps its
  // "why" (Lunch, Math, …). Sources are intersected with the canonical
  // blocked set and deduped against each other; any canonically-blocked
  // remainder renders unlabeled, so the tiling always matches exactly.
  let covered: TimeBlock[] = [];
  const sources: Array<{ block: TimeBlock; label?: string; kind: IntervalKind }> = [
    ...student.overrides
      .filter((o) => o.kind === 'block')
      .map((o) => ({ block: o.block, label: o.label, kind: 'override-block' as const })),
    ...(grade && grade.templatePolarity === 'blocked'
      ? grade.templateBlocks.map((b) => ({
          block: b as TimeBlock,
          label: b.label,
          kind: 'template-block' as const,
        }))
      : []),
  ];
  for (const src of sources) {
    const pieces = subtractBlocks([src.block], [...notBlocked, ...sessionBlocks, ...covered]);
    for (const p of pieces) out.push({ ...p, kind: src.kind, label: src.label });
    covered = mergeBlocks([...covered, src.block]);
  }
  for (const rest of subtractBlocks(blocked, [...covered, ...sessionBlocks])) {
    out.push({ ...rest, kind: 'template-block' });
  }

  out.push(...sessionsToIntervals(sessions));
  for (const g of subtractBlocks(notBlocked, sessionBlocks)) {
    out.push({ ...g, kind: 'gap' });
  }
  return sortIntervals(out);
}

/**
 * Combined "every week" view of a student: all sessions from both parities
 * (biweekly ones carry their wk A/B tag via the session), blocked time, and
 * gaps that are free in BOTH weeks. Differences between weeks show up as the
 * tagged biweekly sessions themselves.
 */
export function computeStudentWeekAll(studentId: string, ws: Workspace): ScheduleInterval[] {
  const student = ws.students.find((s) => s.id === studentId);
  if (!student) return [];
  const grade = ws.grades.find((g) => g.id === student.gradeId);
  const window = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };

  const blocked = effectiveBlockedTime(grade, student.overrides, ws.settings, student.optionalBlocks ?? []);
  const notBlocked = invertBlocks(blocked, window);
  const sessions = ws.sessions.filter((s) => s.studentIds.includes(studentId));
  const sessionBlocks = sessions.map(sessionBlock);

  const out: ScheduleInterval[] = [];
  let covered: TimeBlock[] = [];
  const sources: Array<{ block: TimeBlock; label?: string; kind: IntervalKind }> = [
    ...student.overrides
      .filter((o) => o.kind === 'block')
      .map((o) => ({ block: o.block, label: o.label, kind: 'override-block' as const })),
    ...(grade && grade.templatePolarity === 'blocked'
      ? grade.templateBlocks
          .filter((b) => !b.optional || (b.label && (student.optionalBlocks ?? []).includes(b.label)))
          .map((b) => ({ block: b as TimeBlock, label: b.label, kind: 'template-block' as const }))
      : []),
  ];
  for (const src of sources) {
    const pieces = subtractBlocks([src.block], [...notBlocked, ...sessionBlocks, ...covered]);
    for (const p of pieces) out.push({ ...p, kind: src.kind, label: src.label });
    covered = mergeBlocks([...covered, src.block]);
  }
  for (const rest of subtractBlocks(blocked, [...covered, ...sessionBlocks])) {
    out.push({ ...rest, kind: 'template-block' });
  }
  out.push(...sessions.map((s) => ({ ...sessionBlock(s), kind: 'session' as const, sessionId: s.id, verified: s.verified })));
  for (const g of subtractBlocks(notBlocked, sessionBlocks)) out.push({ ...g, kind: 'gap' });
  return out.sort((a, b) => a.day - b.day || a.start - b.start);
}

/** Combined "every week" view of a provider: all availability, all sessions. */
export function computeProviderWeekAll(providerId: string, ws: Workspace): ScheduleInterval[] {
  const provider = ws.providers.find((p) => p.id === providerId);
  if (!provider) return [];
  const window = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  const available = clampBlocks(mergeBlocks(provider.availability), window);
  const sessions = ws.sessions.filter((s) => s.providerId === providerId);
  const sessionBlocks = sessions.map(sessionBlock);

  const out: ScheduleInterval[] = [];
  for (const u of invertBlocks(available, window)) out.push({ ...u, kind: 'unavailable' });
  out.push(...sessions.map((s) => ({ ...sessionBlock(s), kind: 'session' as const, sessionId: s.id, verified: s.verified })));
  for (const g of subtractBlocks(available, sessionBlocks)) out.push({ ...g, kind: 'gap' });
  return out.sort((a, b) => a.day - b.day || a.start - b.start);
}

/**
 * Why is this time blocked for this student? Searches student block-overrides
 * first, then the grade's labeled template blocks ('blocked' polarity only).
 */
export function blockedLabelAt(
  grade: Grade | undefined,
  overrides: StudentOverride[],
  block: TimeBlock,
  optIn: string[] = [],
): string | undefined {
  const ovr = overrides.find((o) => o.kind === 'block' && overlapsBlock(o.block, block));
  if (ovr) return ovr.label;
  if (grade?.templatePolarity === 'blocked') {
    return grade.templateBlocks.find(
      (b) =>
        b.label &&
        overlapsBlock(b, block) &&
        (!b.optional || optIn.includes(b.label)),
    )?.label;
  }
  return undefined;
}

function overlapsBlock(a: TimeBlock, b: TimeBlock): boolean {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

/**
 * A provider's full week for one parity: time outside availability is
 * 'unavailable', their sessions overlay, the rest of available time is gap.
 */
export function computeProviderWeek(
  providerId: string,
  parity: WeekParity,
  ws: Workspace,
): ScheduleInterval[] {
  const provider = ws.providers.find((p) => p.id === providerId);
  if (!provider) return [];
  const window = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };

  const available = clampBlocks(
    mergeBlocks(
      provider.availability.filter((a) => paritiesOverlap(a.weeks, parity)),
    ),
    window,
  );
  const sessions = ws.sessions.filter(
    (s) => s.providerId === providerId && sessionOccursIn(s, parity),
  );
  const sessionBlocks = sessions.map(sessionBlock);

  const out: ScheduleInterval[] = [];
  for (const u of invertBlocks(available, window)) out.push({ ...u, kind: 'unavailable' });
  out.push(...sessionsToIntervals(sessions));
  for (const g of subtractBlocks(available, sessionBlocks)) out.push({ ...g, kind: 'gap' });
  return sortIntervals(out);
}

/**
 * Sessions on other days that are the "same" session repeated daily: same
 * provider, time, length, students, note, and recurrence. Editing one can
 * then offer to update the whole week at once.
 */
export function findSiblingSessions(session: Session, ws: Workspace): Session[] {
  const ids = [...session.studentIds].sort().join();
  return ws.sessions.filter(
    (s) =>
      s.id !== session.id &&
      s.providerId === session.providerId &&
      s.start === session.start &&
      s.durationMin === session.durationMin &&
      s.recurrence === session.recurrence &&
      s.weekParity === session.weekParity &&
      (s.note ?? '') === (session.note ?? '') &&
      [...s.studentIds].sort().join() === ids,
  );
}

/** Available (gap) time for a provider in one parity - used by validation. */
export function providerAvailableBlocks(
  providerId: string,
  parity: WeekParity,
  ws: Workspace,
): TimeBlock[] {
  const provider = ws.providers.find((p) => p.id === providerId);
  if (!provider) return [];
  const window = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  return clampBlocks(
    mergeBlocks(provider.availability.filter((a) => paritiesOverlap(a.weeks, parity))),
    window,
  );
}

export type { Minutes };
