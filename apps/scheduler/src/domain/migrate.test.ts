import { describe, expect, it } from 'vitest';
import { gradeLevelFromName, migrateWorkspace } from './migrate';
import { DEFAULT_AVOID_CATEGORIES } from './types';

const v1Workspace = {
  schemaVersion: 1,
  settings: { schoolDayStart: 450, schoolDayEnd: 930, slotMinutes: 5, weekAAnchorMonday: '2026-08-17' },
  providers: [],
  grades: [{ id: 'g1', name: 'Grade 04', templatePolarity: 'blocked', templateBlocks: [] }],
  students: [
    {
      id: 'st1',
      displayId: '1',
      gradeId: 'g1',
      serviceGoals: [{ providerId: 'p1', minutes: 90, period: 'monthly' }],
      overrides: [],
    },
  ],
  sessions: [],
};

describe('gradeLevelFromName', () => {
  it.each([
    ['Grade K', 0],
    ['K', 0],
    ['Grade 04', 4],
    ['Grade 1', 1],
    ['3rd', 3],
    ['TK-ish', undefined],
  ])('%s → %s', (name, expected) => {
    expect(gradeLevelFromName(name)).toBe(expected);
  });
});

describe('migrateWorkspace', () => {
  it('upgrades v1 all the way to the current version with defaults', () => {
    const ws = migrateWorkspace(v1Workspace);
    expect(ws.schemaVersion).toBe(4);
    expect(ws.sessionLogs).toEqual([]);
    expect(ws.settings.avoidCategories).toEqual(DEFAULT_AVOID_CATEGORIES);
    expect(ws.grouping).toEqual({ policy: 'any', preferGroups: [], cannotPairs: [] });
    expect(ws.grades[0].level).toBe(4);
    expect(ws.iepCases).toEqual([]);
    expect(ws.students[0].serviceGoals[0]).toEqual({
      providerId: 'p1',
      type: 'direct',
      minutes: 90,
      period: 'monthly',
    });
  });

  it('upgrades a v2 workspace by adding the IEP tracker and session log', () => {
    const v2 = { ...migrateWorkspace(v1Workspace), schemaVersion: 2 as const };
    delete (v2 as { iepCases?: unknown }).iepCases;
    delete (v2 as { sessionLogs?: unknown }).sessionLogs;
    const ws = migrateWorkspace(v2);
    expect(ws.schemaVersion).toBe(4);
    expect(ws.iepCases).toEqual([]);
    expect(ws.sessionLogs).toEqual([]);
    expect(ws.students).toBe(v2.students);
  });

  it('upgrades a v3 workspace by adding the session log, keeping its cases', () => {
    const v3 = {
      ...migrateWorkspace(v1Workspace),
      schemaVersion: 3 as const,
      iepCases: [{ id: 'c1' }],
    };
    delete (v3 as { sessionLogs?: unknown }).sessionLogs;
    const ws = migrateWorkspace(v3);
    expect(ws.schemaVersion).toBe(4);
    expect(ws.iepCases).toEqual([{ id: 'c1' }]);
    expect(ws.sessionLogs).toEqual([]);
  });

  it('passes the current version through untouched', () => {
    const v4 = migrateWorkspace(v1Workspace);
    expect(migrateWorkspace(v4)).toBe(v4);
  });

  it('rejects unknown versions', () => {
    expect(() => migrateWorkspace({ schemaVersion: 99 })).toThrow(/Unsupported/);
  });
});
