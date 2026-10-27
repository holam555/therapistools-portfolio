import type { DisciplineId } from "../model/disciplines";
import type { GradeGroup, ReportSetup } from "./types";
import { GRADE_GROUPS } from "./types";
import { screenItemsFor } from "./ot-screen";
import { applyScreenOverrides, type TemplateOverrides } from "./overrides";
import { spmKey } from "./spm";

/** A sensible starting point: every assessment ticked, every screen item for the grade ticked. */
export function defaultSetup(grade: GradeGroup = "g25"): ReportSetup {
  return {
    reportType: "evaluation",
    concerns: true,
    grade,
    pronoun: "he",
    assessments: { teacher: true, screen: true, beery: true, spm2: true },
    teacherConcerns: true,
    screenItems: screenItemsFor(grade).map((i) => i.id),
    objectives: 3,
    goalAreas: ["writing", "cutting"],
    ratings: {},
  };
}

/** Changing grade swaps the screen items for that grade (including the writer's own), all ticked. */
export function withGrade(setup: ReportSetup, grade: GradeGroup, o?: TemplateOverrides): ReportSetup {
  return { ...setup, grade, screenItems: applyScreenOverrides(screenItemsFor(grade), grade, o).map((i) => i.id) };
}

/**
 * Values filled before blocks had permanent ids were stored by position
 * ("teacher/0/0"). Move them to the block's id ("teacher/teacher-concerns/0").
 */
export function migrateValueKeys(values: Record<string, string>, sections: { id: string; blocks: { id?: string }[] }[]): Record<string, string> {
  let changed = false;
  const out = { ...values };
  for (const s of sections)
    s.blocks.forEach((b, i) => {
      if (!b.id) return;
      const oldPrefix = `${s.id}/${i}/`;
      for (const k of Object.keys(values))
        if (k.startsWith(oldPrefix)) {
          const nk = `${s.id}/${b.id}/${k.slice(oldPrefix.length)}`;
          if (!(nk in out)) out[nk] = values[k];
          delete out[k];
          changed = true;
        }
    });
  return changed ? out : values;
}

/** SPM-2 results were once keyed by scale name alone; grids key every rating "group.row". */
export function migrateSpmKeys(spm: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(spm).map(([k, v]) => [k.includes(".") ? k : spmKey(k), v]));
}

const KEY = (d: DisciplineId) => (d === "ot" ? "easyiep.report" : `easyiep.report.${d}`);
const VALUES_KEY = (d: DisciplineId) => (d === "ot" ? "easyiep.reportValues" : `easyiep.reportValues.${d}`);

export function loadValues(d: DisciplineId): Record<string, string> {
  try {
    const p = JSON.parse(localStorage.getItem(VALUES_KEY(d)) ?? "{}");
    if (!p || typeof p !== "object") return {};
    return Object.fromEntries(Object.entries(p).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveValues(d: DisciplineId, v: Record<string, string>): void {
  try {
    localStorage.setItem(VALUES_KEY(d), JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export function loadSetup(d: DisciplineId): ReportSetup {
  try {
    const raw = localStorage.getItem(KEY(d));
    if (!raw) return defaultSetup();
    // Older setups kept SPM-2 ratings in their own field.
    const { spm, ...p } = JSON.parse(raw) as Partial<ReportSetup> & { spm?: Record<string, string> };
    const base = defaultSetup(GRADE_GROUPS.some((g) => g.id === p.grade) ? (p.grade as GradeGroup) : "g25");
    const ratings: ReportSetup["ratings"] = {};
    if (p.ratings && typeof p.ratings === "object") for (const [k, v] of Object.entries(p.ratings)) if (v && typeof v === "object") ratings[k] = v;
    if (spm && typeof spm === "object" && !ratings.spm2) ratings.spm2 = migrateSpmKeys(spm);
    return {
      ...base,
      ...p,
      assessments: { ...base.assessments, ...(p.assessments ?? {}) },
      screenItems: Array.isArray(p.screenItems) ? p.screenItems.filter((x): x is string => typeof x === "string") : base.screenItems,
      goalAreas: Array.isArray(p.goalAreas) ? p.goalAreas : base.goalAreas,
      objectives: typeof p.objectives === "number" && p.objectives > 0 && p.objectives < 10 ? p.objectives : base.objectives,
      ratings,
    };
  } catch {
    return defaultSetup();
  }
}

export function saveSetup(d: DisciplineId, s: ReportSetup): void {
  try {
    localStorage.setItem(KEY(d), JSON.stringify(s));
  } catch {
    /* storage unavailable: the setup just won't be remembered */
  }
}
