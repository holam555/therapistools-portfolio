import { describe, expect, it } from 'vitest';
import { buildStudentCards, formatCardTime, formatDays } from './studentCards';
import type { DayOfWeek, Session, Workspace } from './types';
import { emptyWorkspace } from './types';

function ws(): Workspace {
  const base = emptyWorkspace();
  base.providers = [
    { id: 'p-ot', name: 'Kate', discipline: 'OT', color: '#123456', availability: [] },
    { id: 'p-sp', name: 'Speech', color: '#654321', availability: [] },
    { id: 'p-ls', name: 'LS team', discipline: 'LS', color: '#abcdef', availability: [] },
  ];
  base.students = [
    { id: 's1', displayId: '1', gradeId: 'g', serviceGoals: [], overrides: [] },
    { id: 's2', displayId: '2', gradeId: 'g', serviceGoals: [], overrides: [] },
  ];
  return base;
}

const session = (over: Partial<Session> & Pick<Session, 'id' | 'providerId' | 'studentIds' | 'day' | 'start'>): Session => ({
  durationMin: 30,
  recurrence: 'weekly',
  ...over,
});

describe('formatDays', () => {
  it('spells out a single day and abbreviates several', () => {
    expect(formatDays([3])).toBe('Thursday');
    expect(formatDays([0, 1, 3, 4])).toBe('M, T, Th, Fri');
  });

  it('sorts into week order and drops duplicates', () => {
    expect(formatDays([4, 0, 4])).toBe('M, Fri');
  });
});

describe('formatCardTime', () => {
  it('drops :00 from a start on the hour but keeps it on the end', () => {
    expect(formatCardTime(540, 570)).toBe('9-9:30');
    expect(formatCardTime(630, 660)).toBe('10:30-11:00');
  });

  it('keeps minutes when they are not on the hour', () => {
    expect(formatCardTime(590, 610)).toBe('9:50-10:10');
  });

  it('reads afternoons on a 12-hour clock', () => {
    expect(formatCardTime(780, 795)).toBe('1-1:15');
  });
});

describe('buildStudentCards', () => {
  it('collapses one provider at one time across days into a single row', () => {
    const w = ws();
    const days: DayOfWeek[] = [0, 1, 3, 4];
    w.sessions = days.map((day, i) =>
      session({ id: `x${i}`, providerId: 'p-ls', studentIds: ['s1'], day, start: 630, durationMin: 15 }),
    );
    const [card] = buildStudentCards(w);
    expect(card.rows).toEqual([{ provider: 'LS', days: 'M, T, Th, Fri', time: '10:30-10:45' }]);
  });

  it('orders rows by time of day and labels providers by discipline', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 630 }),
      session({ id: 'b', providerId: 'p-sp', studentIds: ['s1'], day: 3, start: 540 }),
    ];
    const [card] = buildStudentCards(w);
    expect(card.rows.map((r) => r.provider)).toEqual(['Speech', 'OT']);
    expect(card.rows[0]).toEqual({ provider: 'Speech', days: 'Thursday', time: '9-9:30' });
  });

  it('keeps different times for the same provider on separate rows', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 540 }),
      session({ id: 'b', providerId: 'p-ot', studentIds: ['s1'], day: 2, start: 630 }),
    ];
    expect(buildStudentCards(w)[0].rows).toHaveLength(2);
  });

  it('marks an every-other-week session so the card does not overstate service', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 1, start: 540, recurrence: 'biweekly', weekParity: 'A' }),
    ];
    expect(buildStudentCards(w)[0].rows[0].days).toBe('Tuesday (week A)');
  });

  it('gives every member of a group session the row', () => {
    const w = ws();
    w.sessions = [session({ id: 'a', providerId: 'p-ot', studentIds: ['s1', 's2'], day: 1, start: 540 })];
    const cards = buildStudentCards(w);
    expect(cards.map((c) => c.studentId)).toEqual(['1', '2']);
  });

  it('joins back-to-back blocks from one provider into a single time range', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 630, durationMin: 15 }),
      session({ id: 'b', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 645, durationMin: 15 }),
    ];
    expect(buildStudentCards(w)[0].rows).toEqual([{ provider: 'OT', days: 'Monday', time: '10:30-11:00' }]);
  });

  it('joins a run of three', () => {
    const w = ws();
    w.sessions = [0, 1, 2].map((i) =>
      session({ id: `r${i}`, providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 540 + i * 20, durationMin: 20 }),
    );
    expect(buildStudentCards(w)[0].rows[0].time).toBe('9-10:00');
  });

  it('keeps a break between blocks visible', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 630, durationMin: 15 }),
      session({ id: 'b', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 650, durationMin: 15 }),
    ];
    expect(buildStudentCards(w)[0].rows.map((r) => r.time)).toEqual(['10:30-10:45', '10:50-11:05']);
  });

  it('does not join two different providers who happen to be back to back', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 630, durationMin: 15 }),
      session({ id: 'b', providerId: 'p-ls', studentIds: ['s1'], day: 0, start: 645, durationMin: 15 }),
    ];
    expect(buildStudentCards(w)[0].rows).toHaveLength(2);
  });

  it('does not join across alternating weeks', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 630, durationMin: 15, recurrence: 'biweekly', weekParity: 'A' }),
      session({ id: 'b', providerId: 'p-ot', studentIds: ['s1'], day: 0, start: 645, durationMin: 15, recurrence: 'biweekly', weekParity: 'B' }),
    ];
    expect(buildStudentCards(w)[0].rows).toHaveLength(2);
  });

  it('joins first, then collapses days, so a split session still reads as one line', () => {
    const w = ws();
    const days: DayOfWeek[] = [0, 3];
    w.sessions = days.flatMap((day) => [
      session({ id: `a${day}`, providerId: 'p-ot', studentIds: ['s1'], day, start: 540, durationMin: 30 }),
      session({ id: `b${day}`, providerId: 'p-ot', studentIds: ['s1'], day, start: 570, durationMin: 30 }),
    ]);
    expect(buildStudentCards(w)[0].rows).toEqual([{ provider: 'OT', days: 'M, Th', time: '9-10:00' }]);
  });

  it('folds an overlap rather than printing two rows that contradict each other', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ls', studentIds: ['s1'], day: 0, start: 630, durationMin: 30 }),
      session({ id: 'b', providerId: 'p-ls', studentIds: ['s1'], day: 0, start: 645, durationMin: 30 }),
    ];
    expect(buildStudentCards(w)[0].rows).toEqual([{ provider: 'LS', days: 'Monday', time: '10:30-11:15' }]);
  });

  it('leaves out students with nothing booked', () => {
    const w = ws();
    w.sessions = [session({ id: 'a', providerId: 'p-ot', studentIds: ['s2'], day: 1, start: 540 })];
    expect(buildStudentCards(w).map((c) => c.studentId)).toEqual(['2']);
  });

  it('can narrow to one student', () => {
    const w = ws();
    w.sessions = [
      session({ id: 'a', providerId: 'p-ot', studentIds: ['s1'], day: 1, start: 540 }),
      session({ id: 'b', providerId: 'p-ot', studentIds: ['s2'], day: 2, start: 540 }),
    ];
    expect(buildStudentCards(w, ['s2']).map((c) => c.studentId)).toEqual(['2']);
  });

  it('falls back to the provider row name when no discipline is set', () => {
    const w = ws();
    w.sessions = [session({ id: 'a', providerId: 'p-sp', studentIds: ['s1'], day: 1, start: 540 })];
    expect(buildStudentCards(w)[0].rows[0].provider).toBe('Speech');
  });
});
