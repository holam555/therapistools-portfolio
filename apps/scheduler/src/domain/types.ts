// Core domain types. All schedule data is pattern-based (day-of-week +
// minutes-since-midnight on a 5-minute grid, Mon-Fri). Real calendar dates
// matter only for resolving week A/B parity from the anchor Monday.

export type DayOfWeek = 0 | 1 | 2 | 3 | 4; // Mon=0 … Fri=4
export type Minutes = number; // since midnight, always a multiple of 5
export type WeekParity = 'A' | 'B';
export type WeekScope = 'both' | 'A' | 'B';
export type SessionLength = 10 | 15 | 20 | 25 | 30;
export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'semesterly' | 'yearly';

export const SESSION_LENGTHS: SessionLength[] = [10, 15, 20, 25, 30];
export const GOAL_PERIODS: GoalPeriod[] = ['weekly', 'monthly', 'quarterly', 'semesterly', 'yearly'];
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export const DAYS: DayOfWeek[] = [0, 1, 2, 3, 4];

export interface TimeBlock {
  day: DayOfWeek;
  start: Minutes;
  end: Minutes; // exclusive
}

export type AvailabilityBlock = TimeBlock & { weeks: WeekScope };

/**
 * A master-schedule block tagged with why it's blocked ("Lunch", "Math", "ELD"…).
 * `optional` blocks (ELD, Writing…) apply only to students who opted in on
 * their page - an ELD period only binds students with NEP/LEP needs.
 */
export type LabeledBlock = TimeBlock & { label?: string; optional?: boolean };

export interface Settings {
  schoolDayStart: Minutes; // default 450 (7:30)
  schoolDayEnd: Minutes; // default 930 (15:30)
  slotMinutes: 5;
  weekAAnchorMonday: string; // ISO date; that week is Week A, parity alternates
  /** "Times to avoid" vocabulary for labeling master-schedule blocks. */
  avoidCategories: string[];
}

export const DEFAULT_AVOID_CATEGORIES = ['ELD', 'Lunch', 'Recess', 'Math', 'Special'];

export interface Provider {
  id: string;
  name: string;
  discipline?: string; // "OT", "Speech" - display only
  color: string; // calendar color for this provider's sessions
  availability: AvailabilityBlock[]; // on-site time
  /** The provider who is the app's user - their sessions drive the Today checklist. */
  isMe?: boolean;
  /** Several people share this row (an LS or para team) - their sessions may overlap. */
  isTeam?: boolean;
  /** 'daily' collapses this provider's calendar into one every-day column. */
  viewMode?: 'week' | 'daily';
}

export interface Grade {
  id: string;
  name: string;
  /** Numeric grade level for grouping rules (K=0, Grade 1=1, …). */
  level?: number;
  templatePolarity: 'blocked' | 'available';
  templateBlocks: LabeledBlock[]; // meaning depends on polarity; labels apply to 'blocked' polarity
}

export interface StudentOverride {
  id: string;
  kind: 'block' | 'unblock'; // add blocked time, or carve availability out of blocked time
  block: TimeBlock;
  label?: string;
}

export interface ServiceGoal {
  providerId: string;
  /** 'direct' = pull-out minutes to schedule; 'indirect' = consult/monitoring, no minutes mandate. */
  type: 'direct' | 'indirect';
  minutes?: number; // required when type === 'direct'
  period?: GoalPeriod; // required when type === 'direct'
}

export interface Student {
  id: string; // internal uuid
  displayId: string; // numeric ID shown everywhere - never a name
  gradeId: string;
  serviceGoals: ServiceGoal[]; // data-only in Phase 1
  overrides: StudentOverride[];
  /** Labels of the grade's optional template blocks that DO bind this student (e.g. "ELD"). */
  optionalBlocks?: string[];
}

export interface Session {
  id: string;
  providerId: string;
  studentIds: string[]; // 1+ students = group session
  day: DayOfWeek;
  start: Minutes;
  durationMin: SessionLength;
  recurrence: 'weekly' | 'biweekly';
  weekParity?: WeekParity; // required iff biweekly
  note?: string;
  /** Checked by hand against the source schedule (imports start unverified). */
  verified?: boolean;
}

export type GroupingPolicy = 'any' | 'same-grade' | 'adjacent-grade';

export interface GroupingRules {
  /** Default rule for who may share a group session. */
  policy: GroupingPolicy;
  /** Explicit "these students go together" sets of 2+ (therapist preference). */
  preferGroups: string[][];
  /** Explicit "never together" pairs - always warned regardless of policy. */
  cannotPairs: Array<[string, string]>;
  /**
   * Chosen session length per preferred group, keyed by groupKey(members).
   * Absent = auto (the shortest member's need). Set when the therapist
   * decides a slightly longer group beats a separate make-up.
   */
  groupLens?: Record<string, number>;
  /**
   * Students who do better alone: auto-grouping never pulls them into a
   * group. A group the therapist writes out by hand still wins - an
   * explicit list is a stronger statement than this flag.
   */
  soloStudents?: string[];
}

/** Stable identity for a preferred group, independent of member order. */
export const groupKey = (ids: string[]): string => [...ids].sort().join('+');


/** Why a booked session did not happen. The reason presets the make-up rule. */
export const MISS_REASONS = ['Student absent', 'School closed / event', 'My reason', 'Other'] as const;
export type MissReason = (typeof MISS_REASONS)[number];

/** Reasons where the make-up toggle starts on. Overridable per entry. */
export const MAKEUP_DEFAULT: Record<MissReason, boolean> = {
  'Student absent': false,
  'School closed / event': false,
  'My reason': true,
  Other: false,
};

/**
 * One student's outcome for one expected visit on one real date - the only
 * dated record in the workspace, and the source of truth for delivered
 * minutes. A group session writes one log per student, full minutes each.
 *
 * Besides recording what happened ('seen' / 'missed'), a log can also
 * reshape one day without touching the weekly pattern: 'planned' holds a
 * day-specific time or an added visit that has not happened yet, and
 * 'skipped' removes a pattern visit from that day only.
 */
export interface SessionLog {
  id: string;
  date: string; // ISO date the visit happened (or should have)
  studentId: string;
  /** The booked pattern session this fulfills; absent for an ad-hoc visit. */
  sessionId?: string;
  /** Actual minutes when seen; the planned minutes otherwise. */
  minutes: number;
  status: 'seen' | 'missed' | 'planned' | 'skipped';
  /** Day-specific start time, when it differs from the pattern session's. */
  start?: number;
  reason?: MissReason; // when missed
  makeupNeeded?: boolean; // when missed - defaulted by reason, overridable
  /** When seen: this delivery clears that missed log's make-up debt. */
  makeupForId?: string;
  /** The note for this visit is written in the documentation system. */
  documented?: boolean;
  note?: string;
}


/** IN / RE / AN in the paper tracker: which kind of IEP deadline this is. */
export type IepKind = 'Initial' | 'ReEval' | 'Annual';
export const IEP_KINDS: IepKind[] = ['Initial', 'ReEval', 'Annual'];

/**
 * The checklist steps of one IEP case, in the order they usually happen.
 * A case counts as done when every applicable step is checked - there is
 * no separate "complete" box.
 */
export const IEP_STEPS = [
  ['checklistSent', 'Checklist sent'],
  ['checklistReceived', 'Checklist back'],
  ['informalTesting', 'Informal testing'],
  ['formalTesting', 'Formal testing'],
] as const;

/**
 * One row of the IEP tracker. Links to a student by internal id - grade and
 * school come from the student, so a case never carries its own copy. Notes
 * are the only free text, and the student-number rule applies to them too.
 */
export interface IepCase {
  id: string;
  studentId: string;
  kind: IepKind;
  dateDue: string; // ISO date, or '' when not set yet
  notes: string;
  checklistSent: boolean;
  checklistReceived: boolean;
  informalTesting: boolean;
  formalTesting: boolean;
  /** Retired fields - kept so old backups load, no longer shown. */
  consentReceived?: boolean;
  vision?: boolean;
  complete?: boolean;
  outcome?: string;
}

export interface Workspace {
  schemaVersion: 4;
  settings: Settings;
  grouping: GroupingRules;
  providers: Provider[];
  grades: Grade[];
  students: Student[];
  sessions: Session[];
  iepCases: IepCase[];
  sessionLogs: SessionLog[];
}

export const DEFAULT_SETTINGS: Settings = {
  schoolDayStart: 450,
  schoolDayEnd: 930,
  slotMinutes: 5,
  weekAAnchorMonday: '2026-08-17',
  avoidCategories: [], // a blank school starts empty; imports and edits add labels
};

export const DEFAULT_GROUPING: GroupingRules = {
  policy: 'any',
  preferGroups: [],
  cannotPairs: [],
};

export function emptyWorkspace(): Workspace {
  return {
    schemaVersion: 4,
    settings: { ...DEFAULT_SETTINGS },
    grouping: { ...DEFAULT_GROUPING, preferGroups: [], cannotPairs: [] },
    providers: [],
    grades: [],
    students: [],
    sessions: [],
    iepCases: [],
    sessionLogs: [],
  };
}

export function formatMinutes(m: Minutes): string {
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')}`;
}

export function formatMinutesWithPeriod(m: Minutes): string {
  return `${formatMinutes(m)} ${m < 720 ? 'AM' : 'PM'}`;
}
