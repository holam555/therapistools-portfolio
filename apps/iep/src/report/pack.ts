import type { DisciplineId } from "../model/disciplines";
import { announceTemplateChange } from "../account/events";

import { gridSummaryPhrase, groupSentences, levelLine, normalizeGrid, type GridDef, type GridRatings } from "./grids";
import { OPTION_LISTS, type OptionList } from "./options";
import { fillPattern } from "./render";
import { CONCERN_AREAS, GOAL_AREAS, GRADE_GROUPS, TEACHER_AREAS, type Block, type ConcernArea, type ConcernIn, type GoalArea, type GradeGroup, type ReportSection, type ReportSetup, type ReportType, type ServiceType, type TeacherArea, type TeacherAreas } from "./types";

/**
 * A template pack: one discipline's report template as plain data, built and
 * edited inside the tool and kept in the writer's browser. Every discipline
 * uses one, started from the ready-made sample (premade/), blank, or built
 * from the writer's own document. Packs hold template wording only, never a
 * student.
 */

/** When a section or paragraph appears. Every field left out means "always". */
export interface PackCondition {
  reportType?: ReportType;
  concerns?: boolean;
  /** Areas a concern was found in (true) or not (false): motor, sensory. With no concerns at all, every area counts as not. */
  concernIn?: Partial<ConcernIn>;
  grades?: GradeGroup[];
  /** Direct or indirect services, as chosen in setup. */
  serviceType?: ServiceType;
  /** Teacher checklist areas that must be ticked (true) or not ticked (false). */
  teacherAreas?: Partial<TeacherAreas>;
  /** Whether at least one teacher checklist area is ticked. */
  anyTeacherArea?: boolean;
  /** A related standard the writer chose under the goal. */
  goalArea?: GoalArea;
  /** Assessments that must be on (true) or off (false), by id. */
  assessments?: Record<string, boolean>;
}

/** What a pack paragraph can carry besides its text. */
export interface PackBlockExtras {
  /** Shown only while the condition holds. */
  when?: PackCondition;
  /** A tick box under its assessment ("What did you do?"): shown only when ticked (setup.screenItems holds the ids). */
  optional?: boolean;
  /** Written once per objective chosen in setup, ids numbered from 1. */
  repeat?: "objectives";
}

/** A paragraph written from a rating grid's ratings: one line per group (byGroup) or per level (byLevel). */
export interface GridBlock {
  kind: "grid";
  id: string;
  grid: string;
}
export type PackBlock = (Block & PackBlockExtras) | GridBlock;

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
  if (when.concernIn) for (const [k, v] of Object.entries(when.concernIn)) if ((setup.concerns && setup.concernIn[k as ConcernArea]) !== v) return false;
  if (when.grades && !when.grades.includes(setup.grade)) return false;
  if (when.serviceType !== undefined && when.serviceType !== setup.serviceType) return false;
  if (when.teacherAreas) for (const [k, v] of Object.entries(when.teacherAreas)) if (setup.teacherAreas[k as TeacherArea] !== v) return false;
  if (when.anyTeacherArea !== undefined && (setup.teacherAreas.fine || setup.teacherAreas.gross || setup.teacherAreas.sensory) !== when.anyTeacherArea) return false;
  if (when.goalArea !== undefined && !setup.goalAreas.includes(when.goalArea)) return false;
  if (when.assessments) for (const [k, v] of Object.entries(when.assessments)) if (assessmentOn(setup, k) !== v) return false;
  return true;
}

/** A condition in words, for badges in edit mode: "annual review only · sensory ticked". Empty when there is none. */
export function describeCondition(when: PackCondition | undefined, pack?: Pick<TemplatePack, "assessments">): string {
  if (!when) return "";
  const parts: string[] = [];
  if (when.reportType) parts.push(when.reportType === "evaluation" ? "evaluation only" : "annual review only");
  if (when.concerns !== undefined) parts.push(when.concerns ? "concerns found / qualifies" : "no concerns / does not qualify");
  if (when.concernIn)
    for (const [k, v] of Object.entries(when.concernIn)) {
      const label = (CONCERN_AREAS.find((a) => a.id === k)?.label ?? k).toLowerCase();
      parts.push(v ? `${label} concern` : `no ${label} concern`);
    }
  if (when.grades) parts.push(`grades ${when.grades.map((g) => GRADE_GROUPS.find((x) => x.id === g)?.label ?? g).join(", ")}`);
  if (when.serviceType) parts.push(`${when.serviceType} services`);
  if (when.teacherAreas)
    for (const [k, v] of Object.entries(when.teacherAreas)) parts.push(`${(TEACHER_AREAS.find((t) => t.id === k)?.label ?? k).toLowerCase()} ${v ? "ticked" : "not ticked"}`);
  if (when.anyTeacherArea !== undefined) parts.push(when.anyTeacherArea ? "at least one teacher area ticked" : "no teacher area ticked");
  if (when.goalArea) parts.push(`${(GOAL_AREAS.find((g) => g.id === when.goalArea)?.label ?? when.goalArea).toLowerCase()} standard chosen`);
  if (when.assessments)
    for (const [k, v] of Object.entries(when.assessments)) parts.push(`${pack?.assessments.find((a) => a.id === k)?.label ?? k} ${v ? "done" : "not done"}`);
  return parts.join(" · ");
}

/** Marks in a paragraph the app writes in: {count} (objectives chosen) and {summary:<grid id>} (that grid's summary phrase). */
function packSlots(text: string, grids: Record<string, GridDef>, setup: ReportSetup): Record<string, string> | undefined {
  const slots: Record<string, string> = {};
  if (text.includes("{count}")) slots.count = String(Math.max(1, setup.objectives));
  for (const m of text.matchAll(/\{summary:([A-Za-z0-9_-]+)\}/g)) {
    const g = grids[m[1]];
    slots[`summary:${m[1]}`] = (g && gridSummaryPhrase(g, setup.ratings[g.id] ?? {})) || "[[results by scale]]";
  }
  return Object.keys(slots).length ? slots : undefined;
}

/** Every paragraph that is a tick box under an assessment, with the assessment it belongs to. */
export function optionalBlocks(pack: TemplatePack): { assessment: PackAssessment; section: PackSection; block: Block & PackBlockExtras }[] {
  const out: { assessment: PackAssessment; section: PackSection; block: Block & PackBlockExtras }[] = [];
  for (const assessment of pack.assessments)
    for (const section of assessment.sections) for (const block of section.blocks) if (block.kind !== "grid" && block.optional) out.push({ assessment, section, block });
  return out;
}

/** Which setup choices this pack reacts to, so the builder shows only the controls that matter. */
export function packUses(pack: TemplatePack): { teacherAreas: Set<string>; serviceType: boolean; objectives: boolean; goalAreas: GoalArea[]; concernIn: boolean } {
  const teacherAreas = new Set<string>();
  let serviceType = false;
  let concernIn = false;
  let objectives = false;
  const goalAreas: GoalArea[] = [];
  const note = (when: PackCondition | undefined, assessmentId?: string) => {
    if (!when) return;
    if ((when.teacherAreas || when.anyTeacherArea !== undefined) && assessmentId) teacherAreas.add(assessmentId);
    if (when.serviceType !== undefined) serviceType = true;
    if (when.concernIn) concernIn = true;
    if (when.goalArea !== undefined && !goalAreas.includes(when.goalArea)) goalAreas.push(when.goalArea);
  };
  const walk = (sections: PackSection[], assessmentId?: string) => {
    for (const s of sections) {
      note(s.when, assessmentId);
      for (const b of s.blocks) {
        if (b.kind === "grid") continue;
        note(b.when, assessmentId);
        if (b.repeat === "objectives" || b.text.includes("{count}")) objectives = true;
      }
    }
  };
  for (const a of pack.assessments) walk(a.sections, a.id);
  walk(pack.sections);
  return { teacherAreas, serviceType, objectives, goalAreas, concernIn };
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

function toSection(s: PackSection, grids: Record<string, GridDef>, setup: ReportSetup, pack: TemplatePack, showHidden: boolean): ReportSection {
  const blocks: Block[] = [];
  // A subheading whose paragraphs were all left out (unticked, or hidden by a condition) is left out too.
  let heading: { at: number; lost: boolean; kept: number } | null = null;
  const closeHeading = () => {
    if (heading?.lost && heading.kept === 0) {
      if (showHidden) blocks[heading.at] = { ...blocks[heading.at], hidden: true, hiddenWhy: blocks[heading.at].hiddenWhy ?? "nothing under it is shown" };
      else blocks.splice(heading.at, 1);
    }
    heading = null;
  };
  for (const b of s.blocks) {
    if (b.kind === "grid") {
      blocks.push(...expandGrid(b, grids, setup));
      continue;
    }
    const { when, optional, repeat, ...plain } = b;
    const unticked = !!optional && !setup.screenItems.includes(plain.id ?? "");
    const shown = conditionHolds(when, setup) && !unticked;
    const why = shown ? undefined : unticked ? "unticked under “What did you do?”" : describeCondition(when, pack);
    const hide = (block: Block): Block => (shown ? block : { ...block, hidden: true, hiddenWhy: why });
    if (plain.kind === "subheading" || plain.kind === "heading") {
      closeHeading();
      if (!shown && !showHidden) continue;
      heading = { at: blocks.length, lost: false, kept: 0 };
      blocks.push(hide(plain));
      continue;
    }
    if (!shown) {
      if (heading) heading.lost = true;
      if (!showHidden) continue;
    } else if (heading) heading.kept++;
    const slots = packSlots(plain.text, grids, setup);
    const make = (id: string | undefined, sourceId?: string): Block =>
      hide({ ...plain, id, ...(sourceId ? { sourceId } : {}), ...(slots ? { generated: true, pattern: plain.text, slots, text: fillPattern(plain.text, slots) } : {}) } as Block);
    if (repeat === "objectives" && shown) for (let i = 1; i <= Math.max(1, setup.objectives); i++) blocks.push(make(`${plain.id}${i}`, plain.id));
    else blocks.push(make(repeat === "objectives" ? `${plain.id}1` : plain.id, repeat === "objectives" ? plain.id : undefined));
  }
  closeHeading();
  // A section with no samples of its own borrows its paragraphs'.
  const examples = s.examples.length ? s.examples : blocks.flatMap((b) => b.examples ?? []);
  return { id: s.id, title: s.title, blocks, examples, ...(s.notesHint ? { notesHint: s.notesHint } : {}) };
}

/** Is this assessment ticked? Unknown ones count as ticked, so a new assessment shows up at once. */
export const assessmentOn = (setup: ReportSetup, id: string) => setup.assessments[id] !== false;

/**
 * The sections of a report built from a pack, for this setup. With
 * `showHidden`, paragraphs a condition or an unticked tick box leaves out are
 * kept and marked `hidden` (with the reason), so edit mode can show every
 * paragraph of the template; sections left out stay left out.
 */
export function packSections(pack: TemplatePack, setup: ReportSetup, opts: { showHidden?: boolean } = {}): ReportSection[] {
  const grids = packGrids(pack);
  const around = (place: "before" | "after") => pack.sections.filter((s) => (s.place ?? "after") === place && conditionHolds(s.when, setup));
  const middle = pack.assessments.filter((a) => assessmentOn(setup, a.id)).flatMap((a) => a.sections.filter((s) => conditionHolds(s.when, setup)));
  return [...around("before"), ...middle, ...around("after")].map((s) => toSection(s, grids, setup, pack, !!opts.showHidden));
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
  if (r.concernIn && typeof r.concernIn === "object") {
    const areas: Partial<ConcernIn> = {};
    for (const k of ["motor", "sensory"] as const) if (typeof r.concernIn[k] === "boolean") areas[k] = r.concernIn[k];
    if (Object.keys(areas).length) out.concernIn = areas;
  }
  if (Array.isArray(r.grades)) {
    const grades = r.grades.filter((g): g is GradeGroup => GRADE_GROUPS.some((x) => x.id === g));
    if (grades.length) out.grades = grades;
  }
  if (r.serviceType === "direct" || r.serviceType === "indirect") out.serviceType = r.serviceType;
  if (r.teacherAreas && typeof r.teacherAreas === "object") {
    const areas: Partial<TeacherAreas> = {};
    for (const k of ["fine", "gross", "sensory"] as const) if (typeof r.teacherAreas[k] === "boolean") areas[k] = r.teacherAreas[k];
    if (Object.keys(areas).length) out.teacherAreas = areas;
  }
  if (typeof r.anyTeacherArea === "boolean") out.anyTeacherArea = r.anyTeacherArea;
  if (r.goalArea === "writing" || r.goalArea === "cutting" || r.goalArea === "selfcare") out.goalArea = r.goalArea;
  if (r.assessments && typeof r.assessments === "object") {
    const on: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(r.assessments)) if (typeof v === "boolean") on[k] = v;
    if (Object.keys(on).length) out.assessments = on;
  }
  return Object.keys(out).length ? out : undefined;
}

const KINDS = ["heading", "subheading", "para", "bullet", "numbered"] as const;

function normalizeBlock(raw: unknown, i: number): PackBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { kind?: string; id?: string; grid?: string; text?: string; label?: string; examples?: unknown; when?: unknown; optional?: unknown; repeat?: unknown };
  const id = str(r.id, `b${i + 1}`);
  if (r.kind === "grid") return typeof r.grid === "string" ? { kind: "grid", id, grid: r.grid } : null;
  if (!KINDS.includes(r.kind as (typeof KINDS)[number]) || typeof r.text !== "string") return null;
  const b: Block & PackBlockExtras = { kind: r.kind as Block["kind"], id, text: r.text } as Block;
  if (typeof r.label === "string" && (b.kind === "para" || b.kind === "bullet")) (b as { label?: string }).label = r.label;
  if (Array.isArray(r.examples)) b.examples = strs(r.examples);
  const when = normalizeCondition(r.when);
  if (when) b.when = when;
  if (r.optional === true) b.optional = true;
  if (r.repeat === "objectives") b.repeat = "objectives";
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
  announceTemplateChange({ discipline: d, kind: "pack" });
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

/**
 * A copy of an assessment with ids that do not clash with anything in the
 * pack: the assessment, its grid (and every reference to it) and its sections
 * get a numbered id where the plain one is taken.
 */
export function withFreshIds(pack: TemplatePack, a: PackAssessment): PackAssessment {
  // Assessments, grids and sections each have their own namespace (the sample packs use "teacher" for all three).
  const assessments = new Set(pack.assessments.map((x) => x.id));
  const grids = new Set(Object.keys(packGrids(pack)));
  const sections = new Set([...pack.sections, ...pack.assessments.flatMap((x) => x.sections)].map((s) => s.id));
  const fresh = (taken: Set<string>, id: string) => {
    let next = id;
    for (let n = 2; taken.has(next); n++) next = `${id}-${n}`;
    taken.add(next);
    return next;
  };
  const copy = JSON.parse(JSON.stringify(a)) as PackAssessment;
  copy.id = fresh(assessments, copy.id);
  const oldGrid = copy.grid?.id;
  const newGrid = oldGrid === undefined ? undefined : fresh(grids, oldGrid);
  if (copy.grid && newGrid !== undefined) copy.grid.id = newGrid;
  copy.sections = copy.sections.map((s) => ({
    ...s,
    id: fresh(sections, s.id),
    blocks: s.blocks.map((b) => {
      if (oldGrid === undefined || newGrid === undefined || oldGrid === newGrid) return b;
      if (b.kind === "grid") return b.grid === oldGrid ? { ...b, grid: newGrid } : b;
      return { ...b, text: b.text.split(`{summary:${oldGrid}}`).join(`{summary:${newGrid}}`) };
    }),
  }));
  return copy;
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
