// Parser for provider schedules pasted straight out of Excel: a grid with a
// time-range column (e.g. "8-8:15", "12:30-12:45") and Mon-Fri day columns
// whose cells name student numbers - Arabic ("12 14") or Chinese ("十二號 十四號").
// Consecutive slots with the same student group merge into one session, then
// split into legal session lengths (10/15/20/25/30).

import type { DayOfWeek, Minutes, SessionLength, Student, Workspace } from './types';
import { SESSION_LENGTHS } from './types';

export interface ParsedSession {
  day: DayOfWeek;
  start: Minutes;
  durationMin: SessionLength;
  studentIds: string[]; // resolved internal ids
  studentDisplayIds: string[];
}

export interface ParseIssue {
  line: number; // 1-based row in the pasted text
  message: string;
}

export interface ParsedSchedule {
  sessions: ParsedSession[];
  issues: ParseIssue[];
}

const CN_DIGITS: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

/** "十二" → 12, "二十一" → 21, "十" → 10, "五" → 5. Returns undefined if not numeric. */
export function parseChineseNumber(text: string): number | undefined {
  if (/^\d+$/.test(text)) return Number(text);
  const m = text.match(/^([一二三四五六七八九])?(十)?([一二三四五六七八九])?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined;
  const [, tensDigit, ten, ones] = m;
  if (!ten) return tensDigit && !ones ? CN_DIGITS[tensDigit] : undefined;
  return (tensDigit ? CN_DIGITS[tensDigit] : 1) * 10 + (ones ? CN_DIGITS[ones] : 0);
}

/**
 * Split a cell like "十七號 & 十一號" / "12, 14" / "15/ 10" / "4-3" into
 * student numbers. "Group N" is a group LABEL, not a student - "Group 3
 * 十四號" is student 14 only. Parenthetical annotations ("(TBD)", "(MB)")
 * are teacher shorthand and are dropped.
 */
export function parseStudentCell(cell: string): { numbers: number[]; unparsed: string[] } {
  const numbers: number[] = [];
  const unparsed: string[] = [];
  const withoutGroupLabels = cell
    .replace(/\([^)]*\)/g, ' ')
    .replace(/group\s*(\d+|[一二三四五六七八九十]+)?/gi, ' ');
  const tokens = withoutGroupLabels
    .split(/[\s&,，、+/-]+/)
    .map((t) => t.replace(/[號号#]/g, '').trim())
    .filter(Boolean);
  for (const t of tokens) {
    const n = parseChineseNumber(t);
    if (n === undefined) unparsed.push(t);
    else numbers.push(n);
  }
  return { numbers, unparsed };
}

/**
 * "8" → 480, "12:30" → 750, "1:15" → 795, "7:50:00 AM" → 470.
 * School hours: 1-6 means PM even when a sheet mislabels it "AM"; 12 = noon.
 * Seconds and AM/PM suffixes (exported sheets love both) are accepted.
 */
export function parseSchoolTime(text: string): Minutes | undefined {
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return undefined;
  if (m[3]?.toLowerCase().startsWith('p') && h < 12) h += 12;
  if (h <= 6) h += 12; // afternoon shorthand, overriding a mislabeled "AM"
  return h * 60 + min;
}

export const DAY_PATTERNS: Array<[RegExp, DayOfWeek]> = [
  [/^mon/i, 0],
  [/^tue/i, 1],
  [/^wed/i, 2],
  [/^thu/i, 3],
  [/^fri/i, 4],
];

/** Split a merged run into legal session lengths, longest-first. */
export function chunkDuration(total: number): SessionLength[] {
  const out: SessionLength[] = [];
  let rest = total;
  while (rest > 0) {
    let pick = [...SESSION_LENGTHS].reverse().find((len) => len <= rest);
    if (!pick) break; // rest is 5 - unrepresentable; drop it
    // Avoid stranding a 5-minute remainder: 35 → 25 + 10, not 30 + 5.
    if (rest - pick === 5) pick = (pick - 5) as SessionLength;
    out.push(pick);
    rest -= pick;
  }
  return out;
}

export interface Slot {
  start: Minutes;
  end: Minutes;
  numbers: number[];
  line: number;
}

export type ScheduleShape = 'columns' | 'everyday';

/**
 * Guess the paste's shape: a row with two or more day names (Mon/Tue/…) means
 * day columns; otherwise it's a time+student list that repeats daily.
 */
export function detectShape(text: string): ScheduleShape {
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const dayCells = line
      .split('\t')
      .filter((c) => DAY_PATTERNS.some(([re]) => re.test(c.trim()))).length;
    if (dayCells >= 2) return 'columns';
  }
  return 'everyday';
}

export function parseScheduleGrid(
  text: string,
  ws: Workspace,
  shape: ScheduleShape = 'columns',
): ParsedSchedule {
  const issues: ParseIssue[] = [];
  const lines = text.replace(/\r/g, '').split('\n');

  // 'columns' shape: find the Mon-Fri header row and map column index → day.
  // 'everyday' shape: one time column + one student column, repeated Mon-Fri.
  let colDays: Map<number, DayOfWeek> | null = null;
  let headerLine = -1;
  if (shape === 'columns') {
    for (let i = 0; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      const map = new Map<number, DayOfWeek>();
      cells.forEach((c, idx) => {
        const hit = DAY_PATTERNS.find(([re]) => re.test(c.trim()));
        if (hit) map.set(idx, hit[1]);
      });
      if (map.size >= 2) {
        colDays = map;
        headerLine = i;
        break;
      }
    }
    if (!colDays) {
      issues.push({ line: 1, message: 'No day header row found (need Mon/Tue/… column titles). Copy the grid including its day headers - or switch to "Same every day" if this schedule has no day columns.' });
      return { sessions: [], issues };
    }
  }

  // Collect per-day slots.
  const slots = new Map<DayOfWeek, Slot[]>();
  const addSlot = (day: DayOfWeek, slot: Slot) => {
    const list = slots.get(day) ?? [];
    list.push(slot);
    slots.set(day, list);
  };
  // Row → time, first pass. Two sheet styles coexist: ranges ("8:00-8:30")
  // carry their own end, and single time points ("8:00" / "8:10" / "8:20")
  // run until the NEXT timed row - the block IS the gap between rows. The
  // last point row falls back to the sheet's typical row spacing.
  const rowTime = new Map<number, { start: Minutes; end?: Minutes }>();
  for (let i = headerLine + 1; i < lines.length; i++) {
    const t = lines[i].split('\t')[0]?.trim();
    if (!t || /^time$/i.test(t)) continue;
    const rm = t.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (rm) {
      const start = parseSchoolTime(rm[1]);
      const end = parseSchoolTime(rm[2]);
      if (start !== undefined && end !== undefined && end > start) rowTime.set(i, { start, end });
      continue;
    }
    const single = parseSchoolTime(t);
    if (single !== undefined) rowTime.set(i, { start: single });
  }
  const timedLines = [...rowTime.keys()].sort((a, b) => a - b);
  const spacings = timedLines
    .slice(1)
    .map((r, x) => rowTime.get(r)!.start - rowTime.get(timedLines[x])!.start)
    .filter((g) => g > 0)
    .sort((a, b) => a - b);
  const typicalGap = spacings.length > 0 ? spacings[Math.floor(spacings.length / 2)] : 15;
  const endOfLine = (i: number): Minutes => {
    const t = rowTime.get(i)!;
    if (t.end !== undefined) return t.end;
    const next = timedLines.find((x) => x > i && rowTime.get(x)!.start > t.start);
    return next !== undefined ? rowTime.get(next)!.start : t.start + typicalGap;
  };

  for (let i = headerLine + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = lines[i].split('\t');
    const timeText = cells[0]?.trim();
    if (!timeText) continue;
    if (!rowTime.has(i)) {
      if (cells.some((c, idx) => idx > 0 && c.trim()) && !/^time$/i.test(timeText)) {
        issues.push({ line: i + 1, message: `Couldn't read time "${timeText}" - row skipped.` });
      }
      continue;
    }
    const start = rowTime.get(i)!.start;
    const end = endOfLine(i);
    if (end <= start) continue;
    // Which cells hold students, and which day(s) they land on.
    const reads: Array<{ cell: string | undefined; days: DayOfWeek[] }> =
      shape === 'columns'
        ? [...colDays!].map(([col, day]) => ({ cell: cells[col], days: [day] }))
        : [{ cell: cells[1], days: [0, 1, 2, 3, 4] as DayOfWeek[] }];
    for (const { cell, days } of reads) {
      const value = cell?.trim();
      if (!value) continue;
      const { numbers, unparsed } = parseStudentCell(value);
      for (const u of unparsed) {
        issues.push({ line: i + 1, message: `Ignored "${u}" in "${value}" - not a student number.` });
      }
      if (numbers.length === 0) continue;
      const sorted = [...new Set(numbers)].sort((a, b) => a - b);
      for (const day of days) addSlot(day, { start, end, numbers: sorted, line: i + 1 });
    }
  }

  const sessions = sessionsFromSlots(slots, ws, issues);
  return { sessions, issues: dedupeIssues(issues) };
}

/**
 * One "Same every day" source row becomes five day-slots, so the same
 * problem would otherwise be reported five times. Collapse identical
 * (line, message) pairs, keeping the first occurrence's order.
 */
export function dedupeIssues(issues: ParseIssue[]): ParseIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.line}|${i.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Shared back half of every import path: merge consecutive slots with the
 * same student set, resolve display numbers to students, and chunk runs into
 * legal session lengths. Appends problems to `issues`.
 */
export function sessionsFromSlots(
  slots: Map<DayOfWeek, Slot[]>,
  ws: Workspace,
  issues: ParseIssue[],
): ParsedSession[] {
  const byId = new Map<string, Student>();
  for (const s of ws.students) byId.set(s.displayId, s);

  const sessions: ParsedSession[] = [];
  for (const [day, list] of slots) {
    list.sort((a, b) => a.start - b.start);
    const runs: Slot[] = [];
    for (const s of list) {
      const last = runs[runs.length - 1];
      if (last && last.end === s.start && last.numbers.join() === s.numbers.join()) {
        last.end = s.end;
      } else {
        runs.push({ ...s });
      }
    }
    for (const run of runs) {
      const ids: string[] = [];
      const displayIds: string[] = [];
      const missing: number[] = [];
      for (const n of run.numbers) {
        const student = byId.get(String(n));
        if (!student) {
          missing.push(n);
        } else {
          ids.push(student.id);
          displayIds.push(student.displayId);
        }
      }
      if (missing.length > 0) {
        // Import what we CAN: a group session keeps its known students and
        // only loses the missing ones. Nothing is skipped unless every
        // student in the cell is unknown.
        issues.push({
          line: run.line,
          message:
            ids.length > 0
              ? `Student ${missing.join(', ')} not found in the app - imported without them. Add the student, then import again to include them.`
              : `Student ${missing.join(', ')} not found in the app - session skipped. Add the student first.`,
        });
      }
      if (ids.length === 0) continue;
      const total = run.end - run.start;
      let cursor = run.start;
      const chunks = chunkDuration(total);
      const covered = chunks.reduce((a, b) => a + b, 0);
      if (covered < total) {
        issues.push({ line: run.line, message: `${total - covered} leftover minute(s) at the end of a run couldn't form a session and were dropped.` });
      }
      for (const len of chunks) {
        sessions.push({ day, start: cursor, durationMin: len, studentIds: ids, studentDisplayIds: displayIds });
        cursor += len;
      }
    }
  }

  sessions.sort((a, b) => a.day - b.day || a.start - b.start);
  return sessions;
}
