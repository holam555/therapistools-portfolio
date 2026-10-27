import { describe, expect, it } from 'vitest';
import { buildFullBackup, collectAllSchools, parseBackup } from './backupAll';
import { importWorkspace } from './exportImport';
import type { Workspace } from '../domain/types';
import { emptyWorkspace } from '../domain/types';

const single = (n: number): Workspace => {
  const ws = emptyWorkspace();
  ws.students = Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    displayId: String(i + 1),
    gradeId: 'g',
    serviceGoals: [],
    overrides: [],
  }));
  return ws;
};

describe('collectAllSchools', () => {
  const schools = [
    { id: 'A', name: 'North', storageKey: 'key-a' },
    { id: 'B', name: 'South', storageKey: 'key-b' },
    { id: 'C', name: 'Broken', storageKey: 'key-c' },
  ];
  const storage = {
    getItem: (key: string) =>
      key === 'key-b' ? JSON.stringify(single(2)) : key === 'key-c' ? '{corrupt' : null,
  };

  it('uses live state for the active school and storage for the rest', () => {
    const live = single(5);
    const got = collectAllSchools(schools, 'A', live, storage);
    expect(got.map((s) => [s.name, s.workspace.students.length])).toEqual([
      ['North', 5],
      ['South', 2],
    ]);
    expect(got[0].workspace).toBe(live);
  });

  it('skips a corrupt school instead of failing the whole export', () => {
    expect(collectAllSchools(schools, 'A', single(1), storage).map((s) => s.name)).not.toContain('Broken');
  });
});

describe('full backup round trip', () => {
  it('carries every school and the tracker data through parse', () => {
    const wsA = single(3);
    wsA.iepCases = [
      {
        id: 'c1', studentId: 's0', kind: 'Annual', dateDue: '2026-10-01', notes: '',
        consentReceived: false, checklistSent: true, checklistReceived: false,
        informalTesting: false, formalTesting: false,
      },
    ];
    wsA.sessionLogs = [
      { id: 'l1', date: '2026-08-20', studentId: 's0', minutes: 30, status: 'seen', documented: true },
    ];
    const backup = buildFullBackup([
      { name: 'North', workspace: wsA },
      { name: 'South', workspace: single(2) },
    ]);
    const parsed = parseBackup(JSON.stringify(backup), importWorkspace);
    expect(parsed.kind).toBe('full');
    if (parsed.kind !== 'full') return;
    expect(parsed.schools.map((s) => s.name)).toEqual(['North', 'South']);
    expect(parsed.schools[0].workspace.iepCases).toHaveLength(1);
    expect(parsed.schools[0].workspace.sessionLogs[0].documented).toBe(true);
  });

  it('recognises a plain single-school backup', () => {
    const parsed = parseBackup(JSON.stringify(single(4)), importWorkspace);
    expect(parsed.kind).toBe('single');
    if (parsed.kind === 'single') expect(parsed.workspace.students).toHaveLength(4);
  });

  it('upgrades old-schema schools inside a full backup', () => {
    const old = { ...single(1), schemaVersion: 2 } as unknown as Workspace;
    delete (old as { iepCases?: unknown }).iepCases;
    delete (old as { sessionLogs?: unknown }).sessionLogs;
    const backup = buildFullBackup([{ name: 'Old', workspace: old }]);
    const parsed = parseBackup(JSON.stringify(backup), importWorkspace);
    if (parsed.kind !== 'full') throw new Error('expected full');
    expect(parsed.schools[0].workspace.schemaVersion).toBe(4);
    expect(parsed.schools[0].workspace.sessionLogs).toEqual([]);
  });

  it('ignores the work log an older full backup may carry', () => {
    const backup = buildFullBackup([{ name: 'North', workspace: single(1) }]) as unknown as Record<string, unknown>;
    backup.workLog = { version: 1, entries: [{ id: 'x' }] };
    const parsed = parseBackup(JSON.stringify(backup), importWorkspace);
    expect(parsed.kind).toBe('full');
  });

  it('rejects garbage clearly', () => {
    expect(() => parseBackup('not json', importWorkspace)).toThrow(/not valid JSON/);
    expect(() =>
      parseBackup(JSON.stringify({ format: 'therapist-scheduler-full', formatVersion: 9 }), importWorkspace),
    ).toThrow(/Unsupported full-backup version/);
    expect(() =>
      parseBackup(
        JSON.stringify({ format: 'therapist-scheduler-full', formatVersion: 1, schools: [] }),
        importWorkspace,
      ),
    ).toThrow(/no schools/);
    expect(() =>
      parseBackup(
        JSON.stringify({ format: 'therapist-scheduler-full', formatVersion: 1, schools: [{ workspace: single(1) }] }),
        importWorkspace,
      ),
    ).toThrow(/no name/);
  });
});
