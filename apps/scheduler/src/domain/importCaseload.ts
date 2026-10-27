// Parse a service caseload workbook: one row per goal with columns like
// Case # | Grade | Service [| Setting]. Rows marked push-in are skipped -
// This app schedules pull-out service. Remaining rows merge per student.

import type { GoalPeriod, ServiceGoal } from './types';
import type { SheetData } from './importWorkbook';

export interface CaseloadGoal {
  minutes: number;
  period: GoalPeriod;
  /** 'indirect' = consult/monitoring; the planner never schedules it. */
  type?: 'direct' | 'indirect';
}

export interface CaseloadStudent {
  displayId: string;
  /** K = 0, 1st grade = 1, … undefined when the grade cell was unreadable. */
  gradeLevel?: number;
  goals: CaseloadGoal[];
}

export interface CaseloadParse {
  students: CaseloadStudent[];
  issues: Array<{ message: string }>;
}

const PERIOD_WORDS: Array<[RegExp, GoalPeriod]> = [
  [/week/i, 'weekly'],
  [/month/i, 'monthly'],
  [/quarter/i, 'quarterly'],
  [/semester/i, 'semesterly'],
  [/year|annual/i, 'yearly'],
];

/** "90 min monthly" / "30 minutes / week" → { minutes, period }. */
export function parseServiceText(text: string): { minutes: number; period: GoalPeriod } | undefined {
  const m = text.match(/(\d{1,4})\s{0,3}min/i);
  if (!m) return undefined;
  const minutes = Number(m[1]);
  for (const [re, period] of PERIOD_WORDS) {
    if (re.test(text)) return { minutes, period };
  }
  return { minutes, period: 'monthly' };
}

/**
 * Plan-information text like
 * "8/1/2025 - 8/1/2026 Occupational Therapy (Indirect | Outside) 20 minutes semesterly".
 * Dates are ignored; the parenthetical gives type and setting; minutes and
 * period close it out. Returns undefined when no service can be read.
 */
export function parsePlanInfo(text: string):
  | { type: 'direct' | 'indirect'; setting: 'inside' | 'outside'; minutes: number; period: GoalPeriod }
  | undefined {
  const service = parseServiceText(text);
  if (!service) return undefined;
  const m = text.match(/\(\s*(direct|indirect)\s*\|\s*(inside|outside)\s*\)/i);
  const type = m ? (m[1].toLowerCase() as 'direct' | 'indirect') : 'direct';
  const setting = m ? (m[2].toLowerCase() as 'inside' | 'outside') : 'outside';
  return { type, setting, minutes: service.minutes, period: service.period };
}

/**
 * Paste-a-caseload: one line per goal, "Case No." then the plan information.
 * Rows for the same student merge. Direct push-in rows are skipped (the app
 * schedules pull-out); indirect goals import whatever their setting says,
 * since they are never scheduled anyway.
 */
export function parseCaseloadText(text: string): CaseloadParse {
  const issues: CaseloadParse['issues'] = [];
  const byId = new Map<string, CaseloadStudent>();
  const lines = text.replace(/\r/g, '').split('\n');
  for (const [idx, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line) continue;
    if (/^case\b/i.test(line) || /plan information/i.test(line)) continue; // header
    const m = line.match(/^(\d+)[\t\s]+(.+)$/);
    if (!m) {
      issues.push({ message: `Line ${idx + 1}: no leading student number - skipped (names never import).` });
      continue;
    }
    const displayId = m[1];
    const plan = parsePlanInfo(m[2]);
    if (!plan) {
      issues.push({ message: `Line ${idx + 1} (Student ${displayId}): couldn't read the service minutes - skipped.` });
      continue;
    }
    if (plan.type === 'direct' && plan.setting === 'inside') {
      issues.push({ message: `Line ${idx + 1} (Student ${displayId}): direct push-in row skipped - only pull-out service is scheduled here.` });
      continue;
    }
    const existing = byId.get(displayId) ?? { displayId, gradeLevel: undefined, goals: [] };
    existing.goals.push({ minutes: plan.minutes, period: plan.period, type: plan.type });
    byId.set(displayId, existing);
  }
  if (byId.size === 0 && issues.length === 0) {
    issues.push({ message: 'Nothing recognized - each line needs a student number and its plan information.' });
  }
  return {
    students: [...byId.values()].sort((a, b) => Number(a.displayId) - Number(b.displayId)),
    issues,
  };
}

function gradeLevel(text: string): number | undefined {
  const t = text.trim();
  if (/^t?k$/i.test(t) || /kinder/i.test(t)) return 0;
  const m = t.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}

/**
 * Parse the first worksheet. Column meaning comes from the header row
 * (Case/Student, Grade, Service, Setting); with no Setting column every row
 * counts as pull-out.
 */
export function parseCaseloadWorkbook(sheet: SheetData): CaseloadParse {
  const issues: CaseloadParse['issues'] = [];
  const { cells } = sheet;

  let headerRow = -1;
  let caseCol = -1;
  let gradeCol = -1;
  let serviceCol = -1;
  let settingCol = -1;
  let planCol = -1;
  for (let r = 0; r < Math.min(cells.length, 10); r++) {
    const texts = (cells[r] ?? []).map((c) => c.text.trim().toLowerCase());
    const ci = texts.findIndex((t) => /case|student/.test(t));
    const gi = texts.findIndex((t) => /grade/.test(t));
    const si = texts.findIndex((t) => /service|minutes|mandate/.test(t));
    const pi = texts.findIndex((t) => /plan/.test(t));
    if (ci !== -1 && ((gi !== -1 && si !== -1) || pi !== -1)) {
      headerRow = r;
      caseCol = ci;
      gradeCol = gi;
      serviceCol = si;
      planCol = gi !== -1 && si !== -1 ? -1 : pi;
      settingCol = texts.findIndex((t) => /setting|location|type of service/.test(t));
      break;
    }
  }
  if (headerRow === -1) {
    return {
      students: [],
      issues: [
        {
          message:
            'No header row found (need "Case #" plus either Grade and Service columns, or a "Plan Information" column).',
        },
      ],
    };
  }
  if (planCol !== -1) {
    // Case No. | Plan Information layout: same rules as the paste path.
    const text = cells
      .slice(headerRow + 1)
      .map((row) => `${(row?.[caseCol]?.text ?? '').trim()}\t${(row?.[planCol]?.text ?? '').trim()}`)
      .filter((l) => l.trim())
      .join('\n');
    return parseCaseloadText(text);
  }

  const byId = new Map<string, CaseloadStudent>();
  for (let r = headerRow + 1; r < cells.length; r++) {
    const cell = (c: number) => (c === -1 ? '' : (cells[r]?.[c]?.text ?? '')).trim();
    const rawId = cell(caseCol);
    if (!rawId) continue;
    const idNum = rawId.match(/\d+/);
    if (!idNum) {
      issues.push({ message: `Row ${r + 1}: "${rawId}" is not a student number - skipped (names never import).` });
      continue;
    }
    const displayId = idNum[0];
    const service = parseServiceText(cell(serviceCol));
    if (!service) {
      issues.push({ message: `Row ${r + 1} (Student ${displayId}): couldn't read service "${cell(serviceCol)}" - skipped.` });
      continue;
    }
    // Push-in rows are skipped: the app schedules pull-out service only,
    // and importing them as extra goals would inflate the mandate.
    if (/inside|push[\s-]?in/i.test(cell(settingCol))) {
      issues.push({
        message: `Row ${r + 1} (Student ${displayId}): push-in row skipped - only pull-out service is scheduled here.`,
      });
      continue;
    }
    const level = gradeLevel(cell(gradeCol));
    if (cell(gradeCol) && level === undefined) {
      issues.push({ message: `Row ${r + 1} (Student ${displayId}): grade "${cell(gradeCol)}" not recognized.` });
    }
    const existing = byId.get(displayId) ?? { displayId, gradeLevel: level, goals: [] };
    existing.gradeLevel = existing.gradeLevel ?? level;
    existing.goals.push({ minutes: service.minutes, period: service.period });
    byId.set(displayId, existing);
  }

  return {
    students: [...byId.values()].sort((a, b) => Number(a.displayId) - Number(b.displayId)),
    issues,
  };
}

/** The ServiceGoal rows an imported student gets for the chosen provider. */
export function caseloadGoalsFor(providerId: string, s: CaseloadStudent): ServiceGoal[] {
  return s.goals.map((g) => ({
    providerId,
    type: g.type ?? ('direct' as const),
    minutes: g.minutes,
    period: g.period,
  }));
}
