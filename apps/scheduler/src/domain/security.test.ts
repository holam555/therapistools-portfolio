// Hostile-input guards. These protect two promises the app makes: nothing
// a user pastes or imports can execute, and nothing can hang the browser.
import { describe, expect, it } from 'vitest';
import { importWorkspace } from '../storage/exportImport';
import { parseScheduleGrid } from './importSchedule';
import { parseGradeScheduleText } from './importMaster';
import { parseCaseloadText } from './importCaseload';
import { emptyWorkspace } from './types';

const validBackup = (extra: string) =>
  `{"schemaVersion":2,"settings":{"schoolDayStart":450,"schoolDayEnd":930,"weekAAnchorMonday":"2026-08-17","avoidCategories":[]},"grouping":{"policy":"any","preferGroups":[],"cannotPairs":[]},"providers":[],"grades":[],"students":[],"sessions":[]${extra}}`;

describe('imported backups cannot poison the app', () => {
  it('a __proto__ payload never reaches Object.prototype', () => {
    try {
      importWorkspace(validBackup(',"__proto__":{"polluted":"yes"}'));
    } catch {
      /* rejection is also fine */
    }
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('a constructor.prototype payload never pollutes', () => {
    try {
      importWorkspace(validBackup(',"constructor":{"prototype":{"pwned":1}}'));
    } catch {
      /* ignore */
    }
    expect(({} as Record<string, unknown>).pwned).toBeUndefined();
  });

  it('malformed backups are rejected with a message instead of crashing', () => {
    for (const bad of [
      'not json',
      'null',
      '[]',
      '{}',
      '{"schemaVersion":99}',
      '{"schemaVersion":2,"settings":{},"providers":[],"grades":[],"students":[],"sessions":[]}',
    ]) {
      expect(() => importWorkspace(bad)).toThrow();
    }
  });

  it('script-shaped text stays inert data (React escapes it on render)', () => {
    const ws = importWorkspace(
      validBackup(',"providers":[{"id":"p","name":"<script>alert(1)</script>","color":"#fff","availability":[]}]'),
    );
    expect(ws.providers[0].name).toBe('<script>alert(1)</script>');
  });
});

describe('pasted text cannot hang the browser', () => {
  const ws = emptyWorkspace();
  const payloads: Array<[string, string]> = [
    ['a long run of digits', '9'.repeat(50000)],
    ['deeply nested parentheses', `Math ${'('.repeat(5000)}8:00 - 9:00${')'.repeat(5000)}`],
    ['many separators', Array(5000).fill('1/2-3,4').join(' ')],
    ['one enormous line', `Case No.\t${'a'.repeat(200000)}`],
    ['thousands of blank lines', `${'\n'.repeat(100000)}Math 9:00 - 9:30`],
    ['a storm of tabs', `${'\t'.repeat(50000)}8:00-8:30\t5`],
  ];
  for (const [name, payload] of payloads) {
    it(`parses ${name} in well under a second`, () => {
      const started = Date.now();
      parseScheduleGrid(payload, ws);
      parseGradeScheduleText(payload);
      parseCaseloadText(payload);
      expect(Date.now() - started).toBeLessThan(1000);
    });
  }
});
