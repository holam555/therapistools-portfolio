import { describe, expect, it } from 'vitest';
import { parseCaseloadText, parseCaseloadWorkbook, parseServiceText, parsePlanInfo } from './importCaseload';
import type { SheetData } from './importWorkbook';

const sheet = (rows: string[][]): SheetData => ({
  cells: rows.map((r) => r.map((text) => ({ text }))),
  merges: [],
});

describe('parseCaseloadWorkbook', () => {
  it('reads goal rows and skips push-in rows', () => {
    const p = parseCaseloadWorkbook(
      sheet([
        ['Case #', 'Grade', 'Service', 'Setting'],
        ['3', '3', '90 min monthly', 'Outside'],
        ['11', 'K', '90 min monthly', 'Outside'],
        ['20', '1', '30 min weekly', 'Outside'],
        ['20', '1', '20 min weekly', 'Inside'],
      ]),
    );
    expect(p.students).toHaveLength(3);
    const s20 = p.students.find((s) => s.displayId === '20')!;
    expect(s20.gradeLevel).toBe(1);
    // Only the pull-out row imports; the push-in row is reported, not added.
    expect(s20.goals).toEqual([{ minutes: 30, period: 'weekly' }]);
    expect(p.issues.some((i) => i.message.includes('push-in row skipped'))).toBe(true);
    expect(p.students.find((s) => s.displayId === '11')!.gradeLevel).toBe(0);
  });

  it('skips name rows and unreadable services with issues', () => {
    const p = parseCaseloadWorkbook(
      sheet([
        ['Student', 'Grade', 'Service'],
        ['Baxter', '2', '90 min monthly'],
        ['7', '2', 'consult only'],
        ['8', '2', '60 min monthly'],
      ]),
    );
    expect(p.students.map((s) => s.displayId)).toEqual(['8']);
    expect(p.issues).toHaveLength(2);
  });

  it('parseServiceText handles period words', () => {
    expect(parseServiceText('90 min monthly')).toEqual({ minutes: 90, period: 'monthly' });
    expect(parseServiceText('30 minutes / week')).toEqual({ minutes: 30, period: 'weekly' });
    expect(parseServiceText('120 min per semester')).toEqual({ minutes: 120, period: 'semesterly' });
    expect(parseServiceText('no minutes')).toBeUndefined();
  });

  it('reports a missing header row', () => {
    const p = parseCaseloadWorkbook(sheet([['just', 'stuff']]));
    expect(p.students).toEqual([]);
    expect(p.issues[0].message).toContain('No header row');
  });
});

describe('plan-information format', () => {
  const SAMPLE = [
    'Case No.\tPlan Information',
    '1\t8/1/2025 - 8/1/2026 Occupational Therapy (Indirect | Outside) 20 minutes semesterly',
    '2\t9/1/2025 - 9/1/2026 Occupational Therapy (Indirect | Inside) 10 minutes monthly',
    '3\t10/1/2026 - 10/1/2027 Occupational Therapy (Direct | Outside) 90 minutes monthly',
    '4\t10/1/2026 - 10/1/2027 Occupational Therapy (Direct | Inside) 30 minutes weekly',
  ].join('\n');

  it('parsePlanInfo reads type, setting, minutes, period; dates ignored', () => {
    expect(parsePlanInfo('8/1/2025 - 8/1/2026 Occupational Therapy (Indirect | Outside) 20 minutes semesterly')).toEqual({
      type: 'indirect',
      setting: 'outside',
      minutes: 20,
      period: 'semesterly',
    });
    expect(parsePlanInfo('no service here')).toBeUndefined();
  });

  it('paste: indirect rows import regardless of setting; direct push-in is skipped', () => {
    const p = parseCaseloadText(SAMPLE);
    expect(p.students.map((s) => s.displayId)).toEqual(['1', '2', '3']);
    expect(p.students[0].goals).toEqual([{ minutes: 20, period: 'semesterly', type: 'indirect' }]);
    expect(p.students[1].goals).toEqual([{ minutes: 10, period: 'monthly', type: 'indirect' }]); // inside but indirect: kept
    expect(p.students[2].goals).toEqual([{ minutes: 90, period: 'monthly', type: 'direct' }]);
    expect(p.issues.some((i) => i.message.includes('Student 4') && i.message.includes('push-in'))).toBe(true);
  });

  it('the SAME format parses from an uploaded workbook', () => {
    const p = parseCaseloadWorkbook(
      sheet([
        ['Case No.', 'Plan Information'],
        ['1', '8/1/2025 - 8/1/2026 Occupational Therapy (Indirect | Outside) 20 minutes semesterly'],
        ['3', '10/1/2026 - 10/1/2027 Occupational Therapy (Direct | Outside) 90 minutes monthly'],
      ]),
    );
    expect(p.students.map((s) => `${s.displayId}:${s.goals[0].type}:${s.goals[0].minutes}`)).toEqual([
      '1:indirect:20',
      '3:direct:90',
    ]);
  });

  it('a name in the case column never imports', () => {
    const p = parseCaseloadText('Case No.\tPlan Information\nBobby\tOT (Direct | Outside) 30 minutes weekly');
    expect(p.students).toEqual([]);
    expect(p.issues[0].message).toContain('names never import');
  });
});
