import { describe, expect, it } from 'vitest';
import {
  dayIndexOf,
  deliveredMinutes,
  expectedVisits,
  goalForecast,
  goalProgress,
  monthRangeOf,
  myProvider,
  owedMakeups,
  periodRangeOf,
  weekRangeOf,
  weeklyDelivered,
} from './serviceLog';
import type { SessionLog, Workspace } from './types';
import { emptyWorkspace } from './types';

// 2026-08-17 is a Monday; the seed anchor makes that week's parity computable.
function ws(): Workspace {
  const base = emptyWorkspace();
  base.settings.weekAAnchorMonday = '2026-08-17'; // week of Aug 17 = A
  base.providers = [
    { id: 'me', name: 'Kate', isMe: true, color: '#111', availability: [] },
    { id: 'sp', name: 'Speech', color: '#222', availability: [] },
  ];
  base.students = [
    { id: 's1', displayId: '1', gradeId: 'g', serviceGoals: [], overrides: [] },
    { id: 's2', displayId: '2', gradeId: 'g', serviceGoals: [], overrides: [] },
  ];
  return base;
}

const log = (over: Partial<SessionLog> & Pick<SessionLog, 'id' | 'date' | 'studentId' | 'minutes' | 'status'>): SessionLog => over as SessionLog;

describe('date ranges', () => {
  it('maps weekdays and weekends', () => {
    expect(dayIndexOf('2026-08-17')).toBe(0); // Monday
    expect(dayIndexOf('2026-08-21')).toBe(4); // Friday
    expect(dayIndexOf('2026-08-22')).toBeNull(); // Saturday
  });

  it('builds the containing week and month', () => {
    expect(weekRangeOf('2026-08-19')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
    expect(monthRangeOf('2026-08-19')).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('anchors goal periods on the calendar', () => {
    expect(periodRangeOf('quarterly', '2026-08-19')).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(periodRangeOf('semesterly', '2026-08-19')).toEqual({ start: '2026-07-01', end: '2026-12-31' });
    expect(periodRangeOf('yearly', '2026-08-19')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('expectedVisits', () => {
  it('lists my sessions for that weekday, one visit per group member, in time order', () => {
    const w = ws();
    w.sessions = [
      { id: 'a', providerId: 'me', studentIds: ['s1', 's2'], day: 0, start: 600, durationMin: 30, recurrence: 'weekly' },
      { id: 'b', providerId: 'me', studentIds: ['s1'], day: 0, start: 540, durationMin: 20, recurrence: 'weekly' },
      { id: 'c', providerId: 'sp', studentIds: ['s1'], day: 0, start: 555, durationMin: 30, recurrence: 'weekly' },
      { id: 'd', providerId: 'me', studentIds: ['s1'], day: 1, start: 540, durationMin: 20, recurrence: 'weekly' },
    ];
    const visits = expectedVisits(w, '2026-08-17', 'me');
    expect(visits.map((v) => `${v.sessionId}:${v.studentId}`)).toEqual(['b:s1', 'a:s1', 'a:s2']);
  });

  it('respects week parity for biweekly sessions', () => {
    const w = ws();
    w.sessions = [
      { id: 'a', providerId: 'me', studentIds: ['s1'], day: 0, start: 540, durationMin: 30, recurrence: 'biweekly', weekParity: 'A' },
      { id: 'b', providerId: 'me', studentIds: ['s1'], day: 0, start: 600, durationMin: 30, recurrence: 'biweekly', weekParity: 'B' },
    ];
    expect(expectedVisits(w, '2026-08-17', 'me').map((v) => v.sessionId)).toEqual(['a']); // week A
    expect(expectedVisits(w, '2026-08-24', 'me').map((v) => v.sessionId)).toEqual(['b']); // week B
  });

  it('expects nothing on a weekend', () => {
    const w = ws();
    w.sessions = [{ id: 'a', providerId: 'me', studentIds: ['s1'], day: 0, start: 540, durationMin: 30, recurrence: 'weekly' }];
    expect(expectedVisits(w, '2026-08-22', 'me')).toEqual([]);
  });
});

describe('deliveredMinutes and owedMakeups', () => {
  it('counts only seen minutes inside the range', () => {
    const w = ws();
    w.sessionLogs = [
      log({ id: 'a', date: '2026-08-17', studentId: 's1', minutes: 30, status: 'seen' }),
      log({ id: 'b', date: '2026-08-18', studentId: 's1', minutes: 20, status: 'missed', reason: 'Student absent' }),
      log({ id: 'c', date: '2026-07-30', studentId: 's1', minutes: 30, status: 'seen' }),
      log({ id: 'd', date: '2026-08-18', studentId: 's2', minutes: 30, status: 'seen' }),
    ];
    expect(deliveredMinutes(w, 's1', monthRangeOf('2026-08-19'))).toBe(30);
  });

  it('owes only make-up misses that nothing has cleared, oldest first', () => {
    const w = ws();
    w.sessionLogs = [
      log({ id: 'm1', date: '2026-08-10', studentId: 's1', minutes: 30, status: 'missed', reason: 'My reason', makeupNeeded: true }),
      log({ id: 'm2', date: '2026-08-03', studentId: 's1', minutes: 20, status: 'missed', reason: 'My reason', makeupNeeded: true }),
      log({ id: 'm3', date: '2026-08-11', studentId: 's1', minutes: 30, status: 'missed', reason: 'Student absent', makeupNeeded: false }),
      log({ id: 'paid', date: '2026-08-14', studentId: 's1', minutes: 20, status: 'seen', makeupForId: 'm2' }),
    ];
    expect(owedMakeups(w).map((l) => l.id)).toEqual(['m1']);
  });
});

describe('goalProgress', () => {
  it('measures my goals over their own periods and flags met', () => {
    const w = ws();
    w.students[0].serviceGoals = [
      { providerId: 'me', type: 'direct', minutes: 30, period: 'weekly' },
      { providerId: 'me', type: 'direct', minutes: 90, period: 'monthly' },
      { providerId: 'me', type: 'indirect' },
    ];
    w.sessionLogs = [
      log({ id: 'a', date: '2026-08-18', studentId: 's1', minutes: 30, status: 'seen' }),
      log({ id: 'b', date: '2026-08-04', studentId: 's1', minutes: 30, status: 'seen' }),
    ];
    expect(goalProgress(w, 's1', '2026-08-19')).toEqual([
      { label: '30 min/wk', period: 'weekly', target: 30, delivered: 30, met: true },
      { label: '90 min/mo', period: 'monthly', target: 90, delivered: 60, met: false },
    ]);
  });

  it("falls back to all direct goals when none are mine, ignoring colleagues' otherwise", () => {
    const w = ws();
    w.students[0].serviceGoals = [
      { providerId: 'sp', type: 'direct', minutes: 60, period: 'monthly' },
    ];
    expect(goalProgress(w, 's1', '2026-08-19')[0].label).toBe('60 min/mo');
    w.students[0].serviceGoals.push({ providerId: 'me', type: 'direct', minutes: 90, period: 'monthly' });
    expect(goalProgress(w, 's1', '2026-08-19').map((g) => g.label)).toEqual(['90 min/mo']);
  });
});

describe('weeklyDelivered', () => {
  it('gives most recent weeks first', () => {
    const w = ws();
    w.sessionLogs = [
      log({ id: 'a', date: '2026-08-18', studentId: 's1', minutes: 30, status: 'seen' }),
      log({ id: 'b', date: '2026-08-11', studentId: 's1', minutes: 25, status: 'seen' }),
    ];
    expect(weeklyDelivered(w, 's1', '2026-08-19', 3)).toEqual([
      { weekStart: '2026-08-17', minutes: 30 },
      { weekStart: '2026-08-10', minutes: 25 },
      { weekStart: '2026-08-03', minutes: 0 },
    ]);
  });
});

describe('myProvider', () => {
  it('prefers the marked provider, falls back to the first', () => {
    const w = ws();
    expect(myProvider(w)?.id).toBe('me');
    w.providers[0].isMe = undefined;
    expect(myProvider(w)?.id).toBe('me'); // first in the list
  });
});

describe('goalForecast', () => {
  // Anchor Monday 2026-08-17; "today" is Wednesday 2026-08-19.
  function withGoal(): Workspace {
    const w = ws();
    w.students[0].serviceGoals = [{ providerId: 'me', type: 'direct', minutes: 60, period: 'weekly' }];
    return w;
  }

  it('is on track when the remaining booked sessions reach the target', () => {
    const w = withGoal();
    w.sessions = [
      { id: 'a', providerId: 'me', studentIds: ['s1'], day: 0, start: 540, durationMin: 30, recurrence: 'weekly' },
      { id: 'b', providerId: 'me', studentIds: ['s1'], day: 3, start: 540, durationMin: 30, recurrence: 'weekly' },
    ];
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-17', studentId: 's1', sessionId: 'a', minutes: 30, status: 'seen' },
    ];
    const [g] = goalForecast(w, 's1', '2026-08-19');
    expect(g).toMatchObject({ delivered: 30, planned: 30, willMeet: true, shortBy: 0, met: false });
  });

  it('is short when a missed session removed the minutes from the plan', () => {
    const w = withGoal();
    w.sessions = [
      { id: 'a', providerId: 'me', studentIds: ['s1'], day: 0, start: 540, durationMin: 30, recurrence: 'weekly' },
      { id: 'b', providerId: 'me', studentIds: ['s1'], day: 3, start: 540, durationMin: 30, recurrence: 'weekly' },
    ];
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-17', studentId: 's1', sessionId: 'a', minutes: 30, status: 'missed', reason: 'My reason', makeupNeeded: true },
    ];
    const [g] = goalForecast(w, 's1', '2026-08-19');
    expect(g).toMatchObject({ delivered: 0, planned: 30, willMeet: false, shortBy: 30 });
  });

  it("counts today's still-unlogged visit as planned, but not a logged one", () => {
    const w = withGoal();
    w.sessions = [
      { id: 'a', providerId: 'me', studentIds: ['s1'], day: 2, start: 540, durationMin: 30, recurrence: 'weekly' },
    ];
    expect(goalForecast(w, 's1', '2026-08-19')[0].planned).toBe(30);
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-19', studentId: 's1', sessionId: 'a', minutes: 30, status: 'seen' },
    ];
    expect(goalForecast(w, 's1', '2026-08-19')[0].planned).toBe(0);
  });

  it('reports met with nothing planned once the target is reached', () => {
    const w = withGoal();
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-18', studentId: 's1', minutes: 60, status: 'seen' },
    ];
    const [g] = goalForecast(w, 's1', '2026-08-19');
    expect(g).toMatchObject({ met: true, willMeet: true, planned: 0, shortBy: 0 });
  });
});

describe('day overrides in the forecast', () => {
  function withGoalAndSession(): Workspace {
    const w = ws();
    w.students[0].serviceGoals = [{ providerId: 'me', type: 'direct', minutes: 60, period: 'weekly' }];
    w.sessions = [
      { id: 'a', providerId: 'me', studentIds: ['s1'], day: 3, start: 540, durationMin: 30, recurrence: 'weekly' },
    ];
    return w;
  }

  it('a skipped visit is no longer planned', () => {
    const w = withGoalAndSession();
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-20', studentId: 's1', sessionId: 'a', minutes: 30, status: 'skipped' },
    ];
    expect(goalForecast(w, 's1', '2026-08-19')[0].planned).toBe(0);
  });

  it('a day-plan keeps its (possibly changed) minutes in the forecast', () => {
    const w = withGoalAndSession();
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-20', studentId: 's1', sessionId: 'a', minutes: 20, start: 600, status: 'planned' },
    ];
    expect(goalForecast(w, 's1', '2026-08-19')[0].planned).toBe(20);
  });

  it('an added day-only visit counts as planned until it happens', () => {
    const w = withGoalAndSession();
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-21', studentId: 's1', minutes: 15, start: 500, status: 'planned' },
    ];
    expect(goalForecast(w, 's1', '2026-08-19')[0].planned).toBe(45); // 30 pattern + 15 added
  });

  it('planned and skipped never count as delivered', () => {
    const w = withGoalAndSession();
    w.sessionLogs = [
      { id: 'l1', date: '2026-08-18', studentId: 's1', minutes: 30, status: 'planned' },
      { id: 'l2', date: '2026-08-18', studentId: 's1', minutes: 30, status: 'skipped' },
    ];
    expect(deliveredMinutes(w, 's1', weekRangeOf('2026-08-19'))).toBe(0);
  });
});
