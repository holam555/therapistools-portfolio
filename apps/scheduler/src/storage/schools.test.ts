import { describe, expect, it } from 'vitest';
import { LEGACY_WORKSPACE_KEY, loadRegistry, newSchoolEntry, saveRegistry } from './schools';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  };
}

describe('school registry', () => {
  it('adopts an existing single-workspace install as "School 2"', () => {
    const storage = fakeStorage({ [LEGACY_WORKSPACE_KEY]: '{"schemaVersion":2}' });
    const reg = loadRegistry(storage);
    expect(reg.schools).toHaveLength(1);
    expect(reg.schools[0].name).toBe('School 2');
    expect(reg.schools[0].storageKey).toBe(LEGACY_WORKSPACE_KEY); // data never moves
    expect(reg.activeId).toBe(reg.schools[0].id);
  });

  it('fresh install starts with "My school"', () => {
    const reg = loadRegistry(fakeStorage());
    expect(reg.schools[0].name).toBe('My school');
  });

  it('round-trips saved registries and validates the active id', () => {
    const storage = fakeStorage();
    const a = newSchoolEntry('School 2');
    const b = newSchoolEntry('School 1');
    saveRegistry({ schools: [a, b], activeId: b.id }, storage);
    const reg = loadRegistry(storage);
    expect(reg.schools.map((s) => s.name)).toEqual(['School 2', 'School 1']);
    expect(reg.activeId).toBe(b.id);
    // stale active id falls back to the first school
    saveRegistry({ schools: [a, b], activeId: 'gone' }, storage);
    expect(loadRegistry(storage).activeId).toBe(a.id);
  });

  it('new schools get their own storage keys', () => {
    const e = newSchoolEntry('X');
    expect(e.storageKey).toBe(`gapboard-school-${e.id}`);
    expect(e.storageKey).not.toBe(LEGACY_WORKSPACE_KEY);
  });
});
