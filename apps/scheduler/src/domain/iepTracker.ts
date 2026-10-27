/*
 * Helpers for the IEP case tracker. A case is a deadline with a checklist;
 * everything derivable - grade, school, service minutes - comes from the
 * live workspace at render time, so the tracker can never disagree with
 * the schedule it sits next to.
 */

import type { GoalPeriod, IepCase, Workspace } from './types';
import { IEP_STEPS } from './types';

export function newIepCase(studentId: string): IepCase {
  return {
    id: crypto.randomUUID(),
    studentId,
    kind: 'Annual',
    dateDue: '',
    notes: '',
    checklistSent: false,
    checklistReceived: false,
    informalTesting: false,
    formalTesting: false,
  };
}

/** Soonest deadline first; cases with no date sink to the bottom. */
export function sortCases(cases: IepCase[], studentNumber: (id: string) => number): IepCase[] {
  return [...cases].sort((a, b) => {
    if (a.dateDue !== b.dateDue) {
      if (!a.dateDue) return 1;
      if (!b.dateDue) return -1;
      return a.dateDue < b.dateDue ? -1 : 1;
    }
    return studentNumber(a.studentId) - studentNumber(b.studentId);
  });
}

/** Done = every checklist step is ticked. */
export const isCaseDone = (c: IepCase): boolean => IEP_STEPS.every(([key]) => c[key]);

export const isOverdue = (c: IepCase, today: string): boolean =>
  !!c.dateDue && c.dateDue < today && !isCaseDone(c);

/** Due within the next `days` days (and not past, not done). */
export const isDueSoon = (c: IepCase, today: string, days = 14): boolean => {
  if (!c.dateDue || isCaseDone(c) || c.dateDue < today) return false;
  const due = new Date(`${c.dateDue}T00:00`);
  const now = new Date(`${today}T00:00`);
  return (due.getTime() - now.getTime()) / 86400000 <= days;
};

const PERIOD_ABBR: Record<GoalPeriod, string> = {
  weekly: 'wk',
  monthly: 'mo',
  quarterly: 'qtr',
  semesterly: 'sem',
  yearly: 'yr',
};

export interface ServiceSummary {
  /** The direct mandate from service goals, e.g. "90 min/mo". */
  direct: string;
  /** Indirect goals - minutes when stated, otherwise "consult". */
  indirect: string;
  /** What is actually on the calendar each week (biweekly counts half). */
  bookedPerWeek: number;
}

/** What this student receives, straight from goals and booked sessions. */
export function serviceSummary(ws: Workspace, studentId: string): ServiceSummary {
  const student = ws.students.find((s) => s.id === studentId);
  const goals = student?.serviceGoals ?? [];

  const direct = goals
    .filter((g) => g.type === 'direct' && g.minutes)
    .map((g) => `${g.minutes} min/${PERIOD_ABBR[g.period ?? 'weekly']}`)
    .join(' + ');

  const indirectGoals = goals.filter((g) => g.type === 'indirect');
  const indirect = indirectGoals
    .map((g) => (g.minutes ? `${g.minutes} min/${PERIOD_ABBR[g.period ?? 'monthly']}` : 'consult'))
    .join(' + ');

  const bookedPerWeek = ws.sessions
    .filter((s) => s.studentIds.includes(studentId))
    .reduce((sum, s) => sum + (s.recurrence === 'biweekly' ? s.durationMin / 2 : s.durationMin), 0);

  return { direct, indirect, bookedPerWeek };
}
