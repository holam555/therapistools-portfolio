// Parses a real .xlsx worksheet (extracted to a neutral SheetData shape by the
// UI layer) into sessions. Unlike a clipboard paste, a workbook carries merged
// cells (session durations) and fill colors, so sheets like a color-coded SLP
// schedule import directly. Color alone can never name a student, though -
// colored cells without a student number are reported, never guessed.

import { dedupeIssues, parseSchoolTime, parseStudentCell, sessionsFromSlots, DAY_PATTERNS } from './importSchedule';
import type { ParsedSchedule, ParseIssue, Slot } from './importSchedule';
import type { DayOfWeek, Minutes, Workspace } from './types';
import { DAY_NAMES, formatMinutesWithPeriod } from './types';

export interface SheetCell {
  text: string;
  /** Solid-fill color as RRGGBB uppercase hex, when the cell has one. */
  color?: string;
}

export interface SheetMerge {
  r1: number;
  c1: number;
  r2: number;
  c2: number; // 0-based, inclusive
}

export interface SheetData {
  cells: SheetCell[][]; // [row][col], 0-based
  merges: SheetMerge[];
}

/** Grays and near-whites (zebra striping, "unavailable" shading) carry no meaning. */
export function isNeutralColor(hex: string): boolean {
  const m = hex.match(/^([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i);
  if (!m) return true;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread <= 24; // achromatic-ish: white, grays, black
}

interface RowTime {
  start: Minutes;
  end?: Minutes; // ranges carry their own end; single times get the next row's start
}

function parseRowTime(text: string): RowTime | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const rm = trimmed.match(/^(.+?)\s*[-–—]\s*(.+?)(\s*\(.*\))?$/);
  if (rm) {
    const start = parseSchoolTime(rm[1]);
    const end = parseSchoolTime(rm[2]);
    if (start !== undefined && end !== undefined && end > start) return { start, end };
    return undefined;
  }
  const single = parseSchoolTime(trimmed);
  return single !== undefined ? { start: single } : undefined;
}

export function parseWorkbookSchedule(sheet: SheetData, ws: Workspace): ParsedSchedule {
  const issues: ParseIssue[] = [];
  const { cells, merges } = sheet;

  // Row → time from the first column. Single-time rows (a 5-minute-slot sheet)
  // end where the next timed row starts.
  const rowTimes = new Map<number, RowTime>();
  for (let r = 0; r < cells.length; r++) {
    const t = parseRowTime(cells[r]?.[0]?.text ?? '');
    if (t) rowTimes.set(r, t);
  }
  const timedRows = [...rowTimes.keys()].sort((a, b) => a - b);
  const endOfRow = (r: number): Minutes => {
    const t = rowTimes.get(r)!;
    if (t.end !== undefined) return t.end;
    const next = timedRows.find((x) => x > r);
    const nextStart = next !== undefined ? rowTimes.get(next)!.start : undefined;
    return nextStart !== undefined && nextStart > t.start ? nextStart : t.start + 5;
  };
  if (timedRows.length === 0) {
    issues.push({ line: 1, message: 'No time column found - the first column must hold times like "8:00-8:30" or 5-minute slot times like "8:00".' });
    return { sessions: [], issues };
  }

  // Day header columns, or a single student column applied to every day.
  let colDays: Map<number, DayOfWeek> | null = null;
  for (let r = 0; r < Math.min(cells.length, 10); r++) {
    const map = new Map<number, DayOfWeek>();
    (cells[r] ?? []).forEach((c, idx) => {
      const hit = DAY_PATTERNS.find(([re]) => re.test((c?.text ?? '').trim()));
      if (hit && idx > 0) map.set(idx, hit[1]);
    });
    if (map.size >= 2) {
      colDays = map;
      break;
    }
  }
  const reads: Array<{ col: number; days: DayOfWeek[] }> = colDays
    ? [...colDays].map(([col, day]) => ({ col, days: [day] }))
    : [{ col: 1, days: [0, 1, 2, 3, 4] as DayOfWeek[] }];
  if (!colDays) {
    issues.push({ line: 1, message: 'No Mon-Fri header row found - reading column B as a daily schedule (every row repeats Monday to Friday).' });
  }

  // Merge lookup: column → anchor row → last row.
  const mergeByCol = new Map<number, Map<number, number>>();
  for (const m of merges) {
    if (m.c1 !== m.c2) continue; // horizontal merges (titles) don't shape sessions
    const col = mergeByCol.get(m.c1) ?? new Map<number, number>();
    col.set(m.r1, m.r2);
    mergeByCol.set(m.c1, col);
  }
  const coveredByMerge = new Set<string>();
  for (const m of merges) {
    if (m.c1 !== m.c2) continue;
    for (let r = m.r1 + 1; r <= m.r2; r++) coveredByMerge.add(`${r}:${m.c1}`);
  }

  const slots = new Map<DayOfWeek, Slot[]>();
  const addSlot = (day: DayOfWeek, slot: Slot) => {
    const list = slots.get(day) ?? [];
    list.push(slot);
    slots.set(day, list);
  };

  for (const { col, days } of reads) {
    for (const r of timedRows) {
      if (coveredByMerge.has(`${r}:${col}`)) continue;
      const cell = cells[r]?.[col];
      if (!cell) continue;
      const text = (cell.text ?? '').trim();
      const meaningful = cell.color !== undefined && !isNeutralColor(cell.color);
      if (!text && !meaningful) continue;

      const lastRow = mergeByCol.get(col)?.get(r) ?? r;
      let start = rowTimes.get(r)!.start;
      let end = endOfRow(rowTimes.has(lastRow) ? lastRow : r);
      // An explicit range written in the cell wins over the merge extent.
      const tm = text.match(/(\d{1,2}(?::\d{2})?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?)/);
      if (tm) {
        const ts = parseSchoolTime(tm[1]);
        const te = parseSchoolTime(tm[2]);
        if (ts !== undefined && te !== undefined && te > ts) {
          start = ts;
          end = te;
        }
      }
      if (end <= start) continue;

      const { numbers, unparsed } = parseStudentCell(text.replace(tm?.[0] ?? '', ''));
      for (const u of unparsed) {
        issues.push({ line: r + 1, message: `Ignored "${u}" - not a student number (names never import).` });
      }
      if (numbers.length === 0) {
        if (meaningful) {
          const where = colDays ? DAY_NAMES[days[0]] : 'Every day';
          issues.push({
            line: r + 1,
            message: `${where} ${formatMinutesWithPeriod(start)}-${formatMinutesWithPeriod(end)}: colored cell with no student number - skipped. Color alone can't identify a student; write the number in the cell.`,
          });
        }
        continue;
      }
      const sorted = [...new Set(numbers)].sort((a, b) => a - b);
      for (const day of days) addSlot(day, { start, end, numbers: sorted, line: r + 1 });
    }
  }

  const sessions = sessionsFromSlots(slots, ws, issues);
  return { sessions, issues: dedupeIssues(issues) };
}
