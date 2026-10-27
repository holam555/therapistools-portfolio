import type { DisciplineId } from "../model/disciplines";
import { convertPronouns } from "../model/splitter";
import { fillPronouns, blockKeyOf } from "./render";
import { OPTION_LISTS, type OptionList } from "./options";
import { normalizeGrid, sameGrid, type GridDef } from "./grids";
import { SPM_GRID } from "./spm";
import type { GradeGroup, ReportSection, ScreenItem } from "./types";

/**
 * A writer's own changes to the built-in template, kept in their browser and
 * laid over the template whenever a report is built. The built-in template is
 * never changed, so "Reset to original" always works.
 */

export interface BlockOverride {
  text?: string;
  label?: string;
  examples?: string[];
  hidden?: boolean;
}

export interface TemplateOverrides {
  version: 1;
  /** Keyed "sectionId/blockKey". */
  blocks: Record<string, BlockOverride>;
  /** Sample sentences for a whole section, keyed by section id. */
  sectionExamples: Record<string, string[]>;
  /** Replacement choices for a dropdown list, keyed by list name. */
  lists: Record<string, string[]>;
  /** Fine motor screen: built-in items hidden, and items the writer added, per grade group. */
  screen: Partial<Record<GradeGroup, { hidden: string[]; added: ScreenItem[] }>>;
  /** A rating grid's items, levels and sentences as the writer changed them, keyed by grid id. */
  grids: Record<string, GridDef>;
  /** Section titles the writer changed, keyed by section id. */
  titles: Record<string, string>;
}

/** The built-in rating grids, by id. */
export const BUILT_IN_GRIDS: Record<string, GridDef> = { spm2: SPM_GRID };

export function emptyOverrides(): TemplateOverrides {
  return { version: 1, blocks: {}, sectionExamples: {}, lists: {}, screen: {}, grids: {}, titles: {} };
}

export function hasOverrides(o: TemplateOverrides): boolean {
  return (
    Object.keys(o.blocks).length +
      Object.keys(o.sectionExamples).length +
      Object.keys(o.lists).length +
      Object.keys(o.screen).length +
      Object.keys(o.grids).length +
      Object.keys(o.titles).length >
    0
  );
}

const KEY = (d: DisciplineId) => (d === "ot" ? "easyiep.template" : `easyiep.template.${d}`);

export function normalizeOverrides(raw: unknown): TemplateOverrides {
  const o = emptyOverrides();
  if (!raw || typeof raw !== "object") return o;
  const r = raw as Partial<TemplateOverrides>;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined);
  if (r.blocks && typeof r.blocks === "object")
    for (const [k, v] of Object.entries(r.blocks)) {
      if (!v || typeof v !== "object") continue;
      const b: BlockOverride = {};
      if (typeof v.text === "string") b.text = v.text;
      if (typeof v.label === "string") b.label = v.label;
      const ex = strs(v.examples);
      if (ex) b.examples = ex;
      if (v.hidden === true) b.hidden = true;
      if (Object.keys(b).length) o.blocks[k] = b;
    }
  if (r.sectionExamples && typeof r.sectionExamples === "object")
    for (const [k, v] of Object.entries(r.sectionExamples)) {
      const ex = strs(v);
      if (ex) o.sectionExamples[k] = ex;
    }
  if (r.lists && typeof r.lists === "object")
    for (const [k, v] of Object.entries(r.lists)) {
      const opts = strs(v);
      if (opts && OPTION_LISTS[k]) o.lists[k] = opts;
    }
  if (r.screen && typeof r.screen === "object")
    for (const [g, v] of Object.entries(r.screen)) {
      if (!v || typeof v !== "object") continue;
      const hidden = strs((v as { hidden?: unknown }).hidden) ?? [];
      const addedRaw = Array.isArray((v as { added?: unknown }).added) ? ((v as { added: unknown[] }).added) : [];
      const added = addedRaw.filter(
        (i): i is ScreenItem =>
          !!i && typeof i === "object" && typeof (i as ScreenItem).id === "string" && typeof (i as ScreenItem).label === "string" && typeof (i as ScreenItem).opener === "string",
      ).map((i) => ({ ...i, group: (["classroom", "supporting", "paragraph"] as const).includes(i.group) ? i.group : "classroom", examples: strs(i.examples) ?? [] }));
      o.screen[g as GradeGroup] = { hidden, added };
    }
  if (r.grids && typeof r.grids === "object")
    for (const [id, v] of Object.entries(r.grids)) {
      const base = BUILT_IN_GRIDS[id];
      if (!base) continue;
      const g = normalizeGrid(v, base);
      if (g && !sameGrid(g, base)) o.grids[id] = g;
    }
  if (r.titles && typeof r.titles === "object")
    for (const [id, v] of Object.entries(r.titles)) if (typeof v === "string" && v.trim()) o.titles[id] = v.trim();
  return o;
}

export function loadOverrides(d: DisciplineId): TemplateOverrides {
  try {
    return normalizeOverrides(JSON.parse(localStorage.getItem(KEY(d)) ?? "null"));
  } catch {
    return emptyOverrides();
  }
}

export function saveOverrides(d: DisciplineId, o: TemplateOverrides): void {
  try {
    if (hasOverrides(o)) localStorage.setItem(KEY(d), JSON.stringify(o));
    else localStorage.removeItem(KEY(d));
  } catch {
    /* storage unavailable */
  }
}

/** Choices for a dropdown list, with the writer's own version if they edited it. */
export function listFor(name: string, o?: TemplateOverrides): OptionList | undefined {
  const base = OPTION_LISTS[name];
  if (!base) return undefined;
  const own = o?.lists[name];
  return own ? { ...base, options: own } : base;
}

/** A rating grid, with the writer's own items, levels and sentences if they edited it. */
export function gridFor(id: string, o?: TemplateOverrides): GridDef {
  return o?.grids[id] ?? BUILT_IN_GRIDS[id];
}

/** The fine motor screen items for a grade: built-ins minus hidden ones, plus the writer's own. */
export function applyScreenOverrides(items: ScreenItem[], grade: GradeGroup, o?: TemplateOverrides): ScreenItem[] {
  const s = o?.screen[grade];
  if (!s) return items;
  return [...items.filter((i) => !s.hidden.includes(i.id)), ...s.added];
}

/** Lay block edits over built sections: wording, labels, sample sentences, hidden paragraphs, and section titles. */
export function applyBlockOverrides(sections: ReportSection[], o?: TemplateOverrides): ReportSection[] {
  if (!o) return sections;
  return sections.map((s) => {
    const title = o.titles[s.id];
    if (title) s = { ...s, title };
    const blocks = s.blocks.flatMap((b, i) => {
      const ov = o.blocks[`${s.id}/${blockKeyOf(b, i)}`];
      if (!ov) return [b];
      if (ov.hidden) return [];
      return [
        {
          ...b,
          ...(ov.text !== undefined ? { text: ov.text } : {}),
          ...(ov.label !== undefined && "label" in b ? { label: ov.label } : {}),
          ...(ov.examples !== undefined ? { examples: ov.examples } : {}),
        },
      ];
    });
    const ex = o.sectionExamples[s.id];
    return { ...s, blocks, ...(ex ? { examples: ex } : {}) };
  });
}

// ---------- editing as plain text ----------

/**
 * Template text shown for editing: pronouns written as he/him/his and the
 * student as [STUDENT], so it reads like a normal report.
 */
export function toEditable(templateText: string): string {
  return fillPronouns(templateText, "he");
}

/**
 * Back from editable text to template text: he/him/his become pronoun marks so
 * the sentence still switches to she/her, and [STUDENT] becomes the student mark.
 */
export function fromEditable(text: string): string {
  return convertPronouns(text.replace(/\[STUDENT\]/g, "{{student}}")).text;
}
