import { describe, expect, it } from 'vitest';
import { existingConflictKeys, partitionConflicts, validateBooking, type SessionDraft } from './validation';
import type { TimeBlock, Workspace } from './types';
import { emptyWorkspace } from './types';

const b = (day: number, start: number, end: number): TimeBlock => ({ day: day as TimeBlock['day'], start, end });

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.settings.schoolDayStart = 480;
  ws.settings.schoolDayEnd = 900;
  ws.grades.push({
    id: 'g1',
    name: 'Grade 1',
    templatePolarity: 'blocked',
    templateBlocks: [b(1, 690, 735)], // Tue lunch
  });
  ws.providers.push({
    id: 'p1',
    name: 'OT',
    color: '#7c5cff',
    availability: [{ ...b(1, 480, 900), weeks: 'both' }], // Tue only
  });
  ws.providers.push({
    id: 'p2',
    name: 'Speech',
    color: '#00a5a5',
    availability: [{ ...b(1, 480, 900), weeks: 'both' }],
  });
  for (const id of ['st1', 'st2', 'st3']) {
    ws.students.push({ id, displayId: id.slice(2), gradeId: 'g1', serviceGoals: [], overrides: [] });
  }
  return ws;
}

const draft = (over: Partial<SessionDraft> = {}): SessionDraft => ({
  providerId: 'p1',
  studentIds: ['st1'],
  day: 1,
  start: 600,
  durationMin: 30,
  recurrence: 'weekly',
  ...over,
});

describe('validateBooking', () => {
  it('valid draft has no conflicts', () => {
    expect(validateBooking(draft(), fixture())).toEqual([]);
  });

  it('flags off-grid start', () => {
    expect(validateBooking(draft({ start: 602 }), fixture())).toContainEqual({ type: 'off-grid' });
  });

  it('flags outside school day', () => {
    expect(validateBooking(draft({ start: 880 }), fixture())).toContainEqual({ type: 'outside-school-day' });
  });

  it('flags empty student list', () => {
    expect(validateBooking(draft({ studentIds: [] }), fixture())).toContainEqual({ type: 'no-students' });
  });

  it('flags provider off-site day', () => {
    expect(validateBooking(draft({ day: 0 }), fixture())).toContainEqual({
      type: 'provider-unavailable',
      providerId: 'p1',
    });
  });

  it('flags student blocked by master schedule', () => {
    expect(validateBooking(draft({ start: 700 }), fixture())).toContainEqual({
      type: 'student-blocked',
      studentId: 'st1',
      label: undefined,
    });
  });

  it('optional ELD blocks only students who opted in', () => {
    const ws = fixture();
    ws.grades[0].templateBlocks = [{ day: 1, start: 600, end: 630, label: 'ELD', optional: true }];
    expect(validateBooking(draft(), ws)).toEqual([]); // st1 not opted in
    ws.students[0].optionalBlocks = ['ELD'];
    expect(validateBooking(draft(), ws)).toContainEqual({
      type: 'student-blocked',
      studentId: 'st1',
      label: 'ELD',
    });
  });

  it('reports the template block label in student-blocked conflicts', () => {
    const ws = fixture();
    ws.grades[0].templateBlocks = [{ day: 1, start: 690, end: 735, label: 'Lunch' }];
    expect(validateBooking(draft({ start: 700 }), ws)).toContainEqual({
      type: 'student-blocked',
      studentId: 'st1',
      label: 'Lunch',
    });
  });

  it('flags provider double-booking', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p1', studentIds: ['st2'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly' });
    expect(validateBooking(draft(), ws)).toContainEqual({ type: 'provider-busy', providerId: 'p1', sessionId: 's1' });
  });

  it('flags student double-booking across providers (two-sided blocking)', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p2', studentIds: ['st1'], day: 1, start: 610, durationMin: 20, recurrence: 'weekly' });
    expect(validateBooking(draft(), ws)).toContainEqual({ type: 'student-busy', studentId: 'st1', sessionId: 's1' });
  });

  it('group booking reports only the conflicting student of three', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p2', studentIds: ['st3'], day: 1, start: 600, durationMin: 15, recurrence: 'weekly' });
    const conflicts = validateBooking(draft({ studentIds: ['st1', 'st2', 'st3'] }), ws);
    expect(conflicts).toEqual([{ type: 'student-busy', studentId: 'st3', sessionId: 's1' }]);
  });

  it('biweekly-A does not conflict with biweekly-B in the same slot', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p1', studentIds: ['st1'], day: 1, start: 600, durationMin: 30, recurrence: 'biweekly', weekParity: 'A' });
    expect(validateBooking(draft({ recurrence: 'biweekly', weekParity: 'B' }), ws)).toEqual([]);
  });

  it('biweekly conflicts with weekly in the same slot', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p1', studentIds: ['st1'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly' });
    const conflicts = validateBooking(draft({ recurrence: 'biweekly', weekParity: 'B' }), ws);
    expect(conflicts).toContainEqual({ type: 'provider-busy', providerId: 'p1', sessionId: 's1' });
    expect(conflicts).toContainEqual({ type: 'student-busy', studentId: 'st1', sessionId: 's1' });
  });

  it('weekly draft needs provider availability in BOTH parities', () => {
    const ws = fixture();
    ws.providers[0].availability = [{ ...b(1, 480, 900), weeks: 'A' }]; // Tue week A only
    expect(validateBooking(draft(), ws)).toContainEqual({ type: 'provider-unavailable', providerId: 'p1' });
    expect(validateBooking(draft({ recurrence: 'biweekly', weekParity: 'A' }), ws)).toEqual([]);
  });

  it('cross-provider student overlap partitions as soft (bookable with warning)', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p2', studentIds: ['st1'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly' });
    const d = draft();
    const { hard, soft } = partitionConflicts(validateBooking(d, ws), d, ws);
    expect(hard).toEqual([]);
    expect(soft).toEqual([{ type: 'student-busy', studentId: 'st1', sessionId: 's1' }]);
  });

  it('same-provider overlap stays hard', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p1', studentIds: ['st1'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly' });
    const d = draft();
    const { hard, soft } = partitionConflicts(validateBooking(d, ws), d, ws);
    expect(soft).toEqual([]);
    expect(hard).toContainEqual({ type: 'provider-busy', providerId: 'p1', sessionId: 's1' });
    expect(hard).toContainEqual({ type: 'student-busy', studentId: 'st1', sessionId: 's1' });
  });

  it('team-row providers overlap themselves with a warning, not a block', () => {
    const ws = fixture();
    ws.providers[0].isTeam = true;
    ws.sessions.push({ id: 's1', providerId: 'p1', studentIds: ['st2'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly', note: 'LS5' });
    const d = draft(); // p1, st1, same slot
    const { hard, soft } = partitionConflicts(validateBooking(d, ws), d, ws);
    expect(hard).toEqual([]);
    expect(soft).toContainEqual({ type: 'provider-busy', providerId: 'p1', sessionId: 's1' });
  });

  it('pre-existing conflicts grandfather into warnings when editing', () => {
    const ws = fixture();
    // stored session sits on blocked lunch AND overlaps p2's session with st1
    ws.sessions.push(
      { id: 'edit-me', providerId: 'p1', studentIds: ['st1'], day: 1, start: 700, durationMin: 30, recurrence: 'weekly' },
      { id: 'other', providerId: 'p2', studentIds: ['st1'], day: 1, start: 700, durationMin: 30, recurrence: 'weekly' },
    );
    const stored = ws.sessions[0];
    const grandfathered = existingConflictKeys(stored, ws);
    // Edit that only changes duration - old conflicts remain but must not block
    const d = draft({ start: 700, durationMin: 25 });
    const { hard, soft } = partitionConflicts(validateBooking(d, ws, 'edit-me'), d, ws, grandfathered);
    expect(hard).toEqual([]);
    expect(soft.length).toBeGreaterThanOrEqual(2);
    // But moving onto a NEW conflict still blocks: p1 gets a second session elsewhere
    ws.sessions.push({ id: 'p1-other', providerId: 'p1', studentIds: ['st2'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly' });
    const moved = draft({ start: 600 });
    const res = partitionConflicts(validateBooking(moved, ws, 'edit-me'), moved, ws, grandfathered);
    expect(res.hard).toContainEqual({ type: 'provider-busy', providerId: 'p1', sessionId: 'p1-other' });
  });

  it('excludeSessionId allows editing a session in place', () => {
    const ws = fixture();
    ws.sessions.push({ id: 's1', providerId: 'p1', studentIds: ['st1'], day: 1, start: 600, durationMin: 30, recurrence: 'weekly' });
    expect(validateBooking(draft(), ws, 's1')).toEqual([]);
  });

  it('unblock override makes blocked lunch bookable', () => {
    const ws = fixture();
    ws.students[0].overrides.push({ id: 'o1', kind: 'unblock', block: b(1, 690, 735) });
    expect(validateBooking(draft({ start: 700, durationMin: 30 }), ws)).toEqual([]);
  });
});

describe('another provider into a student block', () => {
  function blockWs(): Workspace {
    const ws = emptyWorkspace();
    ws.providers = [
      { id: 'me', name: 'OT', isMe: true, color: '#111', availability: [{ day: 0, start: 450, end: 930, weeks: 'both' }] },
      { id: 'ls', name: 'LS', color: '#222', availability: [{ day: 0, start: 450, end: 930, weeks: 'both' }] },
    ];
    ws.grades = [
      {
        id: 'g',
        name: 'Grade 2',
        templatePolarity: 'blocked',
        templateBlocks: [{ day: 0, start: 600, end: 660 }],
      },
    ];
    ws.students = [{ id: 's1', displayId: '1', gradeId: 'g', serviceGoals: [], overrides: [] }];
    return ws;
  }

  const draft = (providerId: string): SessionDraft => ({
    providerId,
    studentIds: ['s1'],
    day: 0,
    start: 615,
    durationMin: 30,
    recurrence: 'weekly',
  });

  it("softens a colleague's session inside the block to a warning", () => {
    const ws = blockWs();
    const conflicts = validateBooking(draft('ls'), ws);
    expect(conflicts.some((c) => c.type === 'student-blocked')).toBe(true);
    const { hard, soft } = partitionConflicts(conflicts, draft('ls'), ws);
    expect(hard).toEqual([]);
    expect(soft.some((c) => c.type === 'student-blocked')).toBe(true);
  });

  it('keeps the block hard for my own sessions', () => {
    const ws = blockWs();
    const conflicts = validateBooking(draft('me'), ws);
    const { hard } = partitionConflicts(conflicts, draft('me'), ws);
    expect(hard.some((c) => c.type === 'student-blocked')).toBe(true);
  });

  it('falls back to the first provider as "me" when none is marked', () => {
    const ws = blockWs();
    ws.providers[0].isMe = undefined;
    const { hard } = partitionConflicts(validateBooking(draft('me'), ws), draft('me'), ws);
    expect(hard.some((c) => c.type === 'student-blocked')).toBe(true);
    const { hard: lsHard } = partitionConflicts(validateBooking(draft('ls'), ws), draft('ls'), ws);
    expect(lsHard.some((c) => c.type === 'student-blocked')).toBe(false);
  });
});
