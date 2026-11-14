/*
 * Turns the pattern schedule into expected visits on real dates, and the
 * dated session log into answers: what happened today, how many minutes a
 * student has actually received this week and month, and which make-ups
 * are still owed.
 *
 * Counting rule (the user's choice): minutes count toward the period they
 * were DELIVERED in; a miss leaves a visible debt until a later delivery
 * clears it. A group session counts full minutes for every student.
 */

import { parityForDate } from './parity';
import { sessionOccursIn } from './schedule';
import type { GoalPeriod, Provider, SessionLog, Workspace } from './types';

/** The provider whose sessions drive the Today checklist. */
export const myProvider = (ws: Workspace): Provider | undefined =>
  ws.providers.find((p) => p.isMe) ?? ws.providers[0];

const parse = (iso: string): Date => new Date(`${iso}T12:00`);

/** Local-time ISO date, e.g. "2026-08-20". */
export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "1h 25m" / "45m" - reads better than raw minutes in totals. */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const toISO = isoDate;

/** Mon..Fri of the app's week -> 0..4; weekend -> null. */
export function dayIndexOf(dateISO: string): 0 | 1 | 2 | 3 | 4 | null {
  const js = parse(dateISO).getDay();
  return js >= 1 && js <= 5 ? ((js - 1) as 0 | 1 | 2 | 3 | 4) : null;
}

export interface DateRange {
  start: string; // inclusive
  end: string; // inclusive
}

export function weekRangeOf(dateISO: string): DateRange {
  const d = parse(dateISO);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISO(monday), end: toISO(sunday) };
}

export function monthRangeOf(dateISO: string): DateRange {
  const d = parse(dateISO);
  return {
    start: toISO(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

/** The period a goal is written in, anchored on the calendar. */
export function periodRangeOf(period: GoalPeriod, dateISO: string): DateRange {
  const d = parse(dateISO);
  const year = d.getFullYear();
  switch (period) {
    case 'weekly':
      return weekRangeOf(dateISO);
    case 'monthly':
      return monthRangeOf(dateISO);
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3) * 3;
      return { start: toISO(new Date(year, q, 1)), end: toISO(new Date(year, q + 3, 0)) };
    }
    case 'semesterly':
      return d.getMonth() < 6
        ? { start: `${year}-01-01`, end: `${year}-06-30` }
        : { start: `${year}-07-01`, end: `${year}-12-31` };
    case 'yearly':
      return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

export interface ExpectedVisit {
  sessionId: string;
  studentId: string;
  start: number;
  minutes: number;
}

/** The visits one provider is booked for on one real date, in time order. */
export function expectedVisits(ws: Workspace, dateISO: string, providerId: string): ExpectedVisit[] {
  const day = dayIndexOf(dateISO);
  if (day === null) return [];
  const parity = parityForDate(parse(dateISO), ws.settings);
  return ws.sessions
    .filter((s) => s.providerId === providerId && s.day === day && sessionOccursIn(s, parity))
    .flatMap((s) =>
      s.studentIds.map((studentId) => ({
        sessionId: s.id,
        studentId,
        start: s.start,
        minutes: s.durationMin,
      })),
    )
    .sort((a, b) => a.start - b.start);
}

export const findLog = (
  ws: Workspace,
  sessionId: string,
  studentId: string,
  dateISO: string,
): SessionLog | undefined =>
  ws.sessionLogs.find((l) => l.sessionId === sessionId && l.studentId === studentId && l.date === dateISO);

const inRange = (l: SessionLog, r: DateRange) => l.date >= r.start && l.date <= r.end;

/** Minutes actually given in a range - the number a mandate is met with. */
export const deliveredMinutes = (ws: Workspace, studentId: string, range: DateRange): number =>
  ws.sessionLogs
    .filter((l) => l.studentId === studentId && l.status === 'seen' && inRange(l, range))
    .reduce((sum, l) => sum + l.minutes, 0);

/** Missed-with-make-up logs that no delivery has cleared yet, oldest first. */
export function owedMakeups(ws: Workspace, studentId?: string): SessionLog[] {
  const cleared = new Set(ws.sessionLogs.filter((l) => l.makeupForId).map((l) => l.makeupForId));
  return ws.sessionLogs
    .filter(
      (l) =>
        l.status === 'missed' &&
        l.makeupNeeded &&
        !cleared.has(l.id) &&
        (!studentId || l.studentId === studentId),
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface GoalProgress {
  label: string; // e.g. "90 min/mo"
  period: GoalPeriod;
  target: number;
  delivered: number;
  met: boolean;
}

const PERIOD_ABBR: Record<GoalPeriod, string> = {
  weekly: 'wk',
  monthly: 'mo',
  quarterly: 'qtr',
  semesterly: 'sem',
  yearly: 'yr',
};

/**
 * Progress against each of MY direct goals for a student, measured over the
 * period each goal is written in. Falls back to every direct goal when the
 * student has none assigned to me, so progress never silently shows empty.
 */
export function goalProgress(ws: Workspace, studentId: string, todayISO: string): GoalProgress[] {
  const me = myProvider(ws);
  const student = ws.students.find((s) => s.id === studentId);
  const direct = (student?.serviceGoals ?? []).filter((g) => g.type === 'direct' && g.minutes);
  const mine = direct.filter((g) => g.providerId === me?.id);
  return (mine.length > 0 ? mine : direct).map((g) => {
    const period = g.period ?? 'weekly';
    const delivered = deliveredMinutes(ws, studentId, periodRangeOf(period, todayISO));
    return {
      label: `${g.minutes} min/${PERIOD_ABBR[period]}`,
      period,
      target: g.minutes!,
      delivered,
      met: delivered >= g.minutes!,
    };
  });
}

/** The next calendar day, ISO to ISO. */
const nextDay = (iso: string): string => {
  const d = parse(iso);
  d.setDate(d.getDate() + 1);
  return toISO(d);
};

/**
 * Minutes still expected from booked sessions between today and the end of
 * the range: every future booked visit, plus today's not-yet-logged ones.
 * A visit already logged - seen or missed - is no longer "planned": seen
 * minutes sit in delivered, and a missed visit will not deliver by itself.
 */
export function plannedMinutes(ws: Workspace, studentId: string, range: DateRange, todayISO: string): number {
  const me = myProvider(ws);
  if (!me) return 0;
  const from = todayISO > range.start ? todayISO : range.start;
  let total = 0;
  for (let d = from; d <= range.end; d = nextDay(d)) {
    for (const v of expectedVisits(ws, d, me.id)) {
      if (v.studentId !== studentId) continue;
      const log = findLog(ws, v.sessionId, v.studentId, d);
      // 'planned' reshapes the visit but keeps it ahead; anything else - seen,
      // missed, skipped - means these minutes are no longer on the calendar.
      if (log) {
        if (log.status === 'planned') total += log.minutes;
        continue;
      }
      total += v.minutes;
    }
  }
  // Day-specific additions that have no pattern session behind them.
  total += ws.sessionLogs
    .filter(
      (l) =>
        !l.sessionId &&
        l.status === 'planned' &&
        l.studentId === studentId &&
        l.date >= from &&
        l.date <= range.end,
    )
    .reduce((sum, l) => sum + l.minutes, 0);
  return total;
}

export interface GoalForecast extends GoalProgress {
  /** Minutes still on the calendar before the period ends. */
  planned: number;
  /** Delivered plus planned reaches the target. */
  willMeet: boolean;
  /** How many minutes the period ends short if nothing changes. */
  shortBy: number;
}

/** Progress plus a look ahead: met, on track with what is booked, or short. */
export function goalForecast(ws: Workspace, studentId: string, todayISO: string): GoalForecast[] {
  return goalProgress(ws, studentId, todayISO).map((g) => {
    const planned = g.met ? 0 : plannedMinutes(ws, studentId, periodRangeOf(g.period, todayISO), todayISO);
    const willMeet = g.met || g.delivered + planned >= g.target;
    return { ...g, planned, willMeet, shortBy: Math.max(0, g.target - g.delivered - planned) };
  });
}

/** Delivered minutes per week, most recent first, for the progress strip. */
export function weeklyDelivered(
  ws: Workspace,
  studentId: string,
  todayISO: string,
  weeks = 4,
): Array<{ weekStart: string; minutes: number }> {
  const out: Array<{ weekStart: string; minutes: number }> = [];
  let cursor = todayISO;
  for (let i = 0; i < weeks; i++) {
    const range = weekRangeOf(cursor);
    out.push({ weekStart: range.start, minutes: deliveredMinutes(ws, studentId, range) });
    const prev = parse(range.start);
    prev.setDate(prev.getDate() - 7);
    cursor = toISO(prev);
  }
  return out;
}
