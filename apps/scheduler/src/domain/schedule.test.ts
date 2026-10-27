import { describe, expect, it } from 'vitest';
import { computeProviderWeek, computeStudentWeek, effectiveBlockedTime, findSiblingSessions } from './schedule';
import type { Grade, Session, Student, TimeBlock, Workspace } from './types';
import { emptyWorkspace } from './types';

const b = (day: number, start: number, end: number): TimeBlock => ({ day: day as TimeBlock['day'], start, end });

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.settings.schoolDayStart = 480; // 8:00
  ws.settings.schoolDayEnd = 900; // 15:00
  const grade: Grade = {
    id: 'g1',
    name: 'Grade 1',
    templatePolarity: 'blocked',
    templateBlocks: [b(0, 690, 735)], // Mon 11:30-12:15 lunch
  };
  const student: Student = { id: 'st1', displayId: '1', gradeId: 'g1', serviceGoals: [], overrides: [] };
  ws.grades.push(grade);
  ws.students.push(student);
  ws.providers.push({
    id: 'p1',
    name: 'OT Kate',
    color: '#7c5cff',
    availability: [
      { ...b(1, 480, 900), weeks: 'both' }, // Tue all day
      { ...b(4, 480, 900), weeks: 'A' }, // Fri week A only
    ],
  });
  return ws;
}

describe('effectiveBlockedTime', () => {
  it('blocked polarity passes blocks through, clamped to window', () => {
    const ws = fixture();
    expect(effectiveBlockedTime(ws.grades[0], [], ws.settings)).toEqual([b(0, 690, 735)]);
  });

  it('available polarity inverts within window', () => {
    const ws = fixture();
    const grade: Grade = {
      id: 'g2',
      name: 'G2',
      templatePolarity: 'available',
      templateBlocks: [b(0, 600, 660)], // only Mon 10-11 available
    };
    const blocked = effectiveBlockedTime(grade, [], ws.settings);
    expect(blocked).toContainEqual(b(0, 480, 600));
    expect(blocked).toContainEqual(b(0, 660, 900));
    for (let d = 1; d < 5; d++) expect(blocked).toContainEqual(b(d, 480, 900));
  });

  it('unblock override carves availability out of a template block', () => {
    const ws = fixture();
    const blocked = effectiveBlockedTime(
      ws.grades[0],
      [{ id: 'o1', kind: 'unblock', block: b(0, 700, 720) }],
      ws.settings,
    );
    expect(blocked).toEqual([b(0, 690, 700), b(0, 720, 735)]);
  });

  it('block override adds student-specific blocked time', () => {
    const ws = fixture();
    const blocked = effectiveBlockedTime(
      ws.grades[0],
      [{ id: 'o2', kind: 'block', block: b(2, 500, 530), label: 'reading group' }],
      ws.settings,
    );
    expect(blocked).toContainEqual(b(2, 500, 530));
  });

  it('optional blocks bind only opted-in students', () => {
    const ws = fixture();
    ws.grades[0].templateBlocks = [
      { ...b(0, 690, 735), label: 'Lunch' },
      { ...b(0, 540, 570), label: 'ELD', optional: true },
    ];
    const strip = (blocks: TimeBlock[]) => blocks.map(({ day, start, end }) => ({ day, start, end }));
    const without = effectiveBlockedTime(ws.grades[0], [], ws.settings, []);
    expect(strip(without)).toEqual([b(0, 690, 735)]);
    const withEld = effectiveBlockedTime(ws.grades[0], [], ws.settings, ['ELD']);
    expect(strip(withEld)).toEqual([b(0, 540, 570), b(0, 690, 735)]);
  });

  it('overrides apply in order', () => {
    const ws = fixture();
    const blocked = effectiveBlockedTime(
      ws.grades[0],
      [
        { id: 'o1', kind: 'unblock', block: b(0, 690, 735) },
        { id: 'o2', kind: 'block', block: b(0, 700, 710) },
      ],
      ws.settings,
    );
    expect(blocked).toEqual([b(0, 700, 710)]);
  });
});

describe('computeStudentWeek', () => {
  it('marks template blocks, sessions, and gaps that tile the whole window', () => {
    const ws = fixture();
    const session: Session = {
      id: 's1',
      providerId: 'p1',
      studentIds: ['st1'],
      day: 1,
      start: 600,
      durationMin: 30,
      recurrence: 'weekly',
    };
    ws.sessions.push(session);
    const week = computeStudentWeek('st1', 'A', ws);

    expect(week.find((i) => i.kind === 'session')).toMatchObject({ day: 1, start: 600, end: 630 });
    expect(week.find((i) => i.kind === 'template-block')).toMatchObject({ day: 0, start: 690, end: 735 });

    // Intervals tile each day completely with no overlap.
    for (let day = 0; day < 5; day++) {
      const dayIntervals = week.filter((i) => i.day === day).sort((a, x) => a.start - x.start);
      expect(dayIntervals[0].start).toBe(480);
      expect(dayIntervals[dayIntervals.length - 1].end).toBe(900);
      for (let i = 1; i < dayIntervals.length; i++) {
        expect(dayIntervals[i].start).toBe(dayIntervals[i - 1].end);
      }
    }
  });

  it('labeled template blocks keep their label on the student week', () => {
    const ws = fixture();
    ws.grades[0].templateBlocks = [{ ...b(0, 690, 735), label: 'Lunch' }, b(1, 600, 630)];
    const week = computeStudentWeek('st1', 'A', ws);
    expect(week).toContainEqual(
      expect.objectContaining({ day: 0, start: 690, end: 735, kind: 'template-block', label: 'Lunch' }),
    );
    expect(week).toContainEqual(
      expect.objectContaining({ day: 1, start: 600, end: 630, kind: 'template-block', label: undefined }),
    );
  });

  it('overlapping labeled blocks still tile without overlap', () => {
    const ws = fixture();
    ws.grades[0].templateBlocks = [
      { ...b(0, 600, 660), label: 'Math' },
      { ...b(0, 630, 700), label: 'ELD' },
    ];
    const week = computeStudentWeek('st1', 'A', ws);
    const day0 = week.filter((i) => i.day === 0).sort((a, x) => a.start - x.start);
    for (let i = 1; i < day0.length; i++) expect(day0[i].start).toBe(day0[i - 1].end);
    expect(day0.find((i) => i.start === 600)?.label).toBe('Math');
    expect(day0.find((i) => i.start === 660)?.label).toBe('ELD');
  });

  it('biweekly session appears only in its parity', () => {
    const ws = fixture();
    ws.sessions.push({
      id: 's2',
      providerId: 'p1',
      studentIds: ['st1'],
      day: 1,
      start: 600,
      durationMin: 30,
      recurrence: 'biweekly',
      weekParity: 'B',
    });
    expect(computeStudentWeek('st1', 'A', ws).some((i) => i.kind === 'session')).toBe(false);
    expect(computeStudentWeek('st1', 'B', ws).some((i) => i.kind === 'session')).toBe(true);
  });
});

describe('every-week combined views', () => {
  it('computeStudentWeekAll shows both parities, tiled without overlap', async () => {
    const { computeStudentWeekAll } = await import('./schedule');
    const ws = fixture();
    ws.sessions.push(
      { id: 'a', providerId: 'p1', studentIds: ['st1'], day: 1, start: 600, durationMin: 25, recurrence: 'biweekly', weekParity: 'A' },
      { id: 'b', providerId: 'p1', studentIds: ['st1'], day: 1, start: 600, durationMin: 20, recurrence: 'biweekly', weekParity: 'B' },
      { id: 'c', providerId: 'p1', studentIds: ['st1'], day: 4, start: 480, durationMin: 30, recurrence: 'weekly' },
    );
    const week = computeStudentWeekAll('st1', ws);
    expect(week.filter((i) => i.kind === 'session')).toHaveLength(3);
    // gaps never overlap any session
    const sessions = week.filter((i) => i.kind === 'session');
    for (const g of week.filter((i) => i.kind === 'gap')) {
      for (const s of sessions) {
        expect(g.day === s.day && g.start < s.end && s.start < g.end).toBe(false);
      }
    }
  });

  it('computeProviderWeekAll unions availability across parities', async () => {
    const { computeProviderWeekAll } = await import('./schedule');
    const ws = fixture();
    // p1 is Tue both + Fri week A only - combined shows Fri as available
    const week = computeProviderWeekAll('p1', ws);
    expect(week.some((i) => i.day === 4 && i.kind === 'gap')).toBe(true);
    expect(week.filter((i) => i.day === 0).every((i) => i.kind === 'unavailable')).toBe(true);
  });
});

describe('findSiblingSessions', () => {
  const base: Session = {
    id: 'a',
    providerId: 'p1',
    studentIds: ['stu-1', 'stu-2'],
    day: 0,
    start: 480,
    durationMin: 30,
    recurrence: 'weekly',
    note: 'LS1',
  };

  it('finds the same session repeated on other days', () => {
    const ws = fixture();
    ws.sessions.push(
      base,
      { ...base, id: 'b', day: 1 },
      { ...base, id: 'c', day: 3, studentIds: ['stu-2', 'stu-1'] }, // order-insensitive
    );
    expect(findSiblingSessions(base, ws).map((s) => s.id).sort()).toEqual(['b', 'c']);
  });

  it('different time, students, or note breaks siblinghood', () => {
    const ws = fixture();
    ws.sessions.push(
      base,
      { ...base, id: 'x', day: 1, start: 510 },
      { ...base, id: 'y', day: 2, studentIds: ['stu-1'] },
      { ...base, id: 'z', day: 3, note: 'LS2' },
    );
    expect(findSiblingSessions(base, ws)).toEqual([]);
  });
});

describe('computeProviderWeek', () => {
  it('week-A-only availability is unavailable in week B', () => {
    const ws = fixture();
    const weekA = computeProviderWeek('p1', 'A', ws);
    const weekB = computeProviderWeek('p1', 'B', ws);
    expect(weekA.some((i) => i.day === 4 && i.kind === 'gap')).toBe(true);
    expect(weekB.filter((i) => i.day === 4).every((i) => i.kind === 'unavailable')).toBe(true);
    // Monday: never available for this provider
    expect(weekA.filter((i) => i.day === 0).every((i) => i.kind === 'unavailable')).toBe(true);
  });

  it('sessions carve into available time', () => {
    const ws = fixture();
    ws.sessions.push({
      id: 's3',
      providerId: 'p1',
      studentIds: ['st1'],
      day: 1,
      start: 600,
      durationMin: 20,
      recurrence: 'weekly',
    });
    const week = computeProviderWeek('p1', 'A', ws);
    expect(week.find((i) => i.kind === 'session')).toMatchObject({ day: 1, start: 600, end: 620 });
    expect(week).toContainEqual(expect.objectContaining({ day: 1, start: 620, kind: 'gap' }));
  });
});
