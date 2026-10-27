import { describe, expect, it } from 'vitest';
import { chunkDuration, detectShape, parseChineseNumber, parseScheduleGrid, parseSchoolTime, parseStudentCell } from './importSchedule';
import type { Workspace } from './types';
import { emptyWorkspace } from './types';

describe('parseChineseNumber', () => {
  it.each([
    ['五', 5],
    ['九', 9],
    ['十', 10],
    ['十二', 12],
    ['十七', 17],
    ['二十', 20],
    ['二十一', 21],
    ['12', 12],
    ['abc', undefined],
    ['', undefined],
  ])('%s → %s', (input, expected) => {
    expect(parseChineseNumber(input)).toBe(expected);
  });
});

describe('parseStudentCell', () => {
  it('parses Chinese numerals with 號 suffix', () => {
    expect(parseStudentCell('十二號 十四號').numbers).toEqual([12, 14]);
  });
  it('parses & separators', () => {
    expect(parseStudentCell('十七號 & 十一號').numbers).toEqual([17, 11]);
  });
  it('parses Arabic digits and commas', () => {
    expect(parseStudentCell('12, 14').numbers).toEqual([12, 14]);
  });
  it('reports unparsable tokens', () => {
    const r = parseStudentCell('十二號 lunch');
    expect(r.numbers).toEqual([12]);
    expect(r.unparsed).toEqual(['lunch']);
  });
  it('treats "Group N" as a label, not a student', () => {
    expect(parseStudentCell('Group 3  十四號').numbers).toEqual([14]);
    expect(parseStudentCell('Group 9 六號').numbers).toEqual([6]);
    expect(parseStudentCell('group 十二 五號').numbers).toEqual([5]);
  });
  it('dangling & is harmless', () => {
    expect(parseStudentCell('九號 &').numbers).toEqual([9]);
  });
});

describe('parseSchoolTime', () => {
  it.each([
    ['8', 480],
    ['8:15', 495],
    ['12', 720],
    ['12:30', 750],
    ['1', 780], // 1 PM
    ['3:40', 940],
    ['11:45', 705],
    ['x', undefined],
  ])('%s → %s', (input, expected) => {
    expect(parseSchoolTime(input)).toBe(expected);
  });
});

describe('chunkDuration', () => {
  it.each([
    [15, [15]],
    [30, [30]],
    [45, [30, 15]],
    [60, [30, 30]],
    [25, [25]],
    [35, [25, 10]], // not 30 + orphaned 5
    [10, [10]],
  ])('%d min → %j', (total, expected) => {
    expect(chunkDuration(total)).toEqual(expected);
  });
});

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.grades.push({ id: 'g1', name: 'Grade 1', level: 1, templatePolarity: 'blocked', templateBlocks: [] });
  for (const n of [2, 5, 12, 14]) {
    ws.students.push({ id: `stu-${n}`, displayId: String(n), gradeId: 'g1', serviceGoals: [], overrides: [] });
  }
  return ws;
}

const HEADER = '\tMon\tTues\tWeds\tThurs\tFri';

describe('detectShape', () => {
  it('day header row → columns', () => {
    expect(detectShape('\tMon\tTues\tWeds\tThurs\tFri\n8-8:15\t十二號')).toBe('columns');
  });
  it('plain time list → everyday', () => {
    expect(detectShape('Time\tStudent\n8:45-9:15\t十二號\n10-10:15\t十七號')).toBe('everyday');
  });
  it('a single day name is not a header row', () => {
    expect(detectShape('8:45-9:15\tMonday reading group 十二號')).toBe('everyday');
  });
});

describe('parseScheduleGrid', () => {
  it('merges consecutive slots into one session per day', () => {
    const text = [
      'MH',
      HEADER,
      '8-8:15\t十二號 十四號\t\t\t\t',
      '8:15-8:30\t十二號 十四號\t\t\t\t',
    ].join('\n');
    const { sessions, issues } = parseScheduleGrid(text, fixture());
    expect(issues).toEqual([]);
    expect(sessions).toEqual([
      {
        day: 0,
        start: 480,
        durationMin: 30,
        studentIds: ['stu-12', 'stu-14'],
        studentDisplayIds: ['12', '14'],
      },
    ]);
  });

  it('same time across days makes one session per day', () => {
    const text = [HEADER, '1:30-1:45\t五號\t五號\t\t五號\t'].join('\n');
    const { sessions } = parseScheduleGrid(text, fixture());
    expect(sessions.map((s) => s.day)).toEqual([0, 1, 3]);
    expect(sessions.every((s) => s.start === 810 && s.durationMin === 15)).toBe(true);
  });

  it('does not merge slots with different student sets', () => {
    const text = [HEADER, '12:30-12:45\t五號 & 二號\t\t\t\t', '12:45-1\t五號\t\t\t\t'].join('\n');
    const { sessions } = parseScheduleGrid(text, fixture());
    expect(sessions).toHaveLength(2);
    expect(sessions[0].studentDisplayIds).toEqual(['2', '5']);
    expect(sessions[1].studentDisplayIds).toEqual(['5']);
  });

  it('flags unknown students and skips their sessions', () => {
    const text = [HEADER, '9-9:15\t九十九號\t\t\t\t'].join('\n');
    const { sessions, issues } = parseScheduleGrid(text, fixture());
    expect(sessions).toEqual([]);
    expect(issues.some((i) => i.message.includes('99'))).toBe(true);
  });

  it('errors without a day header row', () => {
    const { issues } = parseScheduleGrid('8-8:15\t十二號', fixture());
    expect(issues[0].message).toMatch(/day header/);
  });

  it('everyday shape repeats each row Mon-Fri without day headers', () => {
    const text = ['Time\tStudent\tTeacher/ Location\tNotes', '8:45-9:15\t十二號\t\t', '10-10:15\t十四號\t\t'].join('\n');
    const { sessions, issues } = parseScheduleGrid(text, fixture(), 'everyday');
    expect(issues).toEqual([]);
    expect(sessions).toHaveLength(10); // 2 rows × 5 days
    const s12 = sessions.filter((s) => s.studentDisplayIds.join() === '12');
    expect(s12.map((s) => s.day)).toEqual([0, 1, 2, 3, 4]);
    expect(s12.every((s) => s.start === 525 && s.durationMin === 30)).toBe(true);
  });

  it('everyday shape chunks long ranges', () => {
    const text = ['12-1:15\t十二號'].join('\n');
    const { sessions } = parseScheduleGrid(text, fixture(), 'everyday');
    expect(sessions.filter((s) => s.day === 0).map((s) => s.durationMin)).toEqual([30, 30, 15]);
  });

  it('splits long runs into legal lengths', () => {
    const text = [
      HEADER,
      '9-9:15\t五號\t\t\t\t',
      '9:15-9:30\t五號\t\t\t\t',
      '9:30-9:45\t五號\t\t\t\t',
    ].join('\n');
    const { sessions } = parseScheduleGrid(text, fixture());
    expect(sessions.map((s) => s.durationMin)).toEqual([30, 15]);
    expect(sessions[1].start).toBe(570);
  });
});

describe('unknown student numbers', () => {
  it('a group keeps its known students; only the missing one is dropped', () => {
    // 2 and 14 exist in the fixture; 4 does not.
    const { sessions, issues } = parseScheduleGrid([HEADER, '9-9:30\t2,4,14\t\t\t\t'].join('\n'), fixture());
    expect(sessions).toHaveLength(1);
    expect(sessions[0].studentDisplayIds).toEqual(['2', '14']);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('imported without them');
  });

  it('a cell where NO student is known is still skipped', () => {
    const { sessions, issues } = parseScheduleGrid([HEADER, '9-9:30\t4,7\t\t\t\t'].join('\n'), fixture());
    expect(sessions).toHaveLength(0);
    expect(issues[0].message).toContain('session skipped');
  });

  it('"Same every day" reports each problem once, not five times', () => {
    const text = 'Time\tStudent\n9-9:30\t4\n10-10:30\t2';
    const { sessions, issues } = parseScheduleGrid(text, fixture(), 'everyday');
    // The known student books all five days; the unknown one warns once.
    expect(sessions).toHaveLength(5);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('Student 4');
  });
});

describe('time-point sheets (one time per row, block runs to the next row)', () => {
  it('reads single-time rows with seconds and AM/PM, blocks end at the next timed row', () => {
    const ws = fixture();
    const text = [
      'Time\tMONDAY\tTUESDAY\tWED\tTHURSDAY\tFRIDAY',
      '7:50:00 AM\t\t\t\t\t',
      '8:00:00 AM\t12 (TBD)\t\t\t\t',
      '8:10:00 AM\t12 (TBD)\t\t\t\t',
      '8:20:00 AM\t\t14\t\t\t',
      '8:30:00 AM\t\t5/ 12\t\t\t',
      '8:45:00 AM\t\t\t\t\t',
      '9:00:00 AM\t\t\t\t\t',
    ].join('\n');
    const { sessions, issues } = parseScheduleGrid(text, ws);
    // Monday: 12 from 8:00 until the empty 8:20 row.
    const mon = sessions.filter((s) => s.day === 0);
    expect(mon).toHaveLength(1);
    expect(mon[0]).toMatchObject({ start: 480, durationMin: 20, studentDisplayIds: ['12'] });
    // Tuesday: 14 fills 8:20-8:30, then the slash group 5,12 fills 8:30-8:45.
    const tue = sessions.filter((s) => s.day === 1);
    expect(tue.map((s) => `${s.start}+${s.durationMin}:${s.studentDisplayIds.join('/')}`)).toEqual([
      '500+10:14',
      '510+15:5/12',
    ]);
    // (TBD) annotations never show up as ignored-token noise.
    expect(issues.some((i) => i.message.includes('TBD'))).toBe(false);
  });

  it('a mislabeled "1:15:00 AM" afternoon row still lands at 1:15 PM', () => {
    const ws = fixture();
    const text = [
      'Time\tMONDAY\tTUESDAY\tWED\tTHURSDAY\tFRIDAY',
      '1:00:00 PM\t14\t\t\t\t',
      '1:15:00 AM\t14\t\t\t\t',
      '1:50:00 PM\t\t\t\t\t',
    ].join('\n');
    const { sessions } = parseScheduleGrid(text, ws);
    const mon = sessions.filter((s) => s.day === 0);
    // 1:00 to 1:50 in one run, chunked legally.
    expect(mon.reduce((n, s) => n + s.durationMin, 0)).toBe(50);
    expect(Math.min(...mon.map((s) => s.start))).toBe(780);
  });

  it('dash-separated students "4-3" split into two numbers', () => {
    const ws = fixture();
    const { sessions } = parseScheduleGrid(
      ['Time\tMONDAY\tTUESDAY\tWED\tTHURSDAY\tFRIDAY', '10:30-11:00\t\t\t\t2-5\t'].join('\n'),
      ws,
    );
    expect(sessions[0].studentDisplayIds).toEqual(['2', '5']);
  });

  it('range rows and point rows can mix in one sheet', () => {
    const ws = fixture();
    const text = [
      'Time\tMONDAY\tTUESDAY\tWED\tTHURSDAY\tFRIDAY',
      '9:00-9:30\t12\t\t\t\t',
      '9:40:00 AM\t14\t\t\t\t',
      '10:00:00 AM\t\t\t\t\t',
    ].join('\n');
    const { sessions } = parseScheduleGrid(text, ws);
    expect(sessions.map((s) => `${s.start}+${s.durationMin}`)).toEqual(['540+30', '580+20']);
  });
});
