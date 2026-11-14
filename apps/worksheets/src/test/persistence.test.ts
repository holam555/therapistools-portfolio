import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProfiles, addProfile, deleteProfile, setActiveProfileId, getActiveProfileId,
  loadTemplateConfig, saveTemplateConfig,
  addHistory, loadHistory, countPrints,
  diffConfig, encodeConfig, decodeConfig, withoutChildName,
} from '@/lib/persistence';
import { defaultConfig } from '@/lib/defaultConfig';
import { WorksheetConfig } from '@/lib/shapes';

beforeEach(() => localStorage.clear());

describe('profiles', () => {
  it('adds, lists and makes the new profile active, with nicknames not names', () => {
    const a = addProfile({ ageBand: '3-4', interests: ['animals'] });
    addProfile({ ageBand: '7-8' });
    expect(loadProfiles().map((p) => p.label)).toEqual(['Fox', 'Owl']);
    expect(getActiveProfileId()).not.toBe(a.id); // Owl (last added) is active
  });

  it('deleting the active profile reassigns active to a remaining one', () => {
    const a = addProfile({ label: 'Panda', ageBand: '3-4' });
    const b = addProfile({ label: 'Frog', ageBand: '7-8' });
    setActiveProfileId(b.id);
    deleteProfile(b.id);
    expect(loadProfiles().map((p) => p.label)).toEqual(['Panda']);
    expect(getActiveProfileId()).toBe(a.id);
  });

  it('replaces the v1 single-name profile with a nicknamed one and deletes the name', () => {
    localStorage.setItem('otsheet:profile:v1', JSON.stringify({ childName: 'Cara' }));
    const profiles = loadProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].label).toBe('Fox');
    expect(getActiveProfileId()).toBe(profiles[0].id);
    expect(JSON.stringify({ ...localStorage })).not.toContain('Cara');
  });
});

describe('child names are never stored', () => {
  it('rewrites v2 profiles saved with a name, keeping age and interests', () => {
    localStorage.setItem('otsheet:profiles:v2', JSON.stringify([
      { id: 'a', name: 'Dana', ageBand: '3-4', interests: ['space'], createdAt: '2026-01-01' },
      { id: 'b', name: 'Eli', ageBand: '7-8', interests: [], createdAt: '2026-01-02' },
    ]));
    const profiles = loadProfiles();
    expect(profiles.map((p) => [p.id, p.label, p.ageBand])).toEqual([['a', 'Fox', '3-4'], ['b', 'Owl', '7-8']]);
    expect(profiles[0].interests).toEqual(['space']);
    const stored = localStorage.getItem('otsheet:profiles:v2')!;
    expect(stored).not.toContain('Dana');
    expect(stored).not.toContain('Eli');
    expect(stored).not.toContain('"name"');
  });

  it('never writes the worksheet name into saved settings', () => {
    saveTemplateConfig('p1', 'trace-name', { ...defaultConfig, childName: 'Fiona', gridSize: 4 });
    expect(localStorage.getItem('otsheet:config:v2:p1:trace-name')).not.toContain('Fiona');
    const loaded = loadTemplateConfig('p1', 'trace-name');
    expect(loaded?.gridSize).toBe(4);
    expect(loaded).not.toHaveProperty('childName');
  });

  it('ignores a name saved by an older version', () => {
    localStorage.setItem('otsheet:config:v2:p1:maze', JSON.stringify({ childName: 'Gus', gridSize: 3 }));
    expect(loadTemplateConfig('p1', 'maze')).toEqual({ gridSize: 3 });
  });

  it('never writes the worksheet name into print history', () => {
    addHistory({ profileId: 'p1', templateId: 'trace-name', diff: { childName: 'Hana', gridSize: 4 }, seed: 1, printedAt: '2026-01-01' });
    expect(localStorage.getItem('otsheet:history:v1')).not.toContain('Hana');
    expect(loadHistory()[0].diff).toEqual({ gridSize: 4 });
  });

  it('leaves the name out of share links, including old links that carried one', () => {
    const encoded = encodeConfig({ childName: 'Ivy', gridSize: 4 } as Partial<WorksheetConfig>, 7);
    expect(decodeConfig(encoded)).toEqual({ diff: { gridSize: 4 }, seed: 7 });
    const oldLink = btoa(JSON.stringify({ c: { childName: 'Jon', gridSize: 2 }, s: 3 })).replace(/=+$/, '');
    expect(decodeConfig(oldLink)?.diff).toEqual({ gridSize: 2 });
  });

  it('withoutChildName removes only the name', () => {
    expect(withoutChildName({ childName: 'Kai', gridSize: 2 })).toEqual({ gridSize: 2 });
    const same = { gridSize: 2 };
    expect(withoutChildName(same)).toBe(same);
  });
});

describe('per-profile template config', () => {
  it('keeps each profile’s customization separate', () => {
    saveTemplateConfig('p1', 'find-shapes', { ...defaultConfig, gridSize: 5 });
    saveTemplateConfig('p2', 'find-shapes', { ...defaultConfig, gridSize: 2 });
    expect(loadTemplateConfig('p1', 'find-shapes')?.gridSize).toBe(5);
    expect(loadTemplateConfig('p2', 'find-shapes')?.gridSize).toBe(2);
  });
});

describe('history', () => {
  it('records prints and counts by template + difficulty', () => {
    addHistory({ profileId: 'p1', templateId: 't', diff: { difficulty: 'easy' }, seed: 1, printedAt: '' });
    addHistory({ profileId: 'p1', templateId: 't', diff: { difficulty: 'easy' }, seed: 2, printedAt: '' });
    addHistory({ profileId: 'p1', templateId: 't', diff: { difficulty: 'hard' }, seed: 3, printedAt: '' });
    expect(loadHistory()).toHaveLength(3);
    expect(countPrints('p1', 't', 'easy')).toBe(2);
    expect(countPrints('p1', 't', 'hard')).toBe(1);
  });
});

describe('config diff codec (used by history + shareable links)', () => {
  const base = defaultConfig;

  it('diff captures only changed keys', () => {
    const changed: WorksheetConfig = { ...base, gridSize: 5, childName: 'Zöe' };
    const diff = diffConfig(changed, base);
    expect(diff).toEqual({ gridSize: 5, childName: 'Zöe' });
  });

  it('encode → decode round-trips a diff and seed (incl. unicode)', () => {
    const diff = { handwritingText: 'Zöe 你好', difficulty: 'hard' as const };
    const encoded = encodeConfig(diff, 12345);
    // base64url: no +, /, or = padding
    expect(encoded).not.toMatch(/[+/=]/);
    const decoded = decodeConfig(encoded);
    expect(decoded).toEqual({ diff, seed: 12345 });
  });

  it('decode returns null on garbage', () => {
    expect(decodeConfig('not-valid-@@')).toBeNull();
  });
});
