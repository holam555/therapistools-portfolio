import { joinList } from "./options";

/**
 * A rating grid: the items an assessment rates (in groups) and the levels each
 * item can get. Report text is written from the ratings with one sentence
 * pattern per level, so a writer can change items, levels and wording in the
 * tool when a built-in grid doesn't match their form.
 *
 * Sentence patterns use:
 *   {items}   the rated items, joined "a, b, and c"
 *   {Items}   the same, capitalised (for a sentence start)
 *   {was}     "was" for one item, "were" for several or a plural item
 */

export interface GridLevel {
  /** Stored with the rating; never shown. */
  value: string;
  /** Shown in the dropdown and, for by-level grids, as the line's label. */
  label: string;
  /** How items at this level are written. By-level grids use "{items}" alone. */
  sentence: string;
  /** Counts as a concern in a summary phrase (by-level grids). */
  concern?: boolean;
}

export interface GridRow {
  id: string;
  label: string;
  /** A name like "buttons" that takes "were" on its own. */
  plural?: boolean;
  /** Left out of lists of the grid's items (a composite like "Sensory Total"). */
  composite?: boolean;
}

export interface GridGroup {
  id: string;
  label: string;
  rows: GridRow[];
}

export interface GridDef {
  id: string;
  /** Shown on the setup panel, e.g. "Rate each task". */
  title: string;
  /**
   * byGroup: one paragraph per group, a sentence per level (a self-care checklist).
   * byLevel: one line per level listing every item at that level (SPM-2).
   */
  layout: "byGroup" | "byLevel";
  levels: GridLevel[];
  groups: GridGroup[];
  /** Blank shown while a group (byGroup) or the grid (byLevel) is unrated. */
  blank: string;
  /** byLevel: a level with nothing in it is written as this. */
  none?: string;
  /** byLevel: summary phrase when no item is at a concern level. */
  allClear?: string;
}

export type GridRatings = Record<string, string>;

export const ratingKey = (groupId: string, rowId: string) => `${groupId}.${rowId}`;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rows at a level within one group, in form order. */
function rowsAt(group: GridGroup, level: string, ratings: GridRatings): GridRow[] {
  return group.rows.filter((r) => ratings[ratingKey(group.id, r.id)] === level);
}

function fillPattern(pattern: string, rows: GridRow[]): string {
  const items = joinList(rows.map((r) => r.label));
  const were = rows.length !== 1 || rows[0].plural ? "were" : "was";
  return pattern.replace(/\{items\}/g, items).replace(/\{Items\}/g, capitalize(items)).replace(/\{was\}/g, were);
}

/** All rows of the grid, with their group. */
export function gridRows(def: GridDef): { group: GridGroup; row: GridRow }[] {
  return def.groups.flatMap((group) => group.rows.map((row) => ({ group, row })));
}

/** Labels of the grid's items, leaving out composites. */
export function gridItemLabels(def: GridDef): string[] {
  return gridRows(def).filter(({ row }) => !row.composite).map(({ row }) => row.label);
}

/** True once every row has a rating. */
export function gridComplete(def: GridDef, ratings: GridRatings): boolean {
  return gridRows(def).every(({ group, row }) => !!ratings[ratingKey(group.id, row.id)]);
}

/** How many rows have a rating. */
export function gridRatedCount(def: GridDef, ratings: GridRatings): number {
  return gridRows(def).filter(({ group, row }) => !!ratings[ratingKey(group.id, row.id)]).length;
}

/**
 * byGroup: the paragraph for one group, a sentence per level in level order.
 * Null when nothing in the group is rated yet.
 */
export function groupSentences(def: GridDef, group: GridGroup, ratings: GridRatings): string | null {
  const parts: string[] = [];
  for (const level of def.levels) {
    const rows = rowsAt(group, level.value, ratings);
    if (rows.length && level.sentence.trim()) parts.push(fillPattern(level.sentence, rows));
  }
  return parts.length ? parts.join(" ") : null;
}

/** byLevel: the items at a level across every group, in form order. */
export function itemsAtLevel(def: GridDef, level: string, ratings: GridRatings): GridRow[] {
  return def.groups.flatMap((g) => rowsAt(g, level, ratings));
}

/** byLevel: the text of one level's line, or null until the grid is complete. */
export function levelLine(def: GridDef, level: GridLevel, ratings: GridRatings): string | null {
  if (!gridComplete(def, ratings)) return null;
  const rows = itemsAtLevel(def, level.value, ratings);
  if (!rows.length) return def.none ?? "None";
  return fillPattern(level.sentence || "{items}", rows);
}

/**
 * byLevel: a summary phrase such as "affected with Severe Difficulties for
 * Vision and Touch and Moderate Difficulties for Planning and Ideas", listing
 * concern levels from the worst down. Null until the grid is complete.
 */
export function gridSummaryPhrase(def: GridDef, ratings: GridRatings): string | null {
  if (!gridComplete(def, ratings)) return null;
  const parts: string[] = [];
  for (const level of [...def.levels].reverse()) {
    if (!level.concern) continue;
    const rows = itemsAtLevel(def, level.value, ratings);
    if (rows.length) parts.push(`${level.label} for ${joinList(rows.map((r) => r.label))}`);
  }
  if (!parts.length) return def.allClear ?? null;
  return `affected with ${parts.join(" and ")}`;
}

// ---------- editing ----------

/** Ids for rows, groups and levels a writer adds: short, unique within the grid. */
export function newGridId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** A plain object copy, so edits never touch the built-in definition. */
export function cloneGrid(def: GridDef): GridDef {
  return JSON.parse(JSON.stringify(def)) as GridDef;
}

/** Read a grid from stored data, dropping anything malformed. Null when it isn't usable. */
export function normalizeGrid(raw: unknown, base: GridDef): GridDef | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GridDef>;
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  const levels: GridLevel[] = Array.isArray(r.levels)
    ? r.levels
        .filter((l): l is GridLevel => !!l && typeof l === "object" && typeof (l as GridLevel).value === "string" && (l as GridLevel).value.trim() !== "")
        .map((l) => ({ value: l.value, label: str(l.label, l.value), sentence: str(l.sentence), ...(l.concern === true ? { concern: true } : {}) }))
    : [];
  const groups: GridGroup[] = Array.isArray(r.groups)
    ? r.groups
        .filter((g): g is GridGroup => !!g && typeof g === "object" && typeof (g as GridGroup).id === "string" && Array.isArray((g as GridGroup).rows))
        .map((g) => ({
          id: g.id,
          label: str(g.label),
          rows: g.rows
            .filter((row): row is GridRow => !!row && typeof row === "object" && typeof (row as GridRow).id === "string")
            .map((row) => ({ id: row.id, label: str(row.label), ...(row.plural === true ? { plural: true } : {}), ...(row.composite === true ? { composite: true } : {}) })),
        }))
    : [];
  if (!levels.length || !groups.length) return null;
  return {
    id: base.id,
    layout: base.layout,
    title: str(r.title, base.title),
    levels,
    groups,
    blank: str(r.blank, base.blank),
    ...(typeof r.none === "string" ? { none: r.none } : base.none !== undefined ? { none: base.none } : {}),
    ...(typeof r.allClear === "string" ? { allClear: r.allClear } : base.allClear !== undefined ? { allClear: base.allClear } : {}),
  };
}

/** JSON with object keys in a fixed order, so two grids compare by content, not by how they were built. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

export function sameGrid(a: GridDef, b: GridDef): boolean {
  return canonical(a) === canonical(b);
}
