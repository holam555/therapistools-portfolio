import { describe, expect, it } from 'vitest';
import { defaultMasterAction, parseGradeScheduleText, parseMasterWorkbook, splitPastedEntries } from './importMaster';
import type { SheetData } from './importWorkbook';

const cell = (text: string) => ({ text });

function sheet(rows: string[][]): SheetData {
  return { cells: rows.map((r) => r.map(cell)), merges: [] };
}

describe('parseMasterWorkbook', () => {
  it('reads grade columns, embedded text ranges winning over row position', () => {
    const s = sheet([
      ['', 'Kindergarten', '1st Grade'],
      ['7:40 - 7:45', 'Do Now 7:40 - 7:50', ''],
      ['7:45 - 7:50', '', ''],
      ['7:50 - 7:55', 'Math 8:25 - 9:40 75 min.', 'Lunch/Recess 11:05 - 11:45'],
    ]);
    const p = parseMasterWorkbook(s);
    expect(p.grades.map((g) => g.name)).toEqual(['Grade K', 'Grade 1']);
    const k = p.grades[0];
    expect(k.blocks).toEqual([
      { label: 'Do Now', start: 460, end: 470 },
      { label: 'Math', start: 505, end: 580 }, // 8:25-9:40 from TEXT, not the 7:50 row
    ]);
    expect(p.grades[1].blocks).toEqual([{ label: 'Lunch/Recess', start: 665, end: 705 }]);
  });

  it('shifts grade columns when headers sit above the time column', () => {
    const s = sheet([
      ['Kindergarten', '1st Grade', ''],
      ['7:40 - 7:45', 'Do Now 7:40 - 7:50', 'Phonics 8:00 - 8:20'],
      ['7:45 - 7:50', '', ''],
      ['7:50 - 7:55', '', ''],
    ]);
    const p = parseMasterWorkbook(s);
    expect(p.issues.some((i) => i.message.includes('one column left'))).toBe(true);
    expect(p.grades[0].blocks[0].label).toBe('Do Now'); // column B belongs to K
    expect(p.grades[1].blocks[0].label).toBe('Phonics');
  });

  it('label on one line, range on the next; strays and case numbers cleaned', () => {
    const s = sheet([
      ['', 'Grade 2', 'Grade 3'],
      ['8:00 - 8:05', 'Do Now\n8:00 - 8:10\n8:00-8:10 1', 'WIN ((ELD for case no.11)) 9:45 - 10:30'],
    ]);
    const p = parseMasterWorkbook(s);
    expect(p.grades[0].blocks).toEqual([{ label: 'Do Now', start: 480, end: 490 }]);
    expect(p.grades[1].blocks).toEqual([{ label: 'WIN', start: 585, end: 630 }]);
  });

  it('a cell with no range covers its own row slot', () => {
    const s = sheet([
      ['', 'Grade 4', 'Grade 5'],
      ['2:30-2:35', '5 Minute Dismissal', ''],
    ]);
    const p = parseMasterWorkbook(s);
    expect(p.grades[0].blocks).toEqual([{ label: 'Dismissal', start: 870, end: 875 }]);
  });

  it('default actions: core/breaks block, ELD-style optional, rest open', () => {
    expect(defaultMasterAction('Math')).toBe('block');
    expect(defaultMasterAction('Lunch/Recess')).toBe('block');
    expect(defaultMasterAction('Specials')).toBe('block');
    expect(defaultMasterAction('Win Time/ELD Block')).toBe('optional');
    expect(defaultMasterAction('NEP Reading Group')).toBe('optional');
    expect(defaultMasterAction('Phonics')).toBe('open');
    expect(defaultMasterAction('Morning Meeting')).toBe('open');
  });

  it('warns when a column looks like several grades packed together', () => {
    const s = sheet([
      ['', 'Kindergarten', '1st Grade'],
      ['10:45 - 10:50', 'Lunch/Recess 10:45 - 11:25', ''],
      ['11:05 - 11:10', 'Lunch/Recess 11:05 - 11:45', ''],
      ['11:25 - 11:30', '', 'Lunch/Recess 11:25 - 12:05'],
    ]);
    const p = parseMasterWorkbook(s);
    expect(p.issues.some((i) => i.message.includes('pack several grades'))).toBe(true);
    // A clean single-lunch column stays quiet.
    const clean = parseMasterWorkbook(
      sheet([
        ['', 'Kindergarten', '1st Grade'],
        ['10:45 - 10:50', 'Lunch/Recess 10:45 - 11:25', 'Lunch/Recess 11:05 - 11:45'],
        ['12:00 - 12:05', 'Math 12:00 - 12:45', 'Math 12:00 - 12:45'],
      ]),
    );
    expect(clean.issues.some((i) => i.message.includes('pack several grades'))).toBe(false);
  });

  it('reports when no grade header row exists', () => {
    const p = parseMasterWorkbook(sheet([['nothing', 'here'], ['8:00', 'still nothing']]));
    expect(p.grades).toEqual([]);
    expect(p.issues[0].message).toContain('No grade header row');
  });
});

describe('parseGradeScheduleText (one grade pasted from Excel)', () => {
  const fmt = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

  it('reads a real Kindergarten paste: quoted multi-line cells, blank rows, case notes', () => {
    const paste = [
      'Kindergarten',
      '"Do Now',
      '7:40 - 7:50 10 min."',
      '',
      'Morning Meeting 7:50 - 8:00 10 min.',
      '',
      '',
      '"Win Time/ELD Block  8:55 - 9:40 45 min. ',
      '(ELD for case no.19)"',
      '',
      'Lunch/Recess 10:45 -11:25 40 min.',
      '',
      'Writing 12:25 - 1:10  45 min.',
    ].join('\n');
    const r = parseGradeScheduleText(paste);
    expect(r.gradeName).toBe('Kindergarten');
    expect(r.issues).toEqual([]);
    expect(r.blocks.map((b) => `${fmt(b.start)}-${fmt(b.end)} ${b.label}`)).toEqual([
      '7:40-7:50 Do Now',
      '7:50-8:00 Morning Meeting',
      '8:55-9:40 Win Time/ELD Block', // case number stripped
      '10:45-11:25 Lunch/Recess',
      '12:25-13:10 Writing', // 1:10 read as afternoon
    ]);
  });

  it('splitPastedEntries keeps quoted cells whole and drops blank rows', () => {
    expect(splitPastedEntries('"a\nb"\n\nc\n')).toEqual(['a\nb', 'c']);
  });

  it('a period with no time range is reported, not guessed', () => {
    const r = parseGradeScheduleText('Math 9:00 - 9:30\nAssembly sometime');
    expect(r.blocks).toHaveLength(1);
    expect(r.issues[0].message).toContain('Assembly sometime');
  });

  it('empty or unreadable paste says so', () => {
    const r = parseGradeScheduleText('just words');
    expect(r.blocks).toEqual([]);
    expect(r.issues.some((i) => i.message.includes('No periods found'))).toBe(true);
  });

  it('duplicate rows collapse; blocks come back in time order', () => {
    const r = parseGradeScheduleText('Writing 12:25 - 1:10\nMath 9:00 - 9:30\nWriting 12:25 - 1:10');
    expect(r.blocks.map((b) => b.label)).toEqual(['Math', 'Writing']);
  });
});
