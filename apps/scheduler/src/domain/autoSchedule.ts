// Phase 2: propose a provider's schedule from service-minute goals and real
// gaps. Pure functions - the Plan screen renders proposals for review, and
// booking them goes through the normal session store (two-sided blocking).
//
// Planning rules (user's): sessions start 8:15 or later; 15 minutes of
// breathing room between the provider's sessions; a 30-minute lunch held
// somewhere between 11:00 and 1:00 on every on-site day; and never schedule
// MORE than the mandated minutes - fractional weekly targets are hit exactly
// by alternating week-A/week-B lengths in the same slot.

import { clampBlocks, invertBlocks, subtractBlocks } from './intervals';
import { effectiveBlockedTime, providerAvailableBlocks, sessionBlock, sessionOccursIn } from './schedule';
import type {
  DayOfWeek,
  Minutes,
  ServiceGoal,
  SessionLength,
  Student,
  TimeBlock,
  WeekParity,
  Workspace,
} from './types';
import { SESSION_LENGTHS, groupKey } from './types';

export interface PlanRules {
  /** Minimum minutes between two of the provider's sessions. */
  bufferMin: number;
  /** Lunch length to hold free on each on-site day… */
  lunchMin: number;
  /** …somewhere inside this window (11:00-1:00 by default, anytime is fine). */
  lunchWindow: { start: Minutes; end: Minutes };
  /** No session starts before this time. */
  earliestStart: Minutes;
  /** Every session ends by this time (null = end of the on-site day). */
  latestEnd: Minutes | null;
  /** Shortest session the planner may propose (user's rule: 15). */
  minSessionLen: SessionLength;
  /** Auto-grouping: none (prefer individual), same grade, or within ±1 grade level. */
  autoGroup: 'none' | 'same-grade' | 'adjacent-grade';
  /** Largest group the planner may form (1 = individuals only). */
  maxGroupSize: number;
  /** Cap on group sessions per week (null = no limit). */
  maxGroups: number | null;
  /** Cap on individual sessions per week (null = no limit). */
  maxIndividuals: number | null;
  /** May proposals overlap OTHER providers' sessions (para-style support)? */
  allowProviderOverlap: boolean;
  /** Fractional weekly goals: false = exact via wk A/B alternation; true =
   * round up to a plain weekly session (22.5 → 25, slightly over-serving). */
  roundUpFractional: boolean;
  /** Days to fill first, in order ([3] = Thursdays before anything else).
   * Empty = no preference (balanced across days). */
  priorityDays: DayOfWeek[];
  /** When a student can't otherwise fit, allow shrinking the between-session
   * buffer around that one placement to this many minutes (null = never). */
  fallbackBufferMin: number | null;
  /** When a student can't otherwise fit, split a weekly session into two
   * shorter sessions on different days (e.g. 30 becomes 15 + 15). */
  allowSplitWhenStuck: boolean;
}

export const DEFAULT_PLAN_RULES: PlanRules = {
  bufferMin: 15,
  lunchMin: 30,
  lunchWindow: { start: 660, end: 780 },
  earliestStart: 495, // 8:15
  latestEnd: null,
  minSessionLen: 15,
  autoGroup: 'none',
  maxGroupSize: 3,
  maxGroups: null,
  maxIndividuals: null,
  allowProviderOverlap: false,
  roundUpFractional: false,
  priorityDays: [],
  fallbackBufferMin: null,
  allowSplitWhenStuck: false,
};

/**
 * A goal normalized to minutes per week, using the user's period definitions:
 * quarter = 2 months, semester = 4 months, school year ≈ 9 months (36 weeks),
 * month ≈ 4 weeks.
 */
export function weeklyGoalMinutes(goal: ServiceGoal): number {
  const m = goal.minutes ?? 0;
  switch (goal.period ?? 'monthly') {
    case 'weekly':
      return m;
    case 'monthly':
      return m / 4;
    case 'quarterly':
      return m / 8;
    case 'semesterly':
      return m / 16;
    case 'yearly':
      return m / 36;
  }
}

/** One planned recurring session shape. */
export type PlannedChunk =
  | { kind: 'weekly'; len: SessionLength }
  | { kind: 'biweekly'; len: SessionLength } // every other week
  | { kind: 'alternating'; lenA: SessionLength; lenB: SessionLength }; // same slot, different lengths

export function chunkWeeklyMinutes(c: PlannedChunk): number {
  if (c.kind === 'weekly') return c.len;
  if (c.kind === 'biweekly') return c.len / 2;
  return (c.lenA + c.lenB) / 2;
}

export function chunkSlotLength(c: PlannedChunk): SessionLength {
  if (c.kind === 'alternating') return Math.max(c.lenA, c.lenB) as SessionLength;
  return c.len;
}

/**
 * Split needed weekly minutes into chunks that sum EXACTLY to the need -
 * never over-serving. 30 → [weekly 30]; 22.5 → [alternating 25/20];
 * 7.5 → [biweekly 15]; 45 → [weekly 30, weekly 15]. Lengths below
 * `minLen` are never used (10 min/week under a 15-minute floor becomes a
 * biweekly 20). A remainder that can't be represented is returned as
 * `leftover` for the unmet report rather than silently rounded away.
 */
export function chunkNeededExact(
  needed: number,
  minLen: SessionLength = 10,
  roundUp = false,
): { chunks: PlannedChunk[]; leftover: number } {
  const isLegal = (n: number): n is SessionLength =>
    SESSION_LENGTHS.includes(n as SessionLength) && n >= minLen;
  const chunks: PlannedChunk[] = [];
  let rest = needed;
  while (rest >= 30) {
    chunks.push({ kind: 'weekly', len: 30 });
    rest -= 30;
  }
  if (rest <= 0.01) return { chunks, leftover: Math.max(0, rest) };

  if (roundUp) {
    const len = Math.min(30, Math.max(minLen, Math.ceil(rest / 5) * 5)) as SessionLength;
    chunks.push({ kind: 'weekly', len });
    return { chunks, leftover: 0 };
  }

  if (rest % 5 === 0 && isLegal(rest)) {
    chunks.push({ kind: 'weekly', len: rest as SessionLength });
    return { chunks, leftover: 0 };
  }
  // A residue too short to book on its own can often be absorbed by
  // re-splitting one of the 30s taken greedily above: 35 would stall as
  // 30 + 5, but books as two clean weekly sessions, 20 + 15.
  if (rest % 5 === 0 && chunks.some((c) => c.kind === 'weekly' && c.len === 30)) {
    const merged = 30 + rest;
    for (const a of SESSION_LENGTHS) {
      const b = merged - a;
      if (a >= b && isLegal(a) && isLegal(b)) {
        chunks.splice(
          chunks.findIndex((c) => c.kind === 'weekly' && c.len === 30),
          1,
        );
        chunks.push({ kind: 'weekly', len: a }, { kind: 'weekly', len: b as SessionLength });
        return { chunks, leftover: 0 };
      }
    }
  }
  const doubled = rest * 2;
  const a = Math.max(minLen, Math.ceil(rest / 5) * 5);
  const b = doubled - a;
  if (isLegal(a) && isLegal(b)) {
    chunks.push({ kind: 'alternating', lenA: a as SessionLength, lenB: b as SessionLength });
    return { chunks, leftover: 0 };
  }
  if (doubled % 5 === 0 && isLegal(doubled)) {
    chunks.push({ kind: 'biweekly', len: doubled as SessionLength });
    return { chunks, leftover: 0 };
  }
  return { chunks, leftover: rest };
}

export interface ProposedSession {
  day: DayOfWeek;
  start: Minutes;
  durationMin: SessionLength;
  studentIds: string[];
  recurrence: 'weekly' | 'biweekly';
  weekParity?: WeekParity;
}

export interface StudentPlan {
  studentId: string;
  displayId: string;
  /** The goal as entered, e.g. "90 min/month". */
  goalLabel: string;
  weeklyGoalMin: number;
  existingWeeklyMin: number;
  proposedMin: number; // weekly-average minutes
  unmetMin: number;
  /** Minutes/week a group deliberately leaves for the user to cover by hand
   * (groups run at the shorter member's need, at the user's instruction).
   * Not a failure and never counted as unmet. */
  groupShortMin: number;
}

export interface PlanResult {
  proposals: ProposedSession[];
  students: StudentPlan[];
  lunches: Array<{ day: DayOfWeek; start: Minutes }>;
  /** Why a preferred group could not share a session, in plain words. */
  groupNotes: string[];
}

/** Exact-solver results, cached per workspace snapshot. Solutions are
 * keyed by strategy too (each version explores slots in its own flavor,
 * so the five versions stay distinct); infeasibility proofs are shared.
 * Keyed weakly by the workspace object, replaced by the store on change. */
const solverCache = new WeakMap<Workspace, Map<string, unknown>>();

/**
 * Order candidate slots the way a placement strategy would explore them.
 * The exact solver takes the FIRST full fit it finds, so this ordering is
 * what makes Version 1's rescue lean morning, Version 3's lean afternoon,
 * and so on - without it every version would collapse into one schedule.
 */
export function orderSlotsForStrategy(
  slots: Array<{ day: DayOfWeek; start: Minutes }>,
  strategy: PlacementStrategy,
  existingDayLoad: Map<DayOfWeek, number>,
): Array<{ day: DayOfWeek; start: Minutes }> {
  const byTime = [...slots].sort((a, b) => a.start - b.start || a.day - b.day);
  switch (strategy) {
    case 'earliest':
      return byTime;
    case 'latest':
      return byTime.reverse();
    case 'spread': {
      // Middle-out: closest to each day's median slot time first.
      if (byTime.length === 0) return byTime;
      const mid = byTime[Math.floor(byTime.length / 2)].start;
      return [...byTime].sort((a, b) => Math.abs(a.start - mid) - Math.abs(b.start - mid) || a.start - b.start);
    }
    case 'pack-days':
      return [...byTime].sort(
        (a, b) =>
          (existingDayLoad.get(b.day) ?? 0) - (existingDayLoad.get(a.day) ?? 0) ||
          a.day - b.day ||
          a.start - b.start,
      );
    case 'shuffle': {
      const out = [...byTime];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
  }
}

/** Free blocks shared by week A and week B - where a weekly session can live. */
function weeklyFreeBlocks(compute: (parity: 'A' | 'B') => TimeBlock[]): TimeBlock[] {
  const a = compute('A');
  const b = compute('B');
  const window = { start: 0, end: 24 * 60 };
  return subtractBlocks(a, invertBlocks(b, window));
}

function studentFreeBlocks(
  studentId: string,
  ws: Workspace,
  providerId: string,
  allowProviderOverlap: boolean,
): TimeBlock[] {
  const student = ws.students.find((st) => st.id === studentId);
  if (!student) return [];
  const grade = ws.grades.find((g) => g.id === student.gradeId);
  const window = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  const blocked = effectiveBlockedTime(grade, student.overrides, ws.settings, student.optionalBlocks ?? []);
  return weeklyFreeBlocks((parity) => {
    // Master-schedule blocks always bind. The student's existing sessions
    // bind too - unless overlap with OTHER providers is allowed, in which
    // case only this provider's own sessions stay untouchable.
    const untouchable = ws.sessions
      .filter(
        (sess) =>
          sess.studentIds.includes(studentId) &&
          sessionOccursIn(sess, parity) &&
          (!allowProviderOverlap || sess.providerId === providerId),
      )
      .map(sessionBlock);
    return subtractBlocks(invertBlocks(blocked, window), untouchable);
  });
}

function expand(blocks: TimeBlock[], by: number): TimeBlock[] {
  return blocks.map((b) => ({ day: b.day, start: Math.max(0, b.start - by), end: b.end + by }));
}

function providerFreeBlocks(providerId: string, ws: Workspace, rules: PlanRules): TimeBlock[] {
  const free = weeklyFreeBlocks((parity) => {
    const avail = providerAvailableBlocks(providerId, parity, ws);
    const busy = ws.sessions
      .filter((s) => s.providerId === providerId && sessionOccursIn(s, parity))
      .map((s) => ({ day: s.day, start: s.start, end: s.start + s.durationMin }));
    return subtractBlocks(avail, expand(busy, rules.bufferMin));
  });
  // Nothing before the earliest allowed start, nothing past the latest end.
  const offLimits = ([0, 1, 2, 3, 4] as DayOfWeek[]).flatMap((day) => {
    const blocks: TimeBlock[] = [{ day, start: 0, end: rules.earliestStart }];
    if (rules.latestEnd !== null) blocks.push({ day, start: rules.latestEnd, end: 24 * 60 });
    return blocks;
  });
  return subtractBlocks(free, offLimits);
}

/**
 * How a variant places sessions: lean early, center, or late in the day;
 * pack into as few days as possible; or shuffle for a fresh mix each run.
 */
export type PlacementStrategy = 'earliest' | 'spread' | 'latest' | 'pack-days' | 'shuffle';

/** A slot of `len` minutes inside `free`, per day order and placement lean. */
function findSlot(
  free: TimeBlock[],
  len: number,
  dayOrder: DayOfWeek[],
  strategy: PlacementStrategy = 'earliest',
): { day: DayOfWeek; start: Minutes } | null {
  for (const day of dayOrder) {
    const dayBlocks = free.filter((b) => b.day === day).sort((a, b) => a.start - b.start);
    const fitting = dayBlocks.filter((b) => b.end - b.start >= len);
    if (fitting.length === 0) continue;
    if (strategy === 'latest') {
      const b = fitting[fitting.length - 1];
      return { day, start: b.end - len };
    }
    if (strategy === 'spread') {
      const b = fitting[0];
      const mid = Math.round((b.start + (b.end - len)) / 2 / 5) * 5;
      return { day, start: Math.max(b.start, Math.min(mid, b.end - len)) };
    }
    if (strategy === 'shuffle') {
      const b = fitting[Math.floor(Math.random() * fitting.length)];
      const steps = Math.floor((b.end - len - b.start) / 5);
      return { day, start: b.start + 5 * Math.floor(Math.random() * (steps + 1)) };
    }
    return { day, start: fitting[0].start }; // 'earliest' and 'pack-days'
  }
  return null;
}

/**
 * Hold lunch on every on-site day BEFORE placing sessions, choosing the
 * 30-minute window inside 11:00-1:00 that the fewest students could use -
 * lunch lands where it costs the least scheduling flexibility.
 */
/** Where to pin the greedy pass's lunch: least-contested spot, or push it
 * to the edge of the window. The rescue ladder tries the edges when the
 * least-contested pin leaves students unmet - lunch is a FLOATING break,
 * and a different pin can free the stretch a student needed. */
export type LunchMode = 'best' | 'early' | 'late';

function reserveLunches(
  providerFree: TimeBlock[],
  studentFrees: TimeBlock[][],
  ws: Workspace,
  providerId: string,
  rules: PlanRules,
  mode: LunchMode = 'best',
): { free: TimeBlock[]; lunches: Array<{ day: DayOfWeek; start: Minutes }> } {
  const lunches: Array<{ day: DayOfWeek; start: Minutes }> = [];
  let free = providerFree;
  if (rules.lunchMin <= 0) return { free, lunches };
  const onSiteDays = [
    ...new Set(
      (ws.providers.find((p) => p.id === providerId)?.availability ?? []).map((a) => a.day),
    ),
  ].sort();

  for (const day of onSiteDays) {
    // Already an unbookable 30-min stretch in the window (e.g. between
    // existing sessions)? Then lunch is naturally covered… only if it's
    // genuinely free of sessions - we check the provider's own free time.
    const windowBlocks = clampBlocks(
      free.filter((b) => b.day === day),
      { start: rules.lunchWindow.start, end: rules.lunchWindow.end },
    ).filter((b) => b.day === day);

    const candidates: Minutes[] = [];
    for (const b of windowBlocks) {
      for (let start = b.start; start + rules.lunchMin <= b.end; start += 5) candidates.push(start);
    }
    let chosen: Minutes | null = null;
    if (candidates.length > 0) {
      if (mode === 'early') chosen = candidates[0];
      else if (mode === 'late') chosen = candidates[candidates.length - 1];
      else {
        let best: { start: Minutes; score: number } | null = null;
        for (const start of candidates) {
          const lunchBlock = { day, start, end: start + rules.lunchMin };
          const score = studentFrees.reduce(
            (n, sf) => n + (subtractBlocks([lunchBlock], sf).length === 0 ? 1 : 0),
            0,
          );
          if (!best || score < best.score) best = { start, score };
        }
        chosen = best!.start;
      }
    }
    if (chosen !== null) {
      lunches.push({ day, start: chosen });
      free = subtractBlocks(free, [{ day, start: chosen, end: chosen + rules.lunchMin }]);
    }
    // No 30-min stretch available in the window at all: existing bookings
    // already ate it - reported implicitly by an empty lunches entry.
  }
  return { free, lunches };
}

/**
 * Greedy planner: most-constrained student first, one session per student per
 * day, balanced across the provider's days, buffer between sessions, lunch
 * held daily, and totals that never exceed the goal. Unmet minutes are
 * reported, never silently dropped.
 */
export function generatePlan(
  providerId: string,
  ws: Workspace,
  rules: PlanRules = DEFAULT_PLAN_RULES,
  strategy: PlacementStrategy = 'earliest',
): PlanResult {
  interface Working {
    student: Student;
    free: TimeBlock[];
    chunks: PlannedChunk[];
    leftover: number;
    goalLabel: string;
    weeklyGoal: number;
    existing: number;
    usedDays: Set<DayOfWeek>;
    proposedMin: number;
  }

  const intersect = (a: TimeBlock[], b: TimeBlock[]) =>
    subtractBlocks(a, invertBlocks(b, { start: 0, end: 24 * 60 }));

  const buildWorking = (): Working[] => {
    const working: Working[] = [];
    const periodShort: Record<string, string> = {
      weekly: 'week',
      monthly: 'month',
      quarterly: 'quarter',
      semesterly: 'semester',
      yearly: 'year',
    };
    for (const student of ws.students) {
      // ALL of this provider's direct goals for the student - two services
      // (e.g. individual + group minutes) plan as their combined total.
      const goals = student.serviceGoals.filter(
        (g) => g.providerId === providerId && g.type === 'direct',
      );
      if (goals.length === 0) continue;
      const goalLabel = goals
        .map((goal) => `${goal.minutes ?? 0} min/${periodShort[goal.period ?? 'monthly']}`)
        .join(' + ');
      const weeklyGoal = goals.reduce((sum, goal) => sum + weeklyGoalMinutes(goal), 0);
      const existing = ws.sessions
        .filter((s) => s.providerId === providerId && s.studentIds.includes(student.id))
        .reduce((sum, s) => sum + (s.recurrence === 'weekly' ? s.durationMin : s.durationMin / 2), 0);
      const needed = Math.max(0, weeklyGoal - existing);
      const { chunks, leftover } = chunkNeededExact(needed, rules.minSessionLen, rules.roundUpFractional);
      working.push({
        student,
        free: studentFreeBlocks(student.id, ws, providerId, rules.allowProviderOverlap),
        chunks,
        leftover,
        goalLabel,
        weeklyGoal,
        existing,
        usedDays: new Set(
          ws.sessions
            .filter((s) => s.providerId === providerId && s.studentIds.includes(student.id))
            .map((s) => s.day),
        ),
        proposedMin: 0,
      });
    }
    return working;
  };

  /** Legal ways to split one weekly session across two days. */
  const splitPairs = (len: number, minLen: number): Array<[SessionLength, SessionLength]> => {
    const out: Array<[SessionLength, SessionLength]> = [];
    for (const a of SESSION_LENGTHS) {
      const b = len - a;
      if (a < b || a >= len) continue; // dedupe (a >= b) and require a real split
      if (SESSION_LENGTHS.includes(b as SessionLength) && a >= minLen && b >= minLen) {
        out.push([a, b as SessionLength]);
      }
    }
    return out;
  };

  interface Attempt {
    proposals: ProposedSession[];
    working: Working[];
    lunches: Array<{ day: DayOfWeek; start: Minutes }>;
    unmetTotal: number;
    unmetIds: string[];
    groupNotes: string[];
  }

  /**
   * One full placement run. Students in `promotedIds` (unmet in an earlier
   * run) place ALL their sessions before anything else, so this round they
   * get first pick of their scarce slots. `uniformBuffer` runs the whole
   * plan at a compressed spacing, and `forceSplitId` splits that student's
   * weekly session up front even when it could fit whole - sometimes the
   * student who must split is not the one who gets stuck. Last-resort
   * rescues; see the ladder below.
   */
  const attempt = (
    promotedIds: string[],
    uniformBuffer?: number,
    forceSplitId?: string,
    lunchMode: LunchMode = 'best',
    groupRotation?: number,
  ): Attempt => {
    const buf = uniformBuffer ?? rules.bufferMin;
    const working = buildWorking();
    let providerFree = providerFreeBlocks(providerId, ws, { ...rules, bufferMin: buf });
    // A second calendar with the smaller stuck-fallback buffer. Searched only
    // after the strict calendar fails, so the full buffer is the norm and the
    // squeeze is the exception.
    let providerTight =
      uniformBuffer !== undefined ||
      rules.fallbackBufferMin === null ||
      rules.fallbackBufferMin >= buf
        ? null
        : providerFreeBlocks(providerId, ws, { ...rules, bufferMin: rules.fallbackBufferMin });
    const reserved = reserveLunches(providerFree, working.map((w) => w.free), ws, providerId, rules, lunchMode);
    providerFree = reserved.free;
    if (providerTight) {
      providerTight = subtractBlocks(
        providerTight,
        reserved.lunches.map((l) => ({ day: l.day, start: l.start, end: l.start + rules.lunchMin })),
      );
    }

    const proposals: ProposedSession[] = [];
    const groupNotes: string[] = [];
    const dayLoad = new Map<DayOfWeek, number>();
    for (const s of ws.sessions) {
      if (s.providerId !== providerId) continue;
      dayLoad.set(s.day, (dayLoad.get(s.day) ?? 0) + s.durationMin);
    }

    const claim = (members: Working[], day: DayOfWeek, start: Minutes, chunk: PlannedChunk) => {
      const len = chunkSlotLength(chunk);
      const block = { day, start, end: start + len };
      // Buffer applies to the provider's calendar only.
      providerFree = subtractBlocks(providerFree, expand([block], buf));
      if (providerTight) {
        providerTight = subtractBlocks(providerTight, expand([block], rules.fallbackBufferMin!));
      }
      dayLoad.set(day, (dayLoad.get(day) ?? 0) + len);
      for (const m of members) {
        m.free = subtractBlocks(m.free, [block]);
        m.usedDays.add(day);
        m.proposedMin += chunkWeeklyMinutes(chunk);
      }
      const ids = members.map((m) => m.student.id);
      if (chunk.kind === 'weekly') {
        proposals.push({ day, start, durationMin: chunk.len, studentIds: ids, recurrence: 'weekly' });
      } else if (chunk.kind === 'biweekly') {
        proposals.push({ day, start, durationMin: chunk.len, studentIds: ids, recurrence: 'biweekly', weekParity: 'A' });
      } else {
        proposals.push({ day, start, durationMin: chunk.lenA, studentIds: ids, recurrence: 'biweekly', weekParity: 'A' });
        proposals.push({ day, start, durationMin: chunk.lenB, studentIds: ids, recurrence: 'biweekly', weekParity: 'B' });
      }
    };

    const dayOrderFor = (members: Working[]): DayOfWeek[] => {
      const all = [0, 1, 2, 3, 4] as DayOfWeek[];
      // Priority days always lead, in the user's order. The rest: balanced by
      // default; 'pack-days' fills the busiest day first so the week uses as
      // few days as possible; 'shuffle' visits days randomly.
      const rank = (d: DayOfWeek) => {
        const i = rules.priorityDays.indexOf(d);
        return i === -1 ? Infinity : i;
      };
      const byLoad = (a: DayOfWeek, b: DayOfWeek) =>
        rank(a) - rank(b) ||
        (strategy === 'pack-days'
          ? (dayLoad.get(b) ?? 0) - (dayLoad.get(a) ?? 0) || a - b
          : (dayLoad.get(a) ?? 0) - (dayLoad.get(b) ?? 0) || a - b);
      const order = (days: DayOfWeek[]) => {
        const sorted = days.sort(byLoad);
        if (strategy !== 'shuffle') return sorted;
        // Shuffle only the non-priority tail - chosen days keep their order.
        const head = sorted.filter((d) => rank(d) !== Infinity);
        const tail = sorted.filter((d) => rank(d) === Infinity);
        for (let i = tail.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tail[i], tail[j]] = [tail[j], tail[i]];
        }
        return head.concat(tail);
      };
      return order(all.filter((d) => members.every((m) => !m.usedDays.has(d)))).concat(
        order(all.filter((d) => members.some((m) => m.usedDays.has(d)))),
      );
    };

    let groupCount = 0;
    let individualCount = 0;
    const groupsAllowed = () =>
      rules.maxGroupSize >= 2 && groupCount < (rules.maxGroups ?? Infinity);

    /** Slot for one student: strict buffer first, squeezed buffer if allowed. */
    const findFor = (w: Working, len: number, excludeDays: DayOfWeek[] = []) => {
      const order = dayOrderFor([w]).filter((d) => !excludeDays.includes(d));
      const strict = findSlot(intersect(w.free, providerFree), len, order, strategy);
      if (strict || !providerTight) return strict;
      return findSlot(intersect(w.free, providerTight), len, order, strategy);
    };

    /**
     * Place one chunk for one student, escalating: normal slot, then squeezed
     * buffer, then (weekly chunks) a split across two days. Returns how many
     * sessions were placed (0 = could not fit).
     */
    const placeIndividual = (w: Working): number => {
      const chunk = w.chunks[0];
      const trySplit = (): number => {
        if (chunk.kind !== 'weekly') return 0;
        for (const [a, b] of splitPairs(chunk.len, rules.minSessionLen)) {
          const s1 = findFor(w, a);
          if (!s1) continue;
          const s2 = findFor(w, b, [s1.day]);
          if (!s2) continue;
          claim([w], s1.day, s1.start, { kind: 'weekly', len: a });
          claim([w], s2.day, s2.start, { kind: 'weekly', len: b });
          w.chunks.shift();
          return 2;
        }
        return 0;
      };
      if (w.student.id === forceSplitId) {
        const n = trySplit();
        if (n > 0) return n;
      }
      const slot = findFor(w, chunkSlotLength(chunk));
      if (slot) {
        claim([w], slot.day, slot.start, chunk);
        w.chunks.shift();
        return 1;
      }
      return rules.allowSplitWhenStuck ? trySplit() : 0;
    };

    // Pass 0 - students who went unmet in an earlier run place everything
    // first, before groups or anyone else can eat their scarce slots.
    for (const id of promotedIds) {
      const w = working.find((x) => x.student.id === id);
      if (!w) continue;
      while (w.chunks.length > 0 && individualCount < (rules.maxIndividuals ?? Infinity)) {
        const placed = placeIndividual(w);
        if (placed === 0) break;
        individualCount += placed;
      }
    }

    // Pass 1 - the therapist's own groups (any size) share sessions. Members
    // rarely need identical minutes, so the group runs at the LARGEST
    // member's next chunk and serves every member fully - a 22.5 min/week
    // student in a weekly-30 group simply receives 30. Mandates are
    // minimums: modest overshoot is how real groups work, and it shows in
    // the plan as proposed minutes above the goal, never as hidden unmet.
    // Serving whole needs also matters practically: on a one-day-a-week
    // schedule a leftover remainder could never place (one session per
    // student per day), which would silently kill the group.
    // Scarcest shared time first: a group whose members are nearly fully
    // booked must claim its one viable slot before looser groups eat it.
    const groupMembers = ws.grouping.preferGroups
      .map((groupIds) =>
        groupIds
          .map((id) => working.find((w) => w.student.id === id))
          .filter((w): w is Working => w !== undefined),
      )
      .filter((members) => members.length >= 2);
    const sharedMinutes = (members: Working[]) => {
      let shared = providerFree;
      for (const m of members) shared = intersect(shared, m.free);
      return shared.reduce((sum, b) => sum + (b.end - b.start), 0);
    };
    groupMembers.sort((a, b) => sharedMinutes(a) - sharedMinutes(b));
    // Each plan version leads with a different group. When slots are scarce,
    // which group picks first decides who gets the contested window - so the
    // five versions explore five different winners and the user chooses.
    const rotation: Record<PlacementStrategy, number> = {
      earliest: 0,
      spread: 1,
      latest: 2,
      'pack-days': 3,
      shuffle: 4,
    };
    if (groupMembers.length > 1) {
      const r = (groupRotation ?? rotation[strategy]) % groupMembers.length;
      groupMembers.push(...groupMembers.splice(0, r));
    }
    for (const members of groupMembers) {
      // A member already fully served by booked sessions has nothing left to
      // plan - the group cannot form, and the user deserves to know why.
      const served = members.filter((m) => m.chunks.length === 0);
      if (served.length > 0 && members.length - served.length > 0) {
        groupNotes.push(
          `Students ${members.map((m) => m.student.displayId).join(' + ')}: ${served
            .map((m) => `Student ${m.student.displayId}`)
            .join(' and ')} already ${served.length === 1 ? 'has' : 'have'} booked sessions covering the goal, so this group is not planned - the rest plan alone. Delete or shrink those bookings if you want the group back.`,
        );
      }
      while (groupsAllowed() && members.every((m) => m.chunks.length > 0)) {
        const nexts = members.map((m) => m.chunks[0]);
        // The group runs at the SMALLEST member's need: nobody receives
        // minutes beyond their mandate, and no member is ever pulled twice
        // in a day for a top-up - both by the user's explicit rule. A larger
        // member's uncovered difference is reported for the user to cover by
        // hand (an extra Tracker session when the chance arises), and it
        // never triggers rescue passes.
        // Exception: a length the user chose for this group wins outright -
        // sometimes a slightly longer group beats a separate make-up.
        const chosenLen = ws.grouping.groupLens?.[groupKey(members.map((m) => m.student.id))];
        const auto = nexts.reduce((a, b) => (chunkWeeklyMinutes(b) < chunkWeeklyMinutes(a) ? b : a));
        let chunk: PlannedChunk =
          chosenLen !== undefined && SESSION_LENGTHS.includes(chosenLen as SessionLength)
            ? { kind: 'weekly', len: chosenLen as SessionLength }
            : auto;
        let shared = providerFree;
        for (const m of members) shared = intersect(shared, m.free);
        let slot = findSlot(shared, chunkSlotLength(chunk), dayOrderFor(members), strategy);
        // The chosen length is a preference; the calendar is a fact. When it
        // does not fit, fall back to the auto length so the group still
        // happens - a shorter group beats a student left unplaced in red.
        if (!slot && chunkSlotLength(auto) < chunkSlotLength(chunk)) {
          chunk = auto;
          slot = findSlot(shared, chunkSlotLength(chunk), dayOrderFor(members), strategy);
        }
        if (!slot) {
          const longest = shared.reduce((m, b) => Math.max(m, b.end - b.start), 0);
          const names = members.map((m) => m.student.displayId).join(' + ');
          groupNotes.push(
            longest === 0
              ? `Students ${names}: no shared free time at all - they plan individually.`
              : `Students ${names}: their longest shared free stretch is ${longest} min, but the group needs ${chunkSlotLength(chunk)} min. They plan individually - free up shared time to group them.`,
          );
          break;
        }
        claim(members, slot.day, slot.start, chunk);
        groupCount++;
        for (const m of members) m.chunks.shift();
      }
    }

  // Pass 1.5 - optional auto-grouping: students whose next needs match grow
  // into groups up to maxGroupSize, within the chosen grade span. Students
  // without a numeric grade level only ever group within their own grade.
  // Cannot-pairs never share a group.
  if (rules.autoGroup !== 'none') {
    // Students marked individual-only never enter an auto-formed group.
    const solo = new Set(ws.grouping.soloStudents ?? []);
    const forbidden = (a: Working, b: Working) =>
      ws.grouping.cannotPairs.some(
        ([x, y]) =>
          (x === a.student.id && y === b.student.id) || (x === b.student.id && y === a.student.id),
      );
    const levelOf = (w: Working) => ws.grades.find((g) => g.id === w.student.gradeId)?.level;
    const compatible = (members: Working[], cand: Working): boolean => {
      if (rules.autoGroup === 'same-grade') {
        return members.every((m) => m.student.gradeId === cand.student.gradeId);
      }
      const levels = [...members, cand].map(levelOf);
      if (levels.some((l) => l === undefined)) {
        return members.every((m) => m.student.gradeId === cand.student.gradeId);
      }
      const nums = levels as number[];
      return Math.max(...nums) - Math.min(...nums) <= 1;
    };
    let progress = true;
    while (progress && groupsAllowed()) {
      progress = false;
      for (const seed of working) {
        if (seed.chunks.length === 0 || solo.has(seed.student.id)) continue;
        const headKey = JSON.stringify(seed.chunks[0]);
        const chunk = seed.chunks[0];
        const members = [seed];
        let shared = intersect(seed.free, providerFree);
        for (const cand of working) {
          if (members.length >= rules.maxGroupSize) break;
          if (cand === seed || cand.chunks.length === 0 || solo.has(cand.student.id)) continue;
          if (JSON.stringify(cand.chunks[0]) !== headKey) continue;
          if (!compatible(members, cand)) continue;
          if (members.some((m) => forbidden(m, cand))) continue;
          const nextShared = intersect(shared, cand.free);
          if (!findSlot(nextShared, chunkSlotLength(chunk), dayOrderFor([...members, cand]), strategy)) continue;
          members.push(cand);
          shared = nextShared;
        }
        if (members.length < 2) continue;
        const slot = findSlot(shared, chunkSlotLength(chunk), dayOrderFor(members), strategy);
        if (!slot) continue;
        claim(members, slot.day, slot.start, chunk);
        groupCount++;
        for (const m of members) m.chunks.shift();
        progress = true;
        break;
      }
    }
  }

    // Pass 2 - individuals. Dynamically most-constrained-first: after every
    // placement, whoever has the least usable time left goes next, so tight
    // schedules claim their scarce slots before flexible ones eat them.
    // Only stretches long enough for the student's NEXT session count - a
    // schedule full of 5-20-minute slivers is constrained, not flexible.
    const stuck = new Set<Working>();
    for (;;) {
      if (individualCount >= (rules.maxIndividuals ?? Infinity)) break;
      const usableMin = (w: Working) => {
        const need = chunkSlotLength(w.chunks[0]);
        return intersect(w.free, providerFree).reduce(
          (sum, b) => sum + (b.end - b.start >= need ? b.end - b.start : 0),
          0,
        );
      };
      const candidates = working.filter((w) => w.chunks.length > 0 && !stuck.has(w));
      if (candidates.length === 0) break;
      const next = candidates.reduce((a, b) => (usableMin(b) < usableMin(a) ? b : a));
      const placed = placeIndividual(next);
      if (placed === 0) {
        stuck.add(next);
        continue;
      }
      individualCount += placed;
    }

    const unmetOf = (w: Working) =>
      w.leftover + w.chunks.reduce((sum, c) => sum + chunkWeeklyMinutes(c), 0);
    return {
      proposals,
      working,
      lunches: reserved.lunches,
      unmetTotal: working.reduce((sum, w) => sum + unmetOf(w), 0),
      unmetIds: working.filter((w) => unmetOf(w) > 0).map((w) => w.student.id),
      groupNotes,
    };
  };

  /**
   * The final rung: an exact backtracking search over every legal placement,
   * with a node budget so it always returns quickly. The greedy ladder is
   * fast and usually right; when it still reports unmet minutes, this
   * answers definitively whether a full schedule exists at the given
   * spacing, and returns it when one does. Split combinations are tried
   * fewest-splits-first, so whole sessions are preferred. Individual
   * sessions only (a full fit outranks grouping preferences); lunch is a
   * search constraint and gets assigned afterwards. Results are cached per
   * workspace + rules, so the five strategy versions share one search.
   */
  const exactSolve = (buffer: number, allowSplit: boolean): Attempt | null => {
    // 'shuffle' never caches - Surprise me should re-roll every Regenerate.
    const cacheKey = `${buffer}|${allowSplit}|${strategy}|${JSON.stringify(rules)}`;
    if (strategy !== 'shuffle') {
      const cached = solverCache.get(ws)?.get(cacheKey) as Attempt | null | undefined;
      if (cached !== undefined) return cached;
    }
    const result = exactSolveUncached(buffer, allowSplit);
    if (strategy !== 'shuffle') {
      let byWs = solverCache.get(ws);
      if (!byWs) {
        byWs = new Map();
        solverCache.set(ws, byWs);
      }
      byWs.set(cacheKey, result);
    }
    return result;
  };

  const exactSolveUncached = (buffer: number, allowSplit: boolean): Attempt | null => {
    const template = buildWorking();
    if (template.some((w) => w.leftover > 0.01)) return null; // sliver can never fully fit
    const base = providerFreeBlocks(providerId, ws, { ...rules, bufferMin: buffer });
    const existingLoad = new Map<DayOfWeek, number>();
    for (const s of ws.sessions) {
      if (s.providerId === providerId) {
        existingLoad.set(s.day, (existingLoad.get(s.day) ?? 0) + s.durationMin);
      }
    }

    const slotsFor = (w: Working, len: number): Array<{ day: DayOfWeek; start: Minutes }> => {
      const usable = intersect(w.free, base);
      const out: Array<{ day: DayOfWeek; start: Minutes }> = [];
      for (const b of usable) {
        for (let t = b.start; t + len <= b.end; t += 5) out.push({ day: b.day, start: t });
      }
      return orderSlotsForStrategy(out, strategy, existingLoad);
    };

    const onSiteDays = [
      ...new Set((ws.providers.find((p) => p.id === providerId)?.availability ?? []).map((a) => a.day)),
    ].sort() as DayOfWeek[];
    const lunchStarts = new Map<DayOfWeek, Minutes[]>();
    if (rules.lunchMin > 0) {
      for (const day of onSiteDays) {
        const blocks = clampBlocks(base.filter((b) => b.day === day), rules.lunchWindow);
        const opts: Minutes[] = [];
        for (const b of blocks) {
          for (let t = b.start; t + rules.lunchMin <= b.end; t += 5) opts.push(t);
        }
        lunchStarts.set(day, opts);
      }
    }

    interface ChunkRef {
      w: Working;
      chunk: PlannedChunk;
    }
    /** A preferred group's shared session: one slot, several students. */
    interface GroupRef {
      members: Working[];
      chunk: PlannedChunk;
    }
    interface Unit {
      ref?: ChunkRef;
      group?: GroupRef;
      studentIds: string[];
      len: number;
      slots: Array<{ day: DayOfWeek; start: Minutes }>;
    }

    // Preferred groups are structural here, exactly as the greedy pass forms
    // them: the chosen length wins, otherwise the smallest member's need.
    // Members' consumed heads leave their remaining chunks as individuals.
    const groupRefs: GroupRef[] = [];
    for (const groupIds of ws.grouping.preferGroups) {
      const members = groupIds
        .map((id) => template.find((w) => w.student.id === id))
        .filter((w): w is Working => w !== undefined);
      if (members.length < 2) continue;
      while (members.every((m) => m.chunks.length > 0)) {
        const nexts = members.map((m) => m.chunks[0]);
        const chosenLen = ws.grouping.groupLens?.[groupKey(members.map((m) => m.student.id))];
        const chunk: PlannedChunk =
          chosenLen !== undefined && SESSION_LENGTHS.includes(chosenLen as SessionLength)
            ? { kind: 'weekly', len: chosenLen as SessionLength }
            : nexts.reduce((a, b) => (chunkWeeklyMinutes(b) < chunkWeeklyMinutes(a) ? b : a));
        groupRefs.push({ members, chunk });
        for (const m of members) m.chunks.shift();
      }
    }
    const groupSlotsFor = (g: GroupRef, len: number): Array<{ day: DayOfWeek; start: Minutes }> => {
      let usable = base;
      for (const m of g.members) usable = intersect(usable, m.free);
      const out: Array<{ day: DayOfWeek; start: Minutes }> = [];
      for (const b of usable) {
        for (let t = b.start; t + len <= b.end; t += 5) out.push({ day: b.day, start: t });
      }
      return orderSlotsForStrategy(out, strategy, existingLoad);
    };

    /** Solve one fixed set of units (each = one session to place). */
    const solveUnits = (units: Unit[]): Map<ChunkRef | GroupRef, Array<{ day: DayOfWeek; start: Minutes; len: number }>> | null => {
      if (units.some((u) => u.slots.length === 0)) return null;
      const individualCount = units.filter((u) => !u.group).length;
      if (rules.maxIndividuals !== null && individualCount > rules.maxIndividuals) return null;
      if (rules.maxGroups !== null && units.filter((u) => u.group).length > rules.maxGroups) return null;
      type Placement = { day: DayOfWeek; start: Minutes; len: number; studentIds: string[] };
      const placed: Placement[] = [];
      const overlaps = (a: { day: number; start: number; len: number }, b: { day: number; start: number; len: number }, gap: number) =>
        a.day === b.day && a.start < b.start + b.len + gap && b.start < a.start + a.len + gap;
      // Lunch is a FLOATING break: only 30 minutes anywhere in the window
      // must survive - the rest of the window stays bookable. Days whose
      // window was already eaten by existing bookings are exempt (matching
      // reserveLunches, which reports those implicitly).
      const lunchDays = onSiteDays.filter((d) => (lunchStarts.get(d) ?? []).length > 0);
      const lunchStillPossible = (): boolean => {
        if (rules.lunchMin === 0) return true;
        return lunchDays.every((day) =>
          (lunchStarts.get(day) ?? []).some((t) =>
            placed.every((q) => !overlaps({ day, start: t, len: rules.lunchMin }, q, 0)),
          ),
        );
      };
      const order = [...units].sort((a, b) => a.slots.length - b.slots.length);
      const chosen = new Map<Unit, { day: DayOfWeek; start: Minutes }>();
      let nodes = 0;
      // Generous: unit counts are small (one per session to place), so even
      // the worst case is tens of milliseconds - and an exhausted budget
      // reads as "impossible", which must not happen while a fit exists.
      const BUDGET = 2_000_000;
      const membersOf = (u: Unit): Working[] => (u.group ? u.group.members : [u.ref!.w]);
      const bt = (i: number): boolean => {
        if (++nodes > BUDGET) return false;
        if (i === order.length) return true;
        const u = order[i];
        outer: for (const s of u.slots) {
          if (membersOf(u).some((m) => m.usedDays.has(s.day))) continue;
          for (const q of placed) {
            if (overlaps({ day: s.day, start: s.start, len: u.len }, q, buffer)) continue outer;
            if (q.day === s.day && q.studentIds.some((id) => u.studentIds.includes(id))) continue outer;
          }
          placed.push({ day: s.day, start: s.start, len: u.len, studentIds: u.studentIds });
          chosen.set(u, s);
          if (lunchStillPossible() && bt(i + 1)) return true;
          chosen.delete(u);
          placed.pop();
        }
        return false;
      };
      if (!bt(0)) return null;
      const byRef = new Map<ChunkRef | GroupRef, Array<{ day: DayOfWeek; start: Minutes; len: number }>>();
      for (const u of order) {
        const s = chosen.get(u)!;
        const owner = u.group ?? u.ref!;
        const list = byRef.get(owner) ?? [];
        list.push({ day: s.day, start: s.start, len: u.len });
        byRef.set(owner, list);
      }
      return byRef;
    };

    // Chunk list; splittable ones (weekly, with a legal split) can appear
    // either whole or as two shorter units on different days.
    const refs: ChunkRef[] = [];
    for (const w of template) for (const chunk of w.chunks) refs.push({ w, chunk });
    const wholeUnit = (r: ChunkRef): Unit => ({
      ref: r,
      studentIds: [r.w.student.id],
      len: chunkSlotLength(r.chunk),
      slots: slotsFor(r.w, chunkSlotLength(r.chunk)),
    });
    const splitUnits = (r: ChunkRef): Unit[][] => {
      if (r.chunk.kind !== 'weekly') return [];
      return splitPairs(r.chunk.len, rules.minSessionLen).map(([a, b]) => [
        { ref: r, studentIds: [r.w.student.id], len: a, slots: slotsFor(r.w, a) },
        { ref: r, studentIds: [r.w.student.id], len: b, slots: slotsFor(r.w, b) },
      ]);
    };
    const groupUnits: Unit[] = groupRefs.map((g) => ({
      group: g,
      studentIds: g.members.map((m) => m.student.id),
      len: chunkSlotLength(g.chunk),
      slots: groupSlotsFor(g, chunkSlotLength(g.chunk)),
    }));
    const splittable = allowSplit ? refs.filter((r) => splitUnits(r).length > 0) : [];

    // Try split subsets, fewest splits first (cap the subset size to keep
    // the combination count small; each run is fast).
    const maxSplitters = Math.min(splittable.length, 4);
    const subsets: ChunkRef[][] = [[]];
    for (let size = 1; size <= maxSplitters; size++) {
      const pick = (start: number, cur: ChunkRef[]) => {
        if (cur.length === size) {
          subsets.push([...cur]);
          return;
        }
        for (let i = start; i < splittable.length; i++) pick(i + 1, [...cur, splittable[i]]);
      };
      pick(0, []);
    }

    for (const subset of subsets) {
      // For each subset member choose one split shape (usually just 15+15).
      const shapeLists = subset.map((r) => splitUnits(r));
      const combos: Unit[][][] = [[]];
      for (const shapes of shapeLists) {
        const next: Unit[][][] = [];
        for (const combo of combos) for (const shape of shapes) next.push([...combo, shape]);
        combos.length = 0;
        combos.push(...next);
      }
      for (const combo of combos) {
        const units: Unit[] = [...groupUnits];
        for (const r of refs) {
          const si = subset.indexOf(r);
          if (si === -1) units.push(wholeUnit(r));
          else units.push(...combo[si]);
        }
        const solved = solveUnits(units);
        if (!solved) continue;

        // Build the result in claim() shape - groups first.
        const proposals: ProposedSession[] = [];
        for (const g of groupRefs) {
          const ps = solved.get(g)!;
          const ids = g.members.map((m) => m.student.id);
          const p0 = ps[0];
          if (g.chunk.kind === 'weekly') {
            proposals.push({ day: p0.day, start: p0.start, durationMin: g.chunk.len, studentIds: ids, recurrence: 'weekly' });
          } else if (g.chunk.kind === 'biweekly') {
            proposals.push({ day: p0.day, start: p0.start, durationMin: g.chunk.len, studentIds: ids, recurrence: 'biweekly', weekParity: 'A' });
          } else {
            proposals.push({ day: p0.day, start: p0.start, durationMin: g.chunk.lenA, studentIds: ids, recurrence: 'biweekly', weekParity: 'A' });
            proposals.push({ day: p0.day, start: p0.start, durationMin: g.chunk.lenB, studentIds: ids, recurrence: 'biweekly', weekParity: 'B' });
          }
          for (const m of g.members) m.proposedMin += chunkWeeklyMinutes(g.chunk);
        }
        for (const r of refs) {
          const ps = solved.get(r)!;
          const ids = [r.w.student.id];
          if (r.chunk.kind === 'weekly') {
            for (const p of ps) {
              proposals.push({ day: p.day, start: p.start, durationMin: p.len as SessionLength, studentIds: ids, recurrence: 'weekly' });
            }
          } else if (r.chunk.kind === 'biweekly') {
            proposals.push({ day: ps[0].day, start: ps[0].start, durationMin: r.chunk.len, studentIds: ids, recurrence: 'biweekly', weekParity: 'A' });
          } else {
            proposals.push({ day: ps[0].day, start: ps[0].start, durationMin: r.chunk.lenA, studentIds: ids, recurrence: 'biweekly', weekParity: 'A' });
            proposals.push({ day: ps[0].day, start: ps[0].start, durationMin: r.chunk.lenB, studentIds: ids, recurrence: 'biweekly', weekParity: 'B' });
          }
          r.w.proposedMin += chunkWeeklyMinutes(r.chunk);
        }
        for (const w of template) w.chunks = [];

        const lunches: Array<{ day: DayOfWeek; start: Minutes }> = [];
        if (rules.lunchMin > 0) {
          const sessions = proposals.map((p) => ({ day: p.day, start: p.start, len: p.durationMin }));
          for (const day of onSiteDays) {
            const t = (lunchStarts.get(day) ?? []).find((start) =>
              sessions.every(
                (q) => !(q.day === day && start < q.start + q.len && q.start < start + rules.lunchMin),
              ),
            );
            if (t !== undefined) lunches.push({ day, start: t });
          }
        }
        return {
          proposals,
          working: template,
          lunches,
          unmetTotal: 0,
          unmetIds: [],
          groupNotes: [],
        };
      }
    }
    return null;
  };

  // The rescue ladder. Run once; while anyone is unmet, retry with those
  // students placed first (a student squeezed out by greedy order gets first
  // pick of their scarce slots next round). If promotions still leave someone
  // out and shrinking the buffer is allowed, re-run the WHOLE plan at the
  // compressed spacing: sometimes no full-buffer schedule exists at all, yet
  // everyone fits when every gap tightens a little. Best run wins.
  let best = attempt([]);
  const consider = (a: Attempt) => {
    if (a.unmetTotal < best.unmetTotal) best = a;
  };
  // With slots scarce, WHICH preferred group claims first can decide whether
  // everyone fits. The strategy sets the default lead, but when that leaves
  // someone unmet, every other lead is worth one try - and lunch placement
  // interacts with the midday windows, so each lead is tried per lunch mode.
  if (ws.grouping.preferGroups.length > 1) {
    for (const lunchMode of ['best', 'late', 'early'] as const) {
      for (let r = 0; r < ws.grouping.preferGroups.length && best.unmetTotal > 0; r++) {
        consider(attempt([], undefined, undefined, lunchMode, r));
      }
      if (best.unmetTotal === 0) break;
    }
  }
  const runPromotions = (uniformBuffer?: number, forceSplitId?: string, lunchMode: LunchMode = 'best') => {
    const promoted: string[] = [];
    for (let round = 0; round < 4 && best.unmetTotal > 0; round++) {
      const fresh = best.unmetIds.filter((id) => !promoted.includes(id));
      if (fresh.length === 0) break;
      promoted.unshift(...fresh);
      consider(attempt(promoted, uniformBuffer, forceSplitId, lunchMode));
    }
  };
  runPromotions();
  const fallbackBuf =
    rules.fallbackBufferMin !== null && rules.fallbackBufferMin < rules.bufferMin
      ? rules.fallbackBufferMin
      : undefined;
  // Lunch is a floating break - if the least-contested pin left students
  // unmet, pinning it at the late or early edge of the window may free the
  // exact stretch they needed.
  for (const lunchMode of ['late', 'early'] as const) {
    if (best.unmetTotal === 0 || rules.lunchMin === 0) break;
    consider(attempt([], undefined, undefined, lunchMode));
    runPromotions(undefined, undefined, lunchMode);
  }
  if (best.unmetTotal > 0 && fallbackBuf !== undefined) {
    consider(attempt([], fallbackBuf));
    runPromotions(fallbackBuf);
    for (const lunchMode of ['late', 'early'] as const) {
      if (best.unmetTotal === 0) break;
      consider(attempt([], fallbackBuf, undefined, lunchMode));
      runPromotions(fallbackBuf, undefined, lunchMode);
    }
  }
  // Final rung: sometimes the student who must split is one who fits whole -
  // their split frees the stretch the stuck student needs. Try force-splitting
  // each splittable student in turn.
  if (best.unmetTotal > 0 && rules.allowSplitWhenStuck) {
    const splittable = buildWorking()
      .filter((w) =>
        w.chunks.some((c) => c.kind === 'weekly' && splitPairs(c.len, rules.minSessionLen).length > 0),
      )
      .map((w) => w.student.id);
    for (const id of splittable) {
      if (best.unmetTotal === 0) break;
      consider(attempt([], undefined, id));
      runPromotions(undefined, id);
      if (best.unmetTotal > 0 && fallbackBuf !== undefined) {
        consider(attempt([], fallbackBuf, id));
        runPromotions(fallbackBuf, id);
      }
    }
  }
  // Greedy exhausted and someone is still out: ask the exact search, at the
  // full buffer first, then the squeezed one. It only ever returns full fits.
  if (best.unmetTotal > 0) {
    for (const buf of [rules.bufferMin, ...(fallbackBuf !== undefined ? [fallbackBuf] : [])]) {
      const solved = exactSolve(buf, rules.allowSplitWhenStuck);
      if (solved) {
        best = solved;
        break;
      }
    }
  }

  best.proposals.sort((a, b) => a.day - b.day || a.start - b.start);
  return {
    proposals: best.proposals,
    lunches: best.lunches,
    groupNotes: best.groupNotes,
    students: best.working.map((w) => {
      const unmetMin = w.leftover + w.chunks.reduce((sum, c) => sum + chunkWeeklyMinutes(c), 0);
      // What the true mandate still needs after the plan and after real
      // unmet: the difference a group deliberately left for the user.
      // Measured against the exact weekly goal, so round-up inflation
      // never overstates what she owes.
      const groupShortMin = Math.max(0, w.weeklyGoal - w.existing - w.proposedMin - unmetMin);
      return {
        studentId: w.student.id,
        displayId: w.student.displayId,
        goalLabel: w.goalLabel,
        weeklyGoalMin: w.weeklyGoal,
        existingWeeklyMin: w.existing,
        proposedMin: w.proposedMin,
        unmetMin,
        groupShortMin,
      };
    }),
  };
}
