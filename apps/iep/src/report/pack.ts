import type { DisciplineId } from "../model/disciplines";
import { SPM_GRID } from "./spm";
import { cloneGrid, groupSentences, levelLine, normalizeGrid, type GridDef, type GridRatings } from "./grids";
import { OPTION_LISTS, type OptionList } from "./options";
import { otReportSections } from "./ot-pack";
import { SCREEN_BORROWED } from "./ot-screen";
import { defaultSetup, withGrade } from "./setup";
import { GRADE_GROUPS, type Block, type GradeGroup, type ReportSection, type ReportSetup, type ReportType } from "./types";

/**
 * A template pack: one discipline's report template as plain data, built and
 * edited inside the tool and kept in the writer's browser. Occupational
 * therapy's template is code (ot-pack.ts); every other discipline uses a pack,
 * started blank, copied from the OT template, or (later) built from the
 * writer's own document. Packs hold template wording only, never a student.
 */

/** When a section appears. Every field left out means "always". */
export interface PackCondition {
  reportType?: ReportType;
  concerns?: boolean;
  grades?: GradeGroup[];
}

/** A paragraph written from a rating grid's ratings: one line per group (byGroup) or per level (byLevel). */
export interface GridBlock {
  kind: "grid";
  id: string;
  grid: string;
}
export type PackBlock = Block | GridBlock;

export interface PackSection {
  id: string;
  title: string;
  blocks: PackBlock[];
  examples: string[];
  notesHint?: string;
  when?: PackCondition;
  /** Sections outside assessments go before or after them. */
  place?: "before" | "after";
}

export interface PackAssessment {
  id: string;
  /** Shown on the "What did you do?" list. */
  label: string;
  sections: PackSection[];
  grid?: GridDef;
}

export interface TemplatePack {
  version: 1;
  titles: Record<ReportType, string>;
  assessments: PackAssessment[];
  /** Sections around the assessments; `place` and `when` say where and when. */
  sections: PackSection[];
  /** Dropdown lists for [[label::list]] blanks. */
  lists: Record<string, OptionList>;
}

// ---------- building a report from a pack ----------

export function conditionHolds(when: PackCondition | undefined, setup: ReportSetup): boolean {
  if (!when) return true;
  if (when.reportType !== undefined && when.reportType !== setup.reportType) return false;
  if (when.concerns !== undefined && when.concerns !== setup.concerns) return false;
  if (when.grades && !when.grades.includes(setup.grade)) return false;
  return true;
}

/** Every rating grid in the pack, by id. */
export function packGrids(pack: TemplatePack): Record<string, GridDef> {
  const out: Record<string, GridDef> = {};
  for (const a of pack.assessments) if (a.grid) out[a.grid.id] = a.grid;
  return out;
}

function expandGrid(b: GridBlock, grids: Record<string, GridDef>, setup: ReportSetup): Block[] {
  const grid = grids[b.grid];
  if (!grid) return [];
  const ratings = setup.ratings[grid.id] ?? {};
  if (grid.layout === "byLevel")
    return grid.levels.map((level) => ({ kind: "para", id: `${b.id}-${level.value}`, generated: true, grid: grid.id, label: level.label, text: levelLineOf(grid, level.value, ratings) }));
  return grid.groups.map((g) => ({ kind: "para", id: `${b.id}-${g.id}`, generated: true, grid: grid.id, label: g.label, text: groupTextOf(grid, g.id, ratings) }));
}

function groupTextOf(grid: GridDef, groupId: string, ratings: GridRatings): string {
  const g = grid.groups.find((x) => x.id === groupId)!;
  return groupSentences(grid, g, ratings) ?? grid.blank;
}
function levelLineOf(grid: GridDef, value: string, ratings: GridRatings): string {
  const l = grid.levels.find((x) => x.value === value)!;
  return levelLine(grid, l, ratings) ?? grid.blank;
}

function toSection(s: PackSection, grids: Record<string, GridDef>, setup: ReportSetup): ReportSection {
  const blocks = s.blocks.flatMap((b) => (b.kind === "grid" ? expandGrid(b, grids, setup) : [b]));
  return { id: s.id, title: s.title, blocks, examples: s.examples, ...(s.notesHint ? { notesHint: s.notesHint } : {}) };
}

/** Is this assessment ticked? Unknown ones count as ticked, so a new assessment shows up at once. */
export const assessmentOn = (setup: ReportSetup, id: string) => setup.assessments[id] !== false;

/** The sections of a report built from a pack, for this setup. */
export function packSections(pack: TemplatePack, setup: ReportSetup): ReportSection[] {
  const grids = packGrids(pack);
  const around = (place: "before" | "after") => pack.sections.filter((s) => (s.place ?? "after") === place && conditionHolds(s.when, setup));
  const middle = pack.assessments.filter((a) => assessmentOn(setup, a.id)).flatMap((a) => a.sections.filter((s) => conditionHolds(s.when, setup)));
  return [...around("before"), ...middle, ...around("after")].map((s) => toSection(s, grids, setup));
}

// ---------- starting points ----------

export function blankPack(disciplineLabel: string): TemplatePack {
  return {
    version: 1,
    titles: { evaluation: `${disciplineLabel} Evaluation Report`, annual: `${disciplineLabel} Annual Review` },
    assessments: [],
    sections: [
      { id: "summary", title: "Summary", place: "after", examples: [], notesHint: "The main findings, in a few lines.", blocks: [{ kind: "para", id: "summary", text: "[[Summary of the findings and how they affect the student at school]]" }] },
    ],
    lists: copyLists(),
  };
}

function copyLists(): Record<string, OptionList> {
  return Object.fromEntries(Object.entries(OPTION_LISTS).map(([k, v]) => [k, { ...v, options: [...v.options] }]));
}

/** Generated lines of one grid, in a row, become a single grid block; other generated lines become plain paragraphs. */
function packBlocksOf(blocks: Block[]): PackBlock[] {
  const out: PackBlock[] = [];
  for (const b of blocks) {
    // OT writes its SPM-2 lines with ids "spm-<level>"; the summary's sensory line stays a paragraph.
    if (b.generated && b.grid && /^spm-/.test(b.id ?? "")) {
      const last = out[out.length - 1];
      if (last?.kind === "grid" && last.grid === b.grid) continue;
      out.push({ kind: "grid", id: `grid-${b.grid}`, grid: b.grid });
      continue;
    }
    const { generated: _g, grid: _grid, ...rest } = b;
    out.push(rest as Block);
  }
  return out;
}

function copySection(s: ReportSection, extra: Partial<PackSection> = {}): PackSection {
  return { id: s.id, title: s.title, blocks: packBlocksOf(s.blocks), examples: [...s.examples], ...(s.notesHint ? { notesHint: s.notesHint } : {}), ...extra };
}

/**
 * The built-in OT template as a pack, for another discipline to start from.
 * What the OT code decides from setup becomes conditions: the teacher
 * checklist's two wordings follow "concerns", the fine motor screen has one
 * section per grade group with every item, and the goal lists three
 * objectives and every standard, to hide what isn't needed.
 */
export function packFromOt(disciplineLabel: string): TemplatePack {
  const base = defaultSetup();
  const build = (p: Partial<ReportSetup>) => otReportSections({ ...base, ...p });
  const pick = (sections: ReportSection[], id: string) => sections.find((s) => s.id === id)!;

  const evalWith = build({ reportType: "evaluation", concerns: true, teacherConcerns: true });
  const evalWithout = build({ reportType: "evaluation", concerns: false, teacherConcerns: false });
  const annualWith = build({ reportType: "annual", concerns: true, objectives: 3, goalAreas: ["writing", "cutting", "selfcare"] });
  const annualWithout = build({ reportType: "annual", concerns: false });

  const screenSections: PackSection[] = [];
  for (const g of GRADE_GROUPS) {
    if (SCREEN_BORROWED[g.id]) continue;
    const grades = [g.id, ...GRADE_GROUPS.filter((x) => SCREEN_BORROWED[x.id] === g.id).map((x) => x.id)];
    const s = pick(otReportSections(withGrade(base, g.id)), "screen");
    screenSections.push(copySection(s, { id: `screen-${g.id}`, when: { grades } }));
  }

  const assessments: PackAssessment[] = [
    { id: "teacher", label: "Teacher rating checklist", sections: [copySection(pick(evalWith, "teacher"), { id: "teacher-concerns", when: { concerns: true } }), copySection(pick(evalWithout, "teacher"), { id: "teacher-none", when: { concerns: false } })] },
    { id: "screen", label: "Informal fine motor screen", sections: screenSections },
    { id: "beery", label: "Beery VMI", sections: [copySection(pick(evalWith, "beery"))] },
    { id: "spm2", label: "SPM-2 School form", sections: [copySection(pick(evalWith, "spm2"))], grid: cloneGrid(SPM_GRID) },
  ];

  const sections: PackSection[] = [
    copySection(pick(evalWith, "summary"), { id: "summary-concerns", place: "after", when: { reportType: "evaluation", concerns: true } }),
    copySection(pick(evalWithout, "summary"), { id: "summary-none", place: "after", when: { reportType: "evaluation", concerns: false } }),
    copySection(pick(annualWith, "plop-header"), { place: "before", when: { reportType: "annual" } }),
    ...["next-steps", "impact", "service", "goal"].map((id) => copySection(pick(annualWith, id), { place: "after", when: { reportType: "annual", concerns: true } })),
    copySection(pick(annualWithout, "ending"), { place: "after", when: { reportType: "annual", concerns: false } }),
  ];

  return {
    version: 1,
    titles: { evaluation: `${disciplineLabel} Evaluation Report`, annual: `${disciplineLabel} Annual Review` },
    assessments,
    sections,
    lists: copyLists(),
  };
}

// ---------- storage ----------

const KEY = (d: DisciplineId) => `easyiep.pack.${d}`;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function normalizeCondition(raw: unknown): PackCondition | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as PackCondition;
  const out: PackCondition = {};
  if (r.reportType === "evaluation" || r.reportType === "annual") out.reportType = r.reportType;
  if (typeof r.concerns === "boolean") out.concerns = r.concerns;
  if (Array.isArray(r.grades)) {
    const grades = r.grades.filter((g): g is GradeGroup => GRADE_GROUPS.some((x) => x.id === g));
    if (grades.length) out.grades = grades;
  }
  return Object.keys(out).length ? out : undefined;
}

const KINDS = ["heading", "subheading", "para", "bullet", "numbered"] as const;

function normalizeBlock(raw: unknown, i: number): PackBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { kind?: string; id?: string; grid?: string; text?: string; label?: string; examples?: unknown };
  const id = str(r.id, `b${i + 1}`);
  if (r.kind === "grid") return typeof r.grid === "string" ? { kind: "grid", id, grid: r.grid } : null;
  if (!KINDS.includes(r.kind as (typeof KINDS)[number]) || typeof r.text !== "string") return null;
  const b: Block = { kind: r.kind as Block["kind"], id, text: r.text } as Block;
  if (typeof r.label === "string" && (b.kind === "para" || b.kind === "bullet")) (b as { label?: string }).label = r.label;
  if (Array.isArray(r.examples)) b.examples = strs(r.examples);
  return b;
}

function normalizeSection(raw: unknown, i: number): PackSection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PackSection>;
  const blocks = Array.isArray(r.blocks) ? r.blocks.map(normalizeBlock).filter((b): b is PackBlock => !!b) : [];
  const s: PackSection = { id: str(r.id, `s${i + 1}`), title: str(r.title, "Untitled"), blocks, examples: strs(r.examples) };
  if (typeof r.notesHint === "string" && r.notesHint.trim()) s.notesHint = r.notesHint;
  const when = normalizeCondition(r.when);
  if (when) s.when = when;
  if (r.place === "before" || r.place === "after") s.place = r.place;
  return s;
}

/** Read a pack from stored data, dropping anything malformed. Null when it isn't a pack. */
export function normalizePack(raw: unknown): TemplatePack | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<TemplatePack>;
  if (r.version !== 1 || !r.titles || typeof r.titles !== "object") return null;
  const assessments: PackAssessment[] = [];
  if (Array.isArray(r.assessments))
    r.assessments.forEach((a, i) => {
      if (!a || typeof a !== "object") return;
      const ar = a as Partial<PackAssessment>;
      const id = str(ar.id, `a${i + 1}`);
      const sections = Array.isArray(ar.sections) ? ar.sections.map(normalizeSection).filter((s): s is PackSection => !!s) : [];
      const out: PackAssessment = { id, label: str(ar.label, "Assessment"), sections };
      if (ar.grid && typeof ar.grid === "object") {
        const gr = ar.grid as Partial<GridDef>;
        const layout = gr.layout === "byLevel" ? "byLevel" : "byGroup";
        const base: GridDef = { id: str(gr.id, id), title: "Rate each item", layout, levels: [], groups: [], blank: "[[ratings]]", ...(layout === "byLevel" ? { none: "None" } : {}) };
        const g = normalizeGrid(ar.grid, base);
        if (g) out.grid = g;
      }
      assessments.push(out);
    });
  const sections = Array.isArray(r.sections) ? r.sections.map(normalizeSection).filter((s): s is PackSection => !!s) : [];
  const lists: Record<string, OptionList> = {};
  if (r.lists && typeof r.lists === "object")
    for (const [k, v] of Object.entries(r.lists)) {
      if (!v || typeof v !== "object") continue;
      const options = strs((v as OptionList).options);
      if (options.length) lists[k] = { options, ...((v as OptionList).multi ? { multi: true } : {}) };
    }
  return {
    version: 1,
    titles: { evaluation: str(r.titles.evaluation, "Evaluation Report"), annual: str(r.titles.annual, "Annual Review") },
    assessments,
    sections,
    lists,
  };
}

export function loadPack(d: DisciplineId): TemplatePack | null {
  try {
    return normalizePack(JSON.parse(localStorage.getItem(KEY(d)) ?? "null"));
  } catch {
    return null;
  }
}

export function savePack(d: DisciplineId, pack: TemplatePack | null): void {
  try {
    if (pack) localStorage.setItem(KEY(d), JSON.stringify(pack));
    else localStorage.removeItem(KEY(d));
  } catch {
    /* storage unavailable */
  }
}

// ---------- editing ----------

/** A short id not used by anything in the pack. */
export function newPackId(pack: TemplatePack, prefix: string): string {
  const taken = new Set<string>();
  const addSection = (s: PackSection) => {
    taken.add(s.id);
    for (const b of s.blocks) taken.add(b.id ?? "");
  };
  for (const s of pack.sections) addSection(s);
  for (const a of pack.assessments) {
    taken.add(a.id);
    if (a.grid) taken.add(a.grid.id);
    for (const s of a.sections) addSection(s);
  }
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Where a section lives: on its own, or inside an assessment. */
export function findSection(pack: TemplatePack, sectionId: string): { section: PackSection; assessment?: PackAssessment } | null {
  const own = pack.sections.find((s) => s.id === sectionId);
  if (own) return { section: own };
  for (const a of pack.assessments) {
    const s = a.sections.find((x) => x.id === sectionId);
    if (s) return { section: s, assessment: a };
  }
  return null;
}

/** A copy of the pack with one section replaced (or removed when `next` is null). */
export function updateSection(pack: TemplatePack, sectionId: string, fn: (s: PackSection) => PackSection | null): TemplatePack {
  const map = (list: PackSection[]) =>
    list.flatMap((s) => {
      if (s.id !== sectionId) return [s];
      const next = fn(s);
      return next ? [next] : [];
    });
  return { ...pack, sections: map(pack.sections), assessments: pack.assessments.map((a) => ({ ...a, sections: map(a.sections) })) };
}

export function updateBlock(pack: TemplatePack, sectionId: string, blockId: string, fn: (b: PackBlock) => PackBlock | null): TemplatePack {
  return updateSection(pack, sectionId, (s) => ({
    ...s,
    blocks: s.blocks.flatMap((b) => {
      if (b.id !== blockId) return [b];
      const next = fn(b);
      return next ? [next] : [];
    }),
  }));
}

export function moveInList<T extends { id: string }>(list: T[], id: string, delta: number): T[] {
  const i = list.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
