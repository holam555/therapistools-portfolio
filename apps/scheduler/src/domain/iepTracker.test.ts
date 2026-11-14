import { describe, expect, it } from 'vitest';
import { isCaseDone, isDueSoon, isOverdue, newIepCase, serviceSummary, sortCases } from './iepTracker';
import { emptyWorkspace } from './types';

describe('sortCases', () => {
  it('puts the soonest deadline first and undated cases last', () => {
    const mk = (id: string, dateDue: string) => ({ ...newIepCase('s'), id, dateDue });
    const sorted = sortCases([mk('later', '2026-11-01'), mk('none', ''), mk('soon', '2026-09-01')], () => 0);
    expect(sorted.map((c) => c.id)).toEqual(['soon', 'later', 'none']);
  });

  it('breaks ties by student number', () => {
    const a = { ...newIepCase('s2'), dateDue: '2026-09-01' };
    const b = { ...newIepCase('s1'), dateDue: '2026-09-01' };
    const numbers: Record<string, number> = { s1: 1, s2: 2 };
    expect(sortCases([a, b], (id) => numbers[id]).map((c) => c.studentId)).toEqual(['s1', 's2']);
  });
});

describe('deadline states', () => {
  const allDone = {
    checklistSent: true,
    checklistReceived: true,
    informalTesting: true,
    formalTesting: true,
  };

  it('a case is done when every step is checked', () => {
    expect(isCaseDone(newIepCase('s'))).toBe(false);
    expect(isCaseDone({ ...newIepCase('s'), ...allDone })).toBe(true);
    expect(isCaseDone({ ...newIepCase('s'), ...allDone, formalTesting: false })).toBe(false);
  });

  it('overdue = past due and checklist not finished', () => {
    const c = { ...newIepCase('s'), dateDue: '2026-08-01' };
    expect(isOverdue(c, '2026-08-18')).toBe(true);
    expect(isOverdue({ ...c, ...allDone }, '2026-08-18')).toBe(false);
    expect(isOverdue({ ...c, dateDue: '' }, '2026-08-18')).toBe(false);
  });

  it('due soon = within two weeks, not past, not done', () => {
    const c = { ...newIepCase('s'), dateDue: '2026-08-30' };
    expect(isDueSoon(c, '2026-08-18')).toBe(true);
    expect(isDueSoon({ ...c, dateDue: '2026-10-01' }, '2026-08-18')).toBe(false);
    expect(isDueSoon({ ...c, ...allDone }, '2026-08-18')).toBe(false);
  });
});

describe('serviceSummary', () => {
  it('reads direct and indirect goals and booked weekly minutes', () => {
    const ws = emptyWorkspace();
    ws.students = [
      {
        id: 's1',
        displayId: '1',
        gradeId: 'g',
        overrides: [],
        serviceGoals: [
          { providerId: 'p', type: 'direct', minutes: 90, period: 'monthly' },
          { providerId: 'p', type: 'indirect', minutes: 30, period: 'monthly' },
          { providerId: 'q', type: 'indirect' },
        ],
      },
    ];
    ws.sessions = [
      { id: 'a', providerId: 'p', studentIds: ['s1'], day: 0, start: 540, durationMin: 30, recurrence: 'weekly' },
      { id: 'b', providerId: 'p', studentIds: ['s1'], day: 2, start: 540, durationMin: 30, recurrence: 'biweekly', weekParity: 'A' },
    ];
    expect(serviceSummary(ws, 's1')).toEqual({
      direct: '90 min/mo',
      indirect: '30 min/mo + consult',
      bookedPerWeek: 45,
    });
  });

  it('is all empty for an unknown student', () => {
    expect(serviceSummary(emptyWorkspace(), 'nope')).toEqual({ direct: '', indirect: '', bookedPerWeek: 0 });
  });
});
