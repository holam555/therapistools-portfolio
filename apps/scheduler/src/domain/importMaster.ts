// Parse a school MASTER schedule workbook into per-grade period blocks.
// Format (from real files): a header row of grade columns ("Kindergarten",
// "1st Grade", …), a 5-minute time column on the left, and period cells
// whose TEXT carries the authoritative range ("Math 8:25 - 9:40 75 min.").
// The row a cell sits on is only approximate; the embedded range wins.
// Cells with no range fall back to their row's 5-minute slot.

import type { Minutes } from './types';
import { snapTo5 } from './intervals';
import { parseSchoolTime } from './importSchedule';
import type { SheetData } from './importWorkbook';

export interface MasterBlock {
  label: string;
  start: Minutes;
  end: Minutes;
}

export interface MasterGrade {
  /** K = 0, 1st grade = 1, … */
  level: number;
  name: string;
  blocks: MasterBlock[];
}

export interface MasterIssue {
  message: string;
}

export interface MasterParse {
  grades: MasterGrade[];
  /** Distinct cleaned labels across all grades, with block counts. */
  labels: Array<{ label: string; count: number }>;
  issues: MasterIssue[];
}

/** What the importer proposes to do with one label. */
export type MasterAction = 'block' | 'optional' | 'open';

/**
 * Default treatment per label: core instruction and breaks block everyone;
 * ELD/WIN-style pull-out periods block only opted-in students; the rest
 * (Do Now, Morning Meeting, Phonics, Read Aloud…) stay open for services.
 */
export function defaultMasterAction(label: string): MasterAction {
  const l = label.toLowerCase();
  if (/\beld\b|\bwin\b|nep|lep/.test(l)) return 'optional';
  if (/lunch|recess/.test(l)) return 'block';
  if (/special/.test(l)) return 'block';
  if (/math/.test(l)) return 'block';
  return 'open';
}

const GRADE_HEADER: Array<[RegExp, number]> = [
  [/kinder/i, 0],
  [/\bgrade\s*k\b/i, 0],
  [/^\s*tk\b/i, -1], // transitional kindergarten: recognized but reported
  // Digit runs stay bounded: an unbounded \d+ before a literal backtracks
  // once per start position, which is quadratic on a long run of digits.
  [/(\d{1,2})\s{0,3}(?:st|nd|rd|th)\s{0,3}grade/i, NaN], // level from the captured digit
  [/\bgrade\s{0,3}(\d{1,2})/i, NaN],
];

function headerLevel(text: string): number | undefined {
  for (const [re, fixed] of GRADE_HEADER) {
    const m = text.match(re);
    if (!m) continue;
    if (!Number.isNaN(fixed)) return fixed;
    const n = Number(m[1]);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

const RANGE_RE = /(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)/;

function parseRange(text: string): { start: Minutes; end: Minutes; index: number; length: number } | undefined {
  const m = text.match(RANGE_RE);
  if (!m || m.index === undefined) return undefined;
  const start = parseSchoolTime(m[1]);
  const end = parseSchoolTime(m[2]);
  if (start === undefined || end === undefined) return undefined;
  return { start: snapTo5(start), end: snapTo5(end), index: m.index, length: m[0].length };
}

/** Strip privacy-sensitive parentheticals, durations, and stray digits. */
function cleanLabel(raw: string): string {
  let s = raw;
  // Innermost-out so nested parens ("WIN ((ELD for case no.11))") vanish
  // cleanly; they often carry student case numbers - never keep them.
  for (let guard = 0; guard < 5 && /\([^()]*\)/.test(s); guard++) {
    s = s.replace(/\([^()]*\)/g, ' ');
  }
  return s
    .replace(/[()]/g, ' ') // unbalanced leftovers
    .replace(/\b\d{1,4}\s{0,3}min(?:ute)?s?\.?\b/gi, ' ')
    .replace(/[\s\-–—.,:;/]+$/g, '')
    .replace(/^[\s\-–—.,:;]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Split pasted spreadsheet text into cell-sized entries. Excel wraps a cell
 * containing newlines in double quotes ("Do Now\n7:40 - 7:50 10 min."), so
 * those stay together; every other line is its own entry and the blank
 * ruler rows between periods are dropped.
 */
export function splitPastedEntries(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') {
        buf += '"'; // escaped quote inside a cell
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === '\n' || ch === '\t') && !inQuotes) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export interface GradeScheduleParse {
  /** Grade name if the paste led with one ("Kindergarten"). */
  gradeName?: string;
  blocks: MasterBlock[];
  issues: MasterIssue[];
}

/**
 * Parse ONE grade's schedule pasted as a single column: each period carries
 * its own time range in the text ("Math 11:25 - 12:25 60 min."), blank rows
 * are ignored, and parenthetical case notes are stripped. Blocks apply
 * Monday through Friday - a grade master schedule is the same every day.
 */
export function parseGradeScheduleText(text: string): GradeScheduleParse {
  const issues: MasterIssue[] = [];
  const blocks: MasterBlock[] = [];
  const seen = new Set<string>();
  let gradeName: string | undefined;

  const entries = splitPastedEntries(text);
  for (const [i, entry] of entries.entries()) {
    const flat = entry.replace(/\s*\n\s*/g, ' ').trim();
    if (!flat || isPureTime(flat)) continue;
    const range = parseRange(flat);
    if (!range) {
      const name = cleanLabel(flat);
      // A leading nameless line is the grade heading, not a lost period.
      if (i === 0 && name && headerLevel(name) !== undefined) {
        gradeName = name;
      } else if (name) {
        issues.push({ message: `"${name}" has no time range - skipped.` });
      }
      continue;
    }
    const label = cleanLabel(flat.slice(0, range.index)) || cleanLabel(flat.slice(range.index + range.length));
    if (!label) {
      issues.push({ message: `A period at ${flat.slice(range.index, range.index + range.length)} has no name - skipped.` });
      continue;
    }
    if (range.end <= range.start) {
      issues.push({ message: `"${label}" has an empty or backwards time range - skipped.` });
      continue;
    }
    const key = `${label.toLowerCase()}|${range.start}|${range.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    blocks.push({ label, start: range.start, end: range.end });
  }

  blocks.sort((a, b) => a.start - b.start || a.end - b.end);
  if (blocks.length === 0) {
    issues.push({ message: 'No periods found - each row needs a name and a time range like "Math 11:25 - 12:25".' });
  }
  return { gradeName, blocks, issues };
}

/** A cell that is nothing but a time or time range (the time column). */
function isPureTime(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^\d{1,2}(?::\d{2})?\s*-\s*\d{1,2}(?::\d{2})?\s*\d?$/.test(t) || /^\d{1,2}:\d{2}$/.test(t);
}

/**
 * Parse the first worksheet of a master schedule. Returns one MasterGrade
 * per recognized grade column; every block is (label, start, end) with no
 * day: master schedules apply Monday through Friday.
 */
export function parseMasterWorkbook(sheet: SheetData): MasterParse {
  const issues: MasterIssue[] = [];
  const { cells } = sheet;

  // Header row: the first row where at least two cells look like grades.
  let headerRow = -1;
  const gradeCols = new Map<number, number>(); // col -> level
  for (let r = 0; r < Math.min(cells.length, 10); r++) {
    const found = new Map<number, number>();
    for (let c = 0; c < (cells[r]?.length ?? 0); c++) {
      const lvl = headerLevel(cells[r][c]?.text ?? '');
      if (lvl !== undefined && lvl >= 0) found.set(c, lvl);
    }
    if (found.size >= 2) {
      headerRow = r;
      for (const [c, lvl] of found) gradeCols.set(c, lvl);
      break;
    }
  }
  if (headerRow === -1) {
    return {
      grades: [],
      labels: [],
      issues: [{ message: 'No grade header row found (need columns like "Kindergarten", "1st Grade", "Grade 2").' }],
    };
  }

  // Time column: the column with the most pure-time cells below the header.
  let timeCol = 0;
  let bestCount = 0;
  const maxCols = Math.max(...cells.map((r) => r.length));
  for (let c = 0; c < maxCols; c++) {
    let n = 0;
    for (let r = headerRow + 1; r < cells.length; r++) {
      if (isPureTime(cells[r]?.[c]?.text ?? '')) n++;
    }
    if (n > bestCount) {
      bestCount = n;
      timeCol = c;
    }
  }
  if (bestCount === 0) {
    issues.push({ message: 'No time column found - block times must come from each cell\'s own text.' });
  }

  // Some sheets type the grade headers one column LEFT of their schedules
  // (the first header sits above the time column). Detect and shift.
  if (bestCount > 0 && gradeCols.has(timeCol)) {
    const shifted = new Map<number, number>();
    for (const [c, lvl] of gradeCols) shifted.set(c + 1, lvl);
    gradeCols.clear();
    for (const [c, lvl] of shifted) gradeCols.set(c, lvl);
    issues.push({ message: 'Grade headers sit one column left of their schedules - adjusted automatically.' });
  }

  const rowSlot = (r: number) => parseRange(cells[r]?.[timeCol]?.text ?? '');

  const grades: MasterGrade[] = [];
  const labelCounts = new Map<string, number>();

  for (const [col, level] of [...gradeCols.entries()].sort((a, b) => a[1] - b[1])) {
    const name = level === 0 ? 'Grade K' : `Grade ${level}`;
    const blocks: MasterBlock[] = [];
    const seen = new Set<string>();

    for (let r = headerRow + 1; r < cells.length; r++) {
      const text = (cells[r]?.[col]?.text ?? '').trim();
      if (!text) continue;
      const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      let pendingLabel = '';
      let cellHadRange = false;

      for (const line of lines) {
        const range = parseRange(line);
        if (!range) {
          pendingLabel = cleanLabel(pendingLabel ? `${pendingLabel} ${line}` : line);
          continue;
        }
        cellHadRange = true;
        let label = cleanLabel(line.slice(0, range.index));
        if (!label) {
          label = pendingLabel;
          pendingLabel = '';
        }
        if (!label) continue; // a stray repeated range with no name
        if (range.end <= range.start) {
          issues.push({ message: `${name}: "${label}" has an empty or backwards range - skipped.` });
          continue;
        }
        const key = `${label.toLowerCase()}|${range.start}|${range.end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        blocks.push({ label, start: range.start, end: range.end });
      }

      if (!cellHadRange) {
        // No range anywhere in the cell: it covers just its own row slot.
        const slot = rowSlot(r);
        const label = cleanLabel(text);
        if (slot && label) {
          const key = `${label.toLowerCase()}|${slot.start}|${slot.end}`;
          if (!seen.has(key)) {
            seen.add(key);
            blocks.push({ label, start: slot.start, end: slot.end });
          }
        } else if (label) {
          issues.push({ message: `${name}: "${label}" has no time range and no readable row time - skipped.` });
        }
      }
    }

    blocks.sort((a, b) => a.start - b.start || a.end - b.end);

    // A real single-grade schedule has no overlapping periods and one lunch.
    // Sheets sometimes pack SEVERAL grades' periods into shared columns
    // (each entry typed at its start-time row, leftmost empty cell) - then
    // column position stops meaning grade and imports would be garbage.
    const overlapCount = blocks.filter((a, i) =>
      blocks.some((b, j) => j !== i && a.start < b.end && b.start < a.end),
    ).length;
    const lunchCount = blocks.filter((b) => /lunch/i.test(b.label)).length;
    if (lunchCount > 1 || overlapCount >= 4) {
      issues.push({
        message:
          `Warning: ${name}'s column has ` +
          (lunchCount > 1 ? `${lunchCount} lunches` : `${overlapCount} overlapping periods`) +
          ' - this sheet may pack several grades into shared columns, so grade assignment is unreliable. Give every grade its own clean column before importing.',
      });
    }

    for (const b of blocks) labelCounts.set(b.label, (labelCounts.get(b.label) ?? 0) + 1);
    grades.push({ level, name, blocks });
  }

  return {
    grades,
    labels: [...labelCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    issues,
  };
}
