import { describe, expect, it } from 'vitest';
import { isNeutralColor, parseWorkbookSchedule, type SheetData } from './importWorkbook';
import type { Workspace } from './types';
import { emptyWorkspace } from './types';

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.grades.push({ id: 'g1', name: 'Grade 1', level: 1, templatePolarity: 'blocked', templateBlocks: [] });
  for (const n of [4, 7, 12, 14, 17]) {
    ws.students.push({ id: `stu-${n}`, displayId: String(n), gradeId: 'g1', serviceGoals: [], overrides: [] });
  }
  return ws;
}

const cell = (text = '', color?: string) => ({ text, color });

describe('isNeutralColor', () => {
  it.each([
    ['CCCCCC', true],
    ['B7B7B7', true],
    ['FFFFFF', true],
    ['F6F8F9', true], // near-white zebra stripe
    ['EA4335', false], // red
    ['46BDC6', false], // teal
    ['FBBC04', false], // yellow
  ])('%s → %s', (hex, expected) => {
    expect(isNeutralColor(hex)).toBe(expected);
  });
});

describe('parseWorkbookSchedule', () => {
  it('reads a day-column grid with merged cells as durations', () => {
    // rows: header, then 5-minute slot times 8:00/8:05/8:10; C column merged rows 1-3
    const sheet: SheetData = {
      cells: [
        [cell(''), cell('Mon'), cell('Tues')],
        [cell('8:00'), cell(''), cell('十二號', '46BDC6')],
        [cell('8:05'), cell(''), cell('')],
        [cell('8:10'), cell(''), cell('')],
        [cell('8:15'), cell(''), cell('')],
      ],
      merges: [{ r1: 1, c1: 2, r2: 3, c2: 2 }],
    };
    const { sessions, issues } = parseWorkbookSchedule(sheet, fixture());
    expect(issues).toEqual([]);
    expect(sessions).toEqual([
      { day: 1, start: 480, durationMin: 15, studentIds: ['stu-12'], studentDisplayIds: ['12'] },
    ]);
  });

  it('range-labelled rows work without merges', () => {
    const sheet: SheetData = {
      cells: [
        [cell(''), cell('Mon'), cell('Tues')],
        [cell('8-8:30'), cell('十二號 十四號'), cell('')],
      ],
      merges: [],
    };
    const { sessions } = parseWorkbookSchedule(sheet, fixture());
    expect(sessions).toEqual([
      { day: 0, start: 480, durationMin: 30, studentIds: ['stu-12', 'stu-14'], studentDisplayIds: ['12', '14'] },
    ]);
  });

  it('flags colored cells without a student number instead of guessing', () => {
    const sheet: SheetData = {
      cells: [
        [cell(''), cell('Mon'), cell('Tues')],
        [cell('9:00'), cell('', 'EA4335'), cell('')],
        [cell('9:05'), cell(''), cell('')],
      ],
      merges: [],
    };
    const { sessions, issues } = parseWorkbookSchedule(sheet, fixture());
    expect(sessions).toEqual([]);
    expect(issues.some((i) => /colored cell with no student number/.test(i.message))).toBe(true);
  });

  it('ignores gray and near-white fills silently', () => {
    const sheet: SheetData = {
      cells: [
        [cell(''), cell('Mon'), cell('Tues')],
        [cell('9:00'), cell('', 'CCCCCC'), cell('', 'F6F8F9')],
      ],
      merges: [],
    };
    const { sessions, issues } = parseWorkbookSchedule(sheet, fixture());
    expect(sessions).toEqual([]);
    expect(issues).toEqual([]);
  });

  it('explicit range in cell text wins over merge extent', () => {
    const sheet: SheetData = {
      cells: [
        [cell(''), cell('Mon'), cell('Tues')],
        [cell('10:30'), cell('六號 十五號 10:30-11:15', 'FBBC04'), cell('')],
        [cell('10:35'), cell(''), cell('')],
      ],
      merges: [{ r1: 1, c1: 1, r2: 2, c2: 1 }],
    };
    const ws = fixture();
    ws.students.push(
      { id: 'stu-6', displayId: '6', gradeId: 'g1', serviceGoals: [], overrides: [] },
      { id: 'stu-15', displayId: '15', gradeId: 'g1', serviceGoals: [], overrides: [] },
    );
    const { sessions } = parseWorkbookSchedule(sheet, ws);
    expect(sessions.map((s) => s.durationMin)).toEqual([30, 15]); // 45 min chunked
    expect(sessions[0].start).toBe(630);
  });

  it('no day headers → single column repeats Mon-Fri, with a notice', () => {
    const sheet: SheetData = {
      cells: [
        [cell('Time'), cell('Student')],
        [cell('8:45-9:15'), cell('十二號')],
      ],
      merges: [],
    };
    const { sessions, issues } = parseWorkbookSchedule(sheet, fixture());
    expect(sessions).toHaveLength(5);
    expect(sessions.map((s) => s.day)).toEqual([0, 1, 2, 3, 4]);
    expect(issues.some((i) => /reading column B as a daily schedule/.test(i.message))).toBe(true);
  });

  it('names in cells are reported and never imported', () => {
    const sheet: SheetData = {
      cells: [
        [cell(''), cell('Mon'), cell('Tues')],
        [cell('9:00-9:30'), cell('十七號 Jacob'), cell('')],
      ],
      merges: [],
    };
    const { sessions, issues } = parseWorkbookSchedule(sheet, fixture());
    expect(sessions[0].studentDisplayIds).toEqual(['17']);
    expect(issues.some((i) => i.message.includes('Jacob') && i.message.includes('names never import'))).toBe(true);
  });

  it('errors when no time column exists', () => {
    const sheet: SheetData = { cells: [[cell('hello'), cell('world')]], merges: [] };
    const { issues } = parseWorkbookSchedule(sheet, fixture());
    expect(issues[0].message).toMatch(/No time column/);
  });
});
