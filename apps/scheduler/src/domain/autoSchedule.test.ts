import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN_RULES,
  chunkNeededExact,
  chunkWeeklyMinutes,
  generatePlan,
  weeklyGoalMinutes,
} from './autoSchedule';
import type { TimeBlock, Workspace } from './types';
import { emptyWorkspace } from './types';

const b = (day: number, start: number, end: number): TimeBlock => ({ day: day as TimeBlock['day'], start, end });

describe('weeklyGoalMinutes', () => {
  it.each([
    [{ providerId: 'p', type: 'direct', minutes: 20, period: 'weekly' }, 20],
    [{ providerId: 'p', type: 'direct', minutes: 90, period: 'monthly' }, 22.5],
    [{ providerId: 'p', type: 'direct', minutes: 120, period: 'monthly' }, 30],
    [{ providerId: 'p', type: 'direct', minutes: 160, period: 'quarterly' }, 20],
    [{ providerId: 'p', type: 'direct', minutes: 320, period: 'semesterly' }, 20],
    [{ providerId: 'p', type: 'direct', minutes: 360, period: 'yearly' }, 10],
  ] as const)('%j → %d min/week', (goal, expected) => {
    expect(weeklyGoalMinutes(goal)).toBe(expected);
  });
});

describe('chunkNeededExact - never more than needed', () => {
  it('exact weekly lengths pass through', () => {
    expect(chunkNeededExact(30)).toEqual({ chunks: [{ kind: 'weekly', len: 30 }], leftover: 0 });
    expect(chunkNeededExact(20)).toEqual({ chunks: [{ kind: 'weekly', len: 20 }], leftover: 0 });
  });
  it('22.5/week becomes week-A 25 / week-B 20 in one slot (exactly 90/month)', () => {
    expect(chunkNeededExact(22.5)).toEqual({
      chunks: [{ kind: 'alternating', lenA: 25, lenB: 20 }],
      leftover: 0,
    });
  });
  it('7.5/week becomes one biweekly 15', () => {
    expect(chunkNeededExact(7.5)).toEqual({ chunks: [{ kind: 'biweekly', len: 15 }], leftover: 0 });
  });
  it('45 splits into 30 + 15 weekly', () => {
    expect(chunkNeededExact(45)).toEqual({
      chunks: [
        { kind: 'weekly', len: 30 },
        { kind: 'weekly', len: 15 },
      ],
      leftover: 0,
    });
  });
  it('5/week becomes one biweekly 10 (only when 10s are allowed)', () => {
    expect(chunkNeededExact(5, 10)).toEqual({ chunks: [{ kind: 'biweekly', len: 10 }], leftover: 0 });
    expect(chunkNeededExact(5, 15)).toEqual({ chunks: [], leftover: 5 });
  });

  it('15-minute floor: 10/week becomes a biweekly 20 instead of a weekly 10', () => {
    expect(chunkNeededExact(10, 15)).toEqual({ chunks: [{ kind: 'biweekly', len: 20 }], leftover: 0 });
    expect(chunkNeededExact(12.5, 15)).toEqual({ chunks: [{ kind: 'biweekly', len: 25 }], leftover: 0 });
    // alternating pair must keep both halves at 15+
    expect(chunkNeededExact(17.5, 15)).toEqual({
      chunks: [{ kind: 'alternating', lenA: 20, lenB: 15 }],
      leftover: 0,
    });
  });
  it('round-up mode turns fractional goals into plain weekly sessions', () => {
    expect(chunkNeededExact(22.5, 15, true)).toEqual({ chunks: [{ kind: 'weekly', len: 25 }], leftover: 0 });
    expect(chunkNeededExact(7.5, 15, true)).toEqual({ chunks: [{ kind: 'weekly', len: 15 }], leftover: 0 });
    expect(chunkNeededExact(30, 15, true)).toEqual({ chunks: [{ kind: 'weekly', len: 30 }], leftover: 0 });
  });

  it('round-up plans contain no biweekly or alternating proposals', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, roundUpFractional: true });
    expect(plan.proposals.every((p) => p.recurrence === 'weekly')).toBe(true);
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
    const st1 = plan.students.find((s) => s.studentId === 'stu-1')!;
    expect(st1.proposedMin).toBe(25); // 22.5 goal rounded up
  });

  it('an unrepresentable sliver is reported, not rounded up', () => {
    const { chunks, leftover } = chunkNeededExact(2.5);
    expect(chunks).toEqual([]);
    expect(leftover).toBe(2.5);
  });
  it('every result averages EXACTLY the need - never over - at both floors', () => {
    for (const minLen of [10, 15] as const) {
      for (const needed of [10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 37.5, 45, 60]) {
        const { chunks, leftover } = chunkNeededExact(needed, minLen);
        const total = chunks.reduce((s, c) => s + chunkWeeklyMinutes(c), 0) + leftover;
        expect(total).toBeCloseTo(needed);
        for (const c of chunks) {
          const lens = c.kind === 'alternating' ? [c.lenA, c.lenB] : [c.len];
          for (const l of lens) expect(l).toBeGreaterThanOrEqual(minLen);
        }
      }
    }
  });
});

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.settings.schoolDayStart = 450; // 7:30
  ws.settings.schoolDayEnd = 930; // 3:30
  ws.grades.push({
    id: 'g1',
    name: 'Grade 1',
    level: 1,
    templatePolarity: 'blocked',
    templateBlocks: ([0, 1, 2, 3, 4] as const).map((day) => ({ day, start: 690, end: 735, label: 'Lunch' })),
  });
  ws.providers.push({
    id: 'ot',
    name: 'OT',
    color: '#c75b39',
    availability: [
      { ...b(0, 450, 930), weeks: 'both' }, // Mon
      { ...b(3, 450, 930), weeks: 'both' }, // Thu
    ],
  });
  const mk = (n: number, minutes: number, period: 'weekly' | 'monthly') => ({
    id: `stu-${n}`,
    displayId: String(n),
    gradeId: 'g1',
    serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes, period }],
    overrides: [],
  });
  ws.students.push(mk(1, 90, 'monthly'), mk(2, 120, 'monthly'), mk(3, 20, 'weekly'));
  return ws;
}

describe('a student with two services from the same provider', () => {
  it('plans the combined minutes of BOTH goals, not just the first', () => {
    const ws = fixture();
    // Student 3's 20 min/week gains a second service: 60 min/month (= 15/wk).
    ws.students[2].serviceGoals.push({
      providerId: 'ot',
      type: 'direct',
      minutes: 60,
      period: 'monthly',
    });
    const plan = generatePlan('ot', ws);
    const s3 = plan.students.find((s) => s.studentId === 'stu-3')!;
    expect(s3.goalLabel).toBe('20 min/week + 60 min/month');
    const proposed = plan.proposals
      .filter((p) => p.studentIds.includes('stu-3'))
      .reduce((sum, p) => sum + p.durationMin, 0);
    expect(proposed).toBe(35); // 20 + 15, both services
    expect(s3.unmetMin).toBe(0);
  });

  it('ignores indirect goals and other providers when combining', () => {
    const ws = fixture();
    ws.students[2].serviceGoals.push(
      { providerId: 'ot', type: 'indirect' },
      { providerId: 'someone-else', type: 'direct', minutes: 500, period: 'weekly' },
    );
    const plan = generatePlan('ot', ws);
    const s3 = plan.students.find((s) => s.studentId === 'stu-3')!;
    expect(s3.goalLabel).toBe('20 min/week');
  });
});

describe('generatePlan with rules', () => {
  it('meets every goal exactly, respecting all rules', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws);
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
    for (const s of plan.students) {
      expect(s.proposedMin + s.existingWeeklyMin).toBeCloseTo(s.weeklyGoalMin); // never over
    }
    for (const p of plan.proposals) {
      expect([0, 3]).toContain(p.day);
      expect(p.start).toBeGreaterThanOrEqual(DEFAULT_PLAN_RULES.earliestStart); // 8:15+
    }
  });

  it('leaves 15 minutes between the provider sessions', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws);
    const byDay = new Map<number, Array<{ start: number; end: number }>>();
    for (const p of plan.proposals) {
      const list = byDay.get(p.day) ?? [];
      list.push({ start: p.start, end: p.start + p.durationMin });
      byDay.set(p.day, list);
    }
    for (const list of byDay.values()) {
      list.sort((a, x) => a.start - x.start);
      for (let i = 1; i < list.length; i++) {
        if (list[i].start === list[i - 1].start) continue; // alternating A/B pair shares its slot
        expect(list[i].start - list[i - 1].end).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('holds a 30-minute lunch inside 11:00-1:00 on every on-site day', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws);
    expect(plan.lunches.map((l) => l.day).sort()).toEqual([0, 3]);
    for (const lunch of plan.lunches) {
      expect(lunch.start).toBeGreaterThanOrEqual(660);
      expect(lunch.start + 30).toBeLessThanOrEqual(780);
      for (const p of plan.proposals.filter((x) => x.day === lunch.day)) {
        const overlaps = p.start < lunch.start + 30 && lunch.start < p.start + p.durationMin;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('a 22.5-min/week student gets an alternating A/B slot', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws);
    const st1 = plan.proposals.filter((p) => p.studentIds.includes('stu-1'));
    expect(st1).toHaveLength(2);
    expect(st1[0].day).toBe(st1[1].day);
    expect(st1[0].start).toBe(st1[1].start);
    expect(st1.map((p) => `${p.weekParity}:${p.durationMin}`).sort()).toEqual(['A:25', 'B:20']);
  });

  it('existing sessions count toward the goal and never trigger over-scheduling', () => {
    const ws = fixture();
    ws.sessions.push({
      id: 's1', providerId: 'ot', studentIds: ['stu-2'], day: 0, start: 495, durationMin: 30, recurrence: 'weekly',
    });
    const plan = generatePlan('ot', ws);
    const st2 = plan.students.find((s) => s.studentId === 'stu-2')!;
    expect(st2.existingWeeklyMin).toBe(30);
    expect(st2.proposedMin).toBe(0);
  });

  it('flags unmet minutes when gaps are too small', () => {
    const ws = fixture();
    ws.grades[0].templatePolarity = 'available';
    ws.grades[0].templateBlocks = [b(0, 480, 490)];
    const plan = generatePlan('ot', ws);
    const st1 = plan.students.find((s) => s.studentId === 'stu-1')!;
    expect(st1.unmetMin).toBeGreaterThan(0);
  });

  it('auto-group pairs same-grade students with matching needs', () => {
    const ws = fixture();
    // Students 1 and 3 share grade g1; give them identical 20/week needs
    ws.students[0].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.students[2].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const });
    const group = plan.proposals.find((p) => p.studentIds.length === 2);
    expect(group).toBeDefined();
    expect(group!.studentIds.sort()).toEqual(['stu-1', 'stu-3']);
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('auto-group forms groups of three when allowed', () => {
    const ws = fixture();
    for (const i of [0, 1, 2]) {
      ws.students[i].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    }
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const, maxGroupSize: 3 });
    const group = plan.proposals.find((p) => p.studentIds.length === 3);
    expect(group).toBeDefined();
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('maxGroupSize 2 keeps groups at two even when three match', () => {
    const ws = fixture();
    for (const i of [0, 1, 2]) {
      ws.students[i].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    }
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const, maxGroupSize: 2 });
    expect(plan.proposals.every((p) => p.studentIds.length <= 2)).toBe(true);
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true); // third goes individual
  });

  it('maxIndividuals caps individual sessions and reports the shortfall', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, maxIndividuals: 1 });
    const individuals = plan.proposals.filter((p) => p.studentIds.length === 1);
    // one *slot* may yield two proposals (alternating A/B) - count distinct slots
    const slots = new Set(individuals.map((p) => `${p.day}:${p.start}`));
    expect(slots.size).toBeLessThanOrEqual(1);
    expect(plan.students.filter((s) => s.unmetMin > 0).length).toBeGreaterThan(0);
  });

  it('maxGroups caps group sessions', () => {
    const ws = fixture();
    for (const i of [0, 1, 2]) {
      ws.students[i].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    }
    ws.grouping.preferGroups.push(['stu-1', 'stu-2']);
    const plan = generatePlan('ot', ws, {
      ...DEFAULT_PLAN_RULES,
      autoGroup: 'same-grade' as const,
      maxGroups: 1,
      maxGroupSize: 2,
    });
    const groups = plan.proposals.filter((p) => p.studentIds.length >= 2);
    const slots = new Set(groups.map((p) => `${p.day}:${p.start}`));
    expect(slots.size).toBeLessThanOrEqual(1);
  });

  it('auto-group never pairs cannot-group students', () => {
    const ws = fixture();
    ws.students[0].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.students[2].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.grouping.cannotPairs.push(['stu-1', 'stu-3']);
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const });
    expect(plan.proposals.every((p) => p.studentIds.length === 1)).toBe(true);
  });

  it('auto-group stays within a grade', () => {
    const ws = fixture();
    ws.grades.push({ id: 'g2', name: 'Grade 2', level: 2, templatePolarity: 'blocked', templateBlocks: [] });
    ws.students[0].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.students[2].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.students[2].gradeId = 'g2';
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const });
    expect(plan.proposals.every((p) => p.studentIds.length === 1)).toBe(true);
  });

  it('adjacent-grade mode groups ±1 grade level but not further', () => {
    const ws = fixture();
    ws.grades.push(
      { id: 'g2', name: 'Grade 2', level: 2, templatePolarity: 'blocked', templateBlocks: [] },
      { id: 'g4', name: 'Grade 4', level: 4, templatePolarity: 'blocked', templateBlocks: [] },
    );
    for (const i of [0, 1, 2]) {
      ws.students[i].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    }
    ws.students[1].gradeId = 'g2'; // level 2 - adjacent to level 1
    ws.students[2].gradeId = 'g4'; // level 4 - too far from both
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'adjacent-grade' as const });
    const group = plan.proposals.find((p) => p.studentIds.length >= 2);
    expect(group).toBeDefined();
    expect(group!.studentIds.sort()).toEqual(['stu-1', 'stu-2']);
    expect(plan.proposals.filter((p) => p.studentIds.includes('stu-3')).every((p) => p.studentIds.length === 1)).toBe(true);
  });

  it('explicit groups of three share sessions', () => {
    const ws = fixture();
    for (const i of [0, 1, 2]) {
      ws.students[i].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    }
    ws.grouping.preferGroups.push(['stu-1', 'stu-2', 'stu-3']);
    const plan = generatePlan('ot', ws);
    const group = plan.proposals.find((p) => p.studentIds.length === 3);
    expect(group).toBeDefined();
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('all five placement strategies meet the goals', () => {
    const ws = fixture();
    const plans = (['earliest', 'spread', 'latest', 'pack-days', 'shuffle'] as const).map((s) =>
      generatePlan('ot', ws, DEFAULT_PLAN_RULES, s),
    );
    for (const plan of plans) {
      expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
    }
    const [early, , late] = plans;
    const lastEnd = (p: typeof early) => Math.max(...p.proposals.map((x) => x.start + x.durationMin));
    const firstStart = (p: typeof early) => Math.min(...p.proposals.map((x) => x.start));
    expect(lastEnd(late)).toBeGreaterThan(lastEnd(early));
    expect(firstStart(late)).toBeGreaterThanOrEqual(firstStart(early));
  });

  it('priorityDays fills the chosen day before any other, under every strategy', () => {
    const ws = fixture();
    // Everything fits on Thursday alone, so with Thursday prioritized no
    // proposal should land on Monday - regardless of placement strategy.
    for (const strat of ['earliest', 'spread', 'latest', 'pack-days', 'shuffle'] as const) {
      const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, priorityDays: [3] }, strat);
      expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
      for (const p of plan.proposals) expect(p.day).toBe(3);
    }
  });

  it('priorityDays ranks several days in the clicked order', () => {
    const ws = fixture();
    // Prioritize Monday over Thursday: the plan should lean on Monday at
    // least as much as the Thursday-first plan leans on Thursday's mirror.
    const monFirst = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, priorityDays: [0, 3] });
    expect(monFirst.students.every((s) => s.unmetMin === 0)).toBe(true);
    for (const p of monFirst.proposals) expect(p.day).toBe(0);
  });

  it('retry pass: a student squeezed out by a group gets their slot on round two', () => {
    const ws = emptyWorkspace();
    ws.settings.schoolDayStart = 450;
    ws.settings.schoolDayEnd = 930;
    ws.providers.push({ id: 'ot', name: 'OT', color: '#c75b39', availability: [{ ...b(0, 570, 780), weeks: 'both' }] });
    // Student 1 can ONLY do 10:00-10:30. The preferred group could take
    // 10:00-10:30 OR later, and greedy grouping grabs the earliest slot.
    ws.grades.push({ id: 'gNarrow', name: 'Narrow', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 600, 630)] });
    ws.grades.push({ id: 'gWide', name: 'Wide', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 600, 730)] });
    const mk = (n: number, gradeId: string) => ({
      id: `stu-${n}`, displayId: String(n), gradeId,
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 30, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 'gNarrow'), mk(2, 'gWide'), mk(3, 'gWide'));
    ws.grouping.preferGroups = [['stu-2', 'stu-3']];
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0 });
    // Without the retry, the group takes 10:00 first and student 1 is unmet.
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
    const s1 = plan.proposals.find((p) => p.studentIds.includes('stu-1'))!;
    expect(s1.start).toBe(600);
  });

  it('fallbackBufferMin: squeezing the buffer rescues an otherwise-unfittable student', () => {
    const ws = emptyWorkspace();
    ws.settings.schoolDayStart = 450;
    ws.settings.schoolDayEnd = 930;
    ws.providers.push({ id: 'ot', name: 'OT', color: '#c75b39', availability: [{ ...b(0, 540, 720), weeks: 'both' }] });
    // An existing booked session 10:15-10:45; the student is only free
    // 9:45-10:15, exactly touching it. A 15-min buffer forbids that; a
    // squeezed buffer allows it.
    ws.sessions.push({ id: 'fixed', providerId: 'ot', studentIds: ['ghost'], day: 0, start: 615, durationMin: 30, recurrence: 'weekly' });
    ws.grades.push({ id: 'gTight', name: 'Tight', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 585, 615)] });
    ws.students.push({
      id: 'stu-1', displayId: '1', gradeId: 'gTight',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 30, period: 'weekly' as const }],
      overrides: [],
    });
    const strict = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0 });
    expect(strict.students[0].unmetMin).toBe(30);
    const squeezed = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0, fallbackBufferMin: 0 });
    expect(squeezed.students[0].unmetMin).toBe(0);
    expect(squeezed.proposals[0]).toMatchObject({ day: 0, start: 585, durationMin: 30 });
  });

  it('allowSplitWhenStuck: 30 weekly splits into 15 + 15 on two days when no 30-min stretch exists', () => {
    const ws = emptyWorkspace();
    ws.settings.schoolDayStart = 450;
    ws.settings.schoolDayEnd = 930;
    ws.providers.push({
      id: 'ot', name: 'OT', color: '#c75b39',
      availability: [{ ...b(0, 570, 780), weeks: 'both' }, { ...b(3, 570, 780), weeks: 'both' }],
    });
    ws.grades.push({
      id: 'gSliver', name: 'Sliver', level: 1, templatePolarity: 'available',
      templateBlocks: [b(0, 600, 615), b(3, 600, 615)],
    });
    ws.students.push({
      id: 'stu-1', displayId: '1', gradeId: 'gSliver',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 30, period: 'weekly' as const }],
      overrides: [],
    });
    const whole = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0 });
    expect(whole.students[0].unmetMin).toBe(30);
    const split = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0, allowSplitWhenStuck: true });
    expect(split.students[0].unmetMin).toBe(0);
    const mine = split.proposals.filter((p) => p.studentIds.includes('stu-1'));
    expect(mine).toHaveLength(2);
    expect(mine.map((p) => p.durationMin)).toEqual([15, 15]);
    expect(new Set(mine.map((p) => p.day)).size).toBe(2);
  });

  it('compressed-spacing rescue: when no full-buffer schedule exists, the whole plan retries at the fallback buffer', () => {
    const ws = emptyWorkspace();
    ws.settings.schoolDayStart = 450;
    ws.settings.schoolDayEnd = 930;
    // 100 minutes of provider time; three 30-minute students who all share it.
    // At a 15-min buffer that needs 30+15+30+15+30 = 120 minutes: impossible.
    // At a 5-min buffer it needs exactly 100: possible. Per-placement
    // squeezing can't get there because the first two strict placements
    // waste the slack, so only the whole-plan rerun rescues student three.
    ws.providers.push({ id: 'ot', name: 'OT', color: '#c75b39', availability: [{ ...b(0, 600, 700), weeks: 'both' }] });
    ws.grades.push({ id: 'gShared', name: 'Shared', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 600, 700)] });
    const mk = (n: number) => ({
      id: `stu-${n}`, displayId: String(n), gradeId: 'gShared',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 30, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1), mk(2), mk(3));
    const strict = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0 });
    expect(strict.students.filter((s) => s.unmetMin > 0)).toHaveLength(1);
    const rescued = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0, fallbackBufferMin: 5 });
    expect(rescued.students.every((s) => s.unmetMin === 0)).toBe(true);
    // All three sessions inside the 100-minute window, 5-min gaps.
    const starts = rescued.proposals.map((p) => p.start).sort((a, x) => a - x);
    expect(starts).toEqual([600, 635, 670]);
  });

  it('orderSlotsForStrategy gives each version its own exploration order', async () => {
    const { orderSlotsForStrategy } = await import('./autoSchedule');
    const slots = [
      { day: 0 as const, start: 600 },
      { day: 0 as const, start: 700 },
      { day: 3 as const, start: 650 },
    ];
    const load = new Map([[3 as const, 60]]);
    expect(orderSlotsForStrategy(slots, 'earliest', load).map((s) => s.start)).toEqual([600, 650, 700]);
    expect(orderSlotsForStrategy(slots, 'latest', load).map((s) => s.start)).toEqual([700, 650, 600]);
    expect(orderSlotsForStrategy(slots, 'spread', load)[0].start).toBe(650); // middle-out
    expect(orderSlotsForStrategy(slots, 'pack-days', load)[0].day).toBe(3); // busiest day first
    expect(orderSlotsForStrategy(slots, 'shuffle', load)).toHaveLength(3);
  });

  it('lunch is a floating break: a bad lunch pin gets retried at the window edges', () => {
    const ws = emptyWorkspace();
    ws.settings.schoolDayStart = 450;
    ws.settings.schoolDayEnd = 930;
    ws.providers.push({ id: 'ot', name: 'OT', color: '#c75b39', availability: [{ ...b(0, 600, 720), weeks: 'both' }] });
    // Three students with abutting Monday windows; the least-contested lunch
    // spot straddles two of them (score 0 - fully inside nobody's free time)
    // and would kill both. Pinned at the window's late edge, everyone fits.
    ws.grades.push({ id: 'gB', name: 'B', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 600, 630)] });
    ws.grades.push({ id: 'gA', name: 'A', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 630, 660)] });
    ws.grades.push({ id: 'gC', name: 'C', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 660, 720)] });
    // Student 4 is on a day the provider never visits - full fit is
    // impossible, so the exact solver stays out and greedy quality decides.
    ws.grades.push({ id: 'gD', name: 'D', level: 1, templatePolarity: 'available', templateBlocks: [b(1, 600, 700)] });
    const mk = (n: number, gradeId: string) => ({
      id: `stu-${n}`, displayId: String(n), gradeId,
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 30, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 'gB'), mk(2, 'gA'), mk(3, 'gC'), mk(4, 'gD'));
    const plan = generatePlan('ot', ws, {
      ...DEFAULT_PLAN_RULES,
      bufferMin: 0,
      lunchMin: 30,
      lunchWindow: { start: 600, end: 720 },
    });
    const unmet = plan.students.filter((s) => s.unmetMin > 0);
    expect(unmet.map((s) => s.displayId)).toEqual(['4']); // only the truly impossible one
    expect(plan.lunches).toHaveLength(1);
  });

  it('latestEnd: no session runs past the chosen time', () => {
    const ws = fixture();
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, latestEnd: 720 });
    expect(plan.proposals.length).toBeGreaterThan(0);
    for (const p of plan.proposals) {
      expect(p.start + p.durationMin).toBeLessThanOrEqual(720);
    }
  });

  it('a schedule full of too-small slivers ranks as constrained, not flexible', () => {
    const ws = emptyWorkspace();
    ws.settings.schoolDayStart = 450;
    ws.settings.schoolDayEnd = 930;
    ws.providers.push({ id: 'ot', name: 'OT', color: '#c75b39', availability: [{ ...b(0, 450, 930), weeks: 'both' }] });
    // Fragmented: one real 30-min window (10:00-10:30) plus six 20-min
    // slivers - 150 raw minutes, but only 30 fit a 30-min session.
    ws.grades.push({
      id: 'gFrag', name: 'Fragmented', level: 1, templatePolarity: 'available',
      templateBlocks: [b(0, 600, 630), b(0, 650, 670), b(0, 690, 710), b(0, 730, 750), b(0, 770, 790), b(0, 810, 830), b(0, 850, 870)],
    });
    // Contiguous: 9:50-11:40 open - 110 raw minutes, all usable.
    ws.grades.push({
      id: 'gWide', name: 'Wide', level: 1, templatePolarity: 'available',
      templateBlocks: [b(0, 590, 700)],
    });
    const mk = (n: number, gradeId: string) => ({
      id: `stu-${n}`, displayId: String(n), gradeId,
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 30, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 'gFrag'), mk(2, 'gWide'));
    // Counting raw minutes would send the wide student first (110 < 150),
    // whose earliest placement + buffer destroys the fragmented student's
    // only real window. Counting only fittable stretches places the
    // fragmented student first and both goals are met.
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, lunchMin: 0 });
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('other providers\' sessions block proposals unless overlap is allowed', () => {
    const ws = fixture();
    ws.providers.push({ id: 'mh', name: 'MH', color: '#7b5ea7', availability: [] });
    // MH occupies student 3's ONLY workable morning stretch on both days;
    // shrink student 3's availability to make that time precious
    ws.grades.push({ id: 'gNarrow', name: 'Narrow', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 495, 540), b(3, 495, 540)] });
    ws.students[2].gradeId = 'gNarrow';
    ws.sessions.push(
      { id: 'mh1', providerId: 'mh', studentIds: ['stu-3'], day: 0, start: 495, durationMin: 30, recurrence: 'weekly' },
      { id: 'mh2', providerId: 'mh', studentIds: ['stu-3'], day: 3, start: 495, durationMin: 30, recurrence: 'weekly' },
    );
    const strict = generatePlan('ot', ws);
    const st3strict = strict.students.find((s) => s.studentId === 'stu-3')!;
    expect(st3strict.unmetMin).toBeGreaterThan(0); // 20/wk can't fit in 15 leftover
    const loose = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, allowProviderOverlap: true });
    const st3loose = loose.students.find((s) => s.studentId === 'stu-3')!;
    expect(st3loose.unmetMin).toBe(0); // may share MH's time
  });

  it('dynamic priority: the tightest student gets the scarce slot', () => {
    const ws = fixture();
    // Student 3 can ONLY do Mon 9:00-9:30; student 2 is free everywhere
    ws.grades.push({ id: 'gTight', name: 'Tight', level: 1, templatePolarity: 'available', templateBlocks: [b(0, 540, 570)] });
    ws.students[2].gradeId = 'gTight';
    const plan = generatePlan('ot', ws);
    const st3 = plan.proposals.find((p) => p.studentIds.includes('stu-3'));
    expect(st3).toMatchObject({ day: 0, start: 540 });
    expect(plan.students.find((s) => s.studentId === 'stu-3')!.unmetMin).toBe(0);
  });

  it('pack-days uses no more days than the balanced default', () => {
    const ws = fixture();
    const balanced = generatePlan('ot', ws, DEFAULT_PLAN_RULES, 'earliest');
    const packed = generatePlan('ot', ws, DEFAULT_PLAN_RULES, 'pack-days');
    const daysUsed = (p: typeof packed) => new Set(p.proposals.map((x) => x.day)).size;
    expect(daysUsed(packed)).toBeLessThanOrEqual(daysUsed(balanced));
    expect(packed.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('prefer-pairs with equal needs share one group session', () => {
    const ws = fixture();
    ws.students[0].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.students[2].serviceGoals = [{ providerId: 'ot', type: 'direct', minutes: 20, period: 'weekly' }];
    ws.grouping.preferGroups.push(['stu-1', 'stu-3']);
    const plan = generatePlan('ot', ws);
    const group = plan.proposals.find((p) => p.studentIds.length === 2);
    expect(group).toBeDefined();
    expect(group!.studentIds.sort()).toEqual(['stu-1', 'stu-3']);
    expect(group!.durationMin).toBe(20);
  });
});

describe('chunkNeededExact re-split', () => {
  it('books 35 as 20 + 15 instead of stalling at 30 + unbookable 5', () => {
    expect(chunkNeededExact(35, 10)).toEqual({
      chunks: [
        { kind: 'weekly', len: 20 },
        { kind: 'weekly', len: 15 },
      ],
      leftover: 0,
    });
  });

  it('books 65 as 30 + 20 + 15', () => {
    const { chunks, leftover } = chunkNeededExact(65, 10);
    expect(leftover).toBe(0);
    expect(chunks.reduce((sum, c) => sum + (c.kind === 'weekly' ? c.len : 0), 0)).toBe(65);
  });

  it('respects a minimum length that forbids the re-split', () => {
    // minLen 25: 35 cannot split into two legal >=25 pieces; the residue stays.
    const { leftover } = chunkNeededExact(35, 25);
    expect(leftover).toBe(5);
  });
});

describe('preferred groups with different goals', () => {
  it('runs the group at the smallest need - nobody gets minutes beyond mandate', () => {
    const ws = fixture();
    ws.students = [];
    const mk = (n: number, minutes: number) => ({
      id: `stu-${n}`,
      displayId: String(n),
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 30), mk(2, 20));
    ws.grouping.preferGroups = [['stu-1', 'stu-2']];
    const plan = generatePlan('ot', ws);
    const group = plan.proposals.find((p) => p.studentIds.length === 2);
    expect(group).toBeDefined();
    expect(group!.durationMin).toBe(20);
    // The larger member's difference is reported, never topped up with a
    // second pull, and never given to the smaller member as overshoot.
    const s1 = plan.students.find((s) => s.studentId === 'stu-1')!;
    expect(s1.proposedMin).toBe(20);
    // The difference is the user's to place - reported separately, never as
    // unmet, so it cannot trigger rescue passes or read as a failure.
    expect(s1.unmetMin).toBe(0);
    expect(s1.groupShortMin).toBe(10);
    expect(plan.proposals.filter((p) => p.studentIds.length === 1 && p.studentIds[0] === 'stu-1')).toEqual([]);
    const s2 = plan.students.find((s) => s.studentId === 'stu-2')!;
    expect(s2.proposedMin).toBe(20);
    expect(s2.groupShortMin).toBe(0);
  });

  it('still shares identical alternating chunks whole', () => {
    const ws = fixture();
    ws.students = ws.students.slice(0, 2).map((s, i) => ({
      ...s,
      id: `stu-${i + 1}`,
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 90, period: 'monthly' as const }],
    }));
    ws.grouping.preferGroups = [['stu-1', 'stu-2']];
    const plan = generatePlan('ot', ws);
    expect(plan.proposals.some((p) => p.studentIds.length === 2)).toBe(true);
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('groups every one of several preferred groups when slots allow', () => {
    const ws = fixture();
    ws.students = [];
    const mk = (n: number, minutes: number) => ({
      id: `stu-${n}`,
      displayId: String(n),
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 30), mk(2, 20), mk(3, 25), mk(4, 25), mk(5, 20), mk(6, 30), mk(7, 15), mk(8, 15));
    ws.grouping.preferGroups = [
      ['stu-1', 'stu-2'],
      ['stu-3', 'stu-4'],
      ['stu-5', 'stu-6'],
      ['stu-7', 'stu-8'],
    ];
    const plan = generatePlan('ot', ws);
    for (const g of ws.grouping.preferGroups) {
      expect(
        plan.proposals.some((p) => g.every((id) => p.studentIds.includes(id))),
        `group ${g.join('+')} should share a session`,
      ).toBe(true);
    }
  });
});

describe('a short shared window still groups, at the smallest need', () => {
  it('books the group in the small window and reports the difference', () => {
    const ws = fixture();
    ws.students = [];
    const mk = (n: number, minutes: number) => ({
      id: `stu-${n}`,
      displayId: String(n),
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 30), mk(2, 20));
    ws.grouping.preferGroups = [['stu-1', 'stu-2']];
    // Shared free time is exactly the 20 minutes 9:15-9:35 Monday.
    ws.students[1].overrides = [
      { id: 'ov1', kind: 'block' as const, block: { day: 0, start: 450, end: 555 } },
      { id: 'ov2', kind: 'block' as const, block: { day: 0, start: 575, end: 930 } },
      ...([1, 2, 3, 4] as const).map((day, i) => ({
        id: `ovd${i}`,
        kind: 'block' as const,
        block: { day, start: 450, end: 930 },
      })),
    ];
    const plan = generatePlan('ot', ws);
    const group = plan.proposals.find((p) => p.studentIds.length === 2);
    expect(group).toBeDefined();
    expect(group!.durationMin).toBe(20);
    const s1 = plan.students.find((s) => s.studentId === 'stu-1')!;
    expect(s1.unmetMin).toBe(0);
    expect(s1.groupShortMin).toBe(10);
    // Never a second same-day session to make up the difference.
    expect(plan.proposals.filter((p) => p.studentIds.length === 1 && p.studentIds[0] === 'stu-1')).toEqual([]);
  });
});

describe('a chosen group length', () => {
  it('wins over the smallest-need default and can cover the bigger member', () => {
    const ws = fixture();
    ws.students = [];
    const mk = (n: number, minutes: number, period: 'weekly' | 'monthly') => ({
      id: `stu-${n}`,
      displayId: String(n),
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes, period }],
      overrides: [],
    });
    // Like students 8 + 16: 90/mo (22.5/wk) with an 80/mo (20/wk) partner.
    ws.students.push(mk(1, 90, 'monthly'), mk(2, 80, 'monthly'));
    ws.grouping.preferGroups = [['stu-1', 'stu-2']];
    ws.grouping.groupLens = { 'stu-1+stu-2': 25 };
    const plan = generatePlan('ot', ws);
    const group = plan.proposals.find((p) => p.studentIds.length === 2);
    expect(group?.durationMin).toBe(25);
    // 25 covers the 22.5 need entirely: nothing left for the user to place,
    // and the partner's small overshoot is not reported as anything.
    const s1 = plan.students.find((s) => s.studentId === 'stu-1')!;
    expect(s1.unmetMin).toBe(0);
    expect(s1.groupShortMin).toBe(0);
    const s2 = plan.students.find((s) => s.studentId === 'stu-2')!;
    expect(s2.groupShortMin).toBe(0);
  });

  it('key order does not matter and unknown lengths fall back to auto', () => {
    const ws = fixture();
    ws.students = [];
    const mk = (n: number, minutes: number) => ({
      id: `stu-${n}`,
      displayId: String(n),
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1, 30), mk(2, 20));
    ws.grouping.preferGroups = [['stu-2', 'stu-1']]; // reversed order
    ws.grouping.groupLens = { 'stu-1+stu-2': 25, junk: 999 };
    const plan = generatePlan('ot', ws);
    expect(plan.proposals.find((p) => p.studentIds.length === 2)?.durationMin).toBe(25);
  });
});

describe('always-individual students', () => {
  function autoGroupFixture() {
    const ws = fixture();
    ws.students = [];
    const mk = (n: number) => ({
      id: `stu-${n}`,
      displayId: String(n),
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'ot', type: 'direct' as const, minutes: 20, period: 'weekly' as const }],
      overrides: [],
    });
    ws.students.push(mk(1), mk(2));
    return ws;
  }

  it('auto-grouping skips a student marked individual-only', () => {
    const ws = autoGroupFixture();
    const rules = { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const };
    // Sanity: with matching needs they WOULD auto-group.
    expect(generatePlan('ot', ws, rules).proposals.some((p) => p.studentIds.length === 2)).toBe(true);
    ws.grouping.soloStudents = ['stu-2'];
    const plan = generatePlan('ot', ws, rules);
    expect(plan.proposals.every((p) => p.studentIds.length === 1)).toBe(true);
    expect(plan.students.every((s) => s.unmetMin === 0)).toBe(true);
  });

  it('a group the therapist wrote out by hand still wins over the flag', () => {
    const ws = autoGroupFixture();
    ws.grouping.soloStudents = ['stu-2'];
    ws.grouping.preferGroups = [['stu-1', 'stu-2']];
    const plan = generatePlan('ot', ws, { ...DEFAULT_PLAN_RULES, autoGroup: 'same-grade' as const });
    expect(plan.proposals.some((p) => p.studentIds.length === 2)).toBe(true);
  });
});
