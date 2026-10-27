import { convertPronouns } from "../model/splitter";
import { slugifyVariableName } from "../model/template";
import type { GridDef, GridGroup, GridLevel } from "./grids";
import { OPTION_LISTS, type OptionList } from "./options";
import type { PackAssessment, PackBlock, PackSection, TemplatePack } from "./pack";
import type { Block } from "./types";
import { runsText, type DocItem, type DocRun } from "./docx-read";

/**
 * Turn a report document into a draft template pack with plain rules, no AI:
 * headings become sections, known test names and rating tables become
 * assessments, instructions in red or italics become hints, highlighted or
 * bracketed text becomes blanks, and anything identifying is left out. The
 * writer corrects the draft on a review screen, then in Edit template.
 */

export interface DraftSection {
  id: string;
  title: string;
  /** Where the section goes. "part" joins it to the previous assessment. */
  role: "before" | "assessment" | "part" | "after" | "out";
  blocks: PackBlock[];
  examples: string[];
  notesHint?: string;
  grid?: GridDef;
}

export interface DraftNote {
  kind: "left-out" | "blank" | "list" | "grid" | "scores" | "hint" | "warn";
  text: string;
}

export interface Draft {
  sections: DraftSection[];
  lists: Record<string, OptionList>;
  notes: DraftNote[];
}

export interface ImportOptions {
  /** A finished report rather than a blank form: sentences keep their wording as samples and their details become blanks. */
  finishedReport?: boolean;
  /** The student's name as written in a finished report, so it can be replaced. Lives only in memory. */
  studentName?: string;
}

// ---------- recognising things ----------

const IDENTIFYING =
  /^(name|student(?:'s)? name|student|date of birth|d\.?o\.?b\.?|birth ?date|age|address|parent(?:s|\/guardian)?s?|guardian|telephone|phone|email|e-mail|school(?: of attendance| district)?|district|teacher|case manager|student id|id number|evaluation date|report date|date of (?:report|evaluation|testing)|dates? (?:of )?tested|examiner|evaluator|language|primary language|home language|interpreter|chronological age|grade)\s*:/i;

const KNOWN_TESTS =
  /\b(beery|vmi|spm-?2?|sensory processing measure|sensory profile|pdms|peabody|bot-?2|bruininks|m-?fun|miller function|pedi|school function assessment|sfa|etch|print tool|mvpt|tvps|ths-?r|test of handwriting|celf|gfta|goldman|pls-?5?|preschool language|ctopp|owls|casl|wisc|wais|wppsi|woodcock|wj-?iv|kabc|basc|vineland|conners|brief-?2?|abas|das-?ii|wiat|ktea|gort|ppvt|evt|eowpvt|rowpvt|dash-?3?|bayley|dayc|asq|clinical evaluation of language|comprehensive test of phonological|adaptive behavior|developmental test)\b/i;

const ASSESSMENT_WORDS = /\b(assessment|checklist|scale|scales|inventory|test|testing|measure|observation|observations|interview|screen|screening|profile|questionnaire|rating|results)\b/i;

const SCORE_HEADER = /\b(score|scores|percentile|%ile|rank|equivalen|range|raw|scaled|standard|t-?score|age|classification|interpret|descriptive|descriptor|cut ?off|sum)\b/i;

const STUDENT_WORDS = /\(\s*(?:blank|student|student name|name|child)\s*\)|\[\s*(?:student|student name|name|blank)\s*\]|\bXX+\b/gi;

const isRed = (r: DocRun) => !!r.color && /^(FF0000|C00000|FF3333|E00000|DD0000|CC0000|FF2222)$/.test(r.color);
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase()).replace(/\b(Of|And|The|In|For|Or|A|An|To)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
}

/** Is this paragraph a heading, and of which level? 1 = section, 2 = subheading. */
function headingLevel(item: Extract<DocItem, { kind: "para" }>, text: string): 0 | 1 | 2 {
  if (!text || item.list) return 0;
  if (item.heading !== undefined) return item.heading <= 2 ? 1 : 2;
  const words = wordCount(text);
  if (words > 10 || /[.!?]\s*$/.test(text)) return 0;
  const letters = text.replace(/[^A-Za-z]/g, "");
  const allCaps = letters.length >= 3 && letters === letters.toUpperCase();
  const bold = item.runs.length > 0 && item.runs.every((r) => r.bold || !r.text.trim());
  // A bold or capitalised line on its own is a section; with a trailing colon it labels what follows.
  if (allCaps || bold) return text.endsWith(":") ? 2 : 1;
  // "Recommendations:" on its own labels what follows even in plain type.
  if (text.endsWith(":") && words <= 6) return 2;
  return 0;
}

/** Instructions for the writer, not report wording: red, italic, or wholly in parentheses. */
function isInstruction(runs: DocRun[], text: string): boolean {
  const inked = runs.filter((r) => r.text.trim());
  if (!inked.length) return false;
  if (inked.every((r) => isRed(r))) return true;
  if (inked.every((r) => r.italic) && !inked.some((r) => r.bold)) return true;
  return /^\(.*\)$/.test(text) && !/\(\s*blank\s*\)/i.test(text);
}

// ---------- turning wording into template text ----------

interface Ctx {
  lists: Record<string, OptionList>;
  notes: DraftNote[];
  options: ImportOptions;
}

function blankOf(label: string): string {
  const l = clean(label.replace(/^[([]\s*|\s*[)\]]$/g, "")).replace(/[[\]{}]/g, "").replace(/\s*[:：]\s*$/, "");
  return `[[${l.toLowerCase()}]]`;
}

/** "telephone and/or email" or "Preschool/Child/Adolescent" highlighted → a dropdown blank with those choices. */
function choiceBlank(text: string, ctx: Ctx): string | null {
  const inner = clean(text.replace(/^\(?\s*pick one\s*[:→-]*\s*/i, "").replace(/[()]/g, ""));
  const parts = inner.split(/\s*(?:\/|\bor\b)\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 8 || parts.some((p) => wordCount(p) > 5)) return null;
  const base = slugifyVariableName(parts[0]).replace(/_+([a-z0-9])/g, (_m, c: string) => c.toUpperCase()) || "choice";
  let name = base;
  let n = 2;
  while (ctx.lists[name] && ctx.lists[name].options.join("|") !== parts.join("|")) name = `${base}${n++}`;
  ctx.lists[name] = { options: parts };
  ctx.notes.push({ kind: "list", text: `Dropdown “${name}”: ${parts.join(", ")}` });
  return `[[${parts.length === 2 ? parts.join(" or ") : "choose one"}::${name}]]`;
}

function runToTemplate(r: DocRun, ctx: Ctx): string {
  const t = r.text;
  if (!t.trim()) return t;
  // "(Blank)" is the student whatever colour it is written in.
  if (new RegExp(`^\\s*(?:${STUDENT_WORDS.source})\\s*$`, "i").test(t)) return t;
  if (r.highlight) {
    if (/\/|\bor\b/.test(t)) {
      const b = choiceBlank(t, ctx);
      if (b) return b;
    }
    if (/^\s*or\b/i.test(t) && wordCount(t) <= 2) return t;
    return ` ${blankOf(t)} `;
  }
  if (isRed(r)) {
    if (/^\s*name\s*$/i.test(t)) return " [[who completed it]] ";
    if (/^\s*\(?\s*insert (date|info[a-z]*)\s*\)?\s*$/i.test(t)) return " [[date]] ";
    return ` ${blankOf(t)} `;
  }
  return t;
}

/** Pronouns written both ways, placeholders and single-bracket blanks become template marks. */
export function toTemplateText(text: string, ctx?: Ctx): string {
  let t = text;
  t = t.replace(STUDENT_WORDS, "{{student}}");
  if (ctx?.options.studentName?.trim()) {
    const name = ctx.options.studentName.trim();
    const first = name.split(/\s+/)[0];
    for (const n of [name, first]) t = t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(['’]s)?\\b`, "g"), (_m, pos: string | undefined) => (pos ? "{{student}}'s" : "{{student}}"));
  }
  t = t
    .replace(/\b(he|she)\s*\/\s*(he|she)\b/gi, (m) => (/^[A-Z]/.test(m) ? "{{They}}" : "{{they}}"))
    .replace(/\b(his|her)\s*\/\s*(his|her)\b/gi, (m) => (/^[A-Z]/.test(m) ? "{{Their}}" : "{{their}}"))
    .replace(/\b(him|her)\s*\/\s*(him|her)\b/gi, (m) => (/^[A-Z]/.test(m) ? "{{Them}}" : "{{them}}"))
    .replace(/\b(himself|herself)\s*\/\s*(himself|herself)\b/gi, "{{themselves}}")
    .replace(/\bs\/he\b/gi, "{{they}}");
  // [performance description] → a blank; [[already a blank]] stays.
  t = t.replace(/(?<!\[)\[([^[\]]{1,80})\](?!\])/g, (_m, inner: string) => (/^(student|name)$/i.test(inner.trim()) ? "{{student}}" : `[[${clean(inner).toLowerCase()}]]`));
  // Dotted or underscored gaps are blanks.
  t = t.replace(/(?:\.{3,}|…+|_{3,})/g, " [[fill in]] ");
  // (INSERT DATE) and (add parent concerns) are blanks even when not red.
  t = t.replace(/\(\s*(insert|add|list|describe|include|specify)\b([^)]*)\)/gi, (_m, verb: string, rest: string) => blankOf(`${verb} ${rest}`));
  t = convertPronouns(t).text;
  return clean(t).replace(/\s+([,.;:])/g, "$1");
}

function paraToTemplate(runs: DocRun[], ctx: Ctx): string {
  return toTemplateText(runs.map((r) => runToTemplate(r, ctx)).join(""), ctx);
}

/** In a finished report, scores, ages and dates become blanks; the sentence is kept as a sample. */
function blankDetails(text: string): string {
  return text
    .replace(/\b\d{1,3}(?:st|nd|rd|th)\s+percentile\b/gi, "[[percentile]] percentile")
    .replace(/\bpercentile(?: rank)?\s+(?:of\s+)?\d{1,3}\b/gi, "percentile of [[percentile]]")
    .replace(/\b(standard|scaled|raw|t-?|composite|index)\s+score\s+(?:of\s+)?\d{1,3}\b/gi, "$1 score of [[$1 score]]")
    .replace(/\b\d{1,2}\s+years?(?:,?\s+(?:and\s+)?\d{1,2}\s+months?)?\s+old\b/gi, "[[age]]")
    .replace(/\b\d{1,2}\s+years?,?\s+\d{1,2}\s+months?\b/gi, "[[age]]")
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g, "[[date]]")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[[date]]")
    .replace(/\b(\d{1,3})\s?%/g, "[[percent]]%");
}

// ---------- building the draft ----------

export function draftFromItems(items: DocItem[], options: ImportOptions = {}): Draft {
  const ctx: Ctx = { lists: {}, notes: [], options };
  const sections: DraftSection[] = [];
  let n = 0;
  const section = (title: string): DraftSection => {
    const s: DraftSection = { id: `section${++n}`, title, role: "after", blocks: [], examples: [] };
    sections.push(s);
    return s;
  };
  let cur: DraftSection | null = null;
  let subheading: string | null = null;
  const leftOut = new Set<string>();
  const ensure = () => cur ?? (cur = section("Introduction"));
  const nextId = (s: DraftSection, prefix: string) => `${prefix}${s.blocks.length + 1}`;

  const addPara = (item: Extract<DocItem, { kind: "para" }>, text: string) => {
    const s = ensure();
    let label: string | undefined;
    let body = text;
    const labelled = /^([A-Z][^.:!?]{1,50}):\s+(.+)$/.exec(text);
    if (labelled && wordCount(labelled[1]) <= 6) {
      label = clean(labelled[1]);
      body = labelled[2];
    }
    const tmpl = paraToTemplate(item.runs.length ? reRun(item.runs, body) : [{ text: body }], ctx);
    if (!tmpl.replace(/\[\[.*?\]\]/g, "").trim() && !tmpl.includes("[[")) return;
    const block = { kind: item.list ? "bullet" : "para", id: nextId(s, "p"), text: tmpl, ...(label ? { label } : {}) } as Block;
    if (options.finishedReport && !tmpl.includes("[[")) {
      const sample = toTemplateText(body, ctx).replace(/\{\{student\}\}/g, "[STUDENT]");
      block.text = blankDetails(tmpl);
      if (block.text !== tmpl) block.examples = [fillPlain(sample)];
    }
    s.blocks.push(block);
  };

  for (const item of items) {
    if (item.kind === "table") {
      addTable(item.rows, ensure, () => cur, subheading, ctx, leftOut, (title) => section(title));
      continue;
    }
    const text = clean(runsText(item.runs));
    if (!text) continue;
    if (/^☐/.test(text) || /^\s*☐/.test(runsText(item.runs))) {
      // Checkbox lines list choices on a form; keep them as bullets to trim later.
      const s = ensure();
      s.blocks.push({ kind: "bullet", id: nextId(s, "p"), text: toTemplateText(text.replace(/☐\s*/g, ""), ctx) });
      continue;
    }
    const idm = IDENTIFYING.exec(text);
    if (idm && wordCount(text) <= 12) {
      leftOut.add(titleCase(idm[1]));
      continue;
    }
    const level = headingLevel(item, text);
    if (level === 1) {
      const title = titleCase(clean(text.replace(/:\s*$/, "")));
      cur = section(title);
      subheading = null;
      continue;
    }
    if (level === 2) {
      const s = ensure();
      subheading = clean(text.replace(/:\s*$/, ""));
      s.blocks.push({ kind: "subheading", id: nextId(s, "h"), text: subheading });
      continue;
    }
    if (isInstruction(item.runs, text)) {
      const s = ensure();
      const hint = clean(text.replace(/^\(|\)$/g, ""));
      if (!s.notesHint) s.notesHint = hint;
      else if ((s.notesHint + hint).length < 240) s.notesHint = `${s.notesHint}; ${hint}`;
      continue;
    }
    addPara(item, text);
  }

  // Roles: a section is an assessment when it has a grid or names a test; the rest go before the first assessment or after the last.
  let seen = false;
  for (const s of sections) {
    const named = KNOWN_TESTS.test(s.title) || (ASSESSMENT_WORDS.test(s.title) && !/summary|conclusion|recommendation|impact|goal|service|background|referral|history|validity/i.test(s.title));
    if (s.grid || named) {
      s.role = "assessment";
      seen = true;
    } else s.role = seen ? "part" : "before";
    if (!s.blocks.length && !s.grid) s.role = "out";
  }
  // Trailing non-assessment sections come after the assessments.
  for (let i = sections.length - 1; i >= 0 && sections[i].role !== "assessment"; i--) if (sections[i].role === "part") sections[i].role = "after";
  if (!seen) for (const s of sections) if (s.role === "before") s.role = "after";

  ctx.notes.unshift(...[...leftOut].map((l): DraftNote => ({ kind: "left-out", text: l })));
  return { sections, lists: ctx.lists, notes: ctx.notes };
}

/** Keep each run's formatting but swap the text for the part of it that remains. */
function reRun(runs: DocRun[], body: string): DocRun[] {
  const full = runsText(runs);
  const at = full.indexOf(body);
  if (at < 0) return [{ text: body }];
  let pos = 0;
  const out: DocRun[] = [];
  for (const r of runs) {
    const start = pos;
    const end = pos + r.text.length;
    pos = end;
    const a = Math.max(start, at);
    const b = Math.min(end, at + body.length);
    if (a < b) out.push({ ...r, text: r.text.slice(a - start, b - start) });
  }
  return out;
}

function fillPlain(s: string): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_m, w: string) => ({ they: "he", They: "He", them: "him", Them: "Him", their: "his", Their: "His", theirs: "his", themselves: "himself", student: "[STUDENT]" })[w] ?? w);
}

function cellText(cell: DocRun[] | undefined): string {
  return clean(runsText(cell ?? []));
}

function addTable(
  rows: DocRun[][][],
  ensure: () => DraftSection,
  current: () => DraftSection | null,
  subheading: string | null,
  ctx: Ctx,
  leftOut: Set<string>,
  newSection: (title: string) => DraftSection,
): void {
  if (!rows.length) return;
  const width = Math.max(...rows.map((r) => r.length));
  // A one-column table is just boxed paragraphs; a "Label: value" form table is identifying details.
  if (width <= 1 || rows.every((r) => r.length <= 2 && IDENTIFYING.test(cellText(r[0]) + ":"))) {
    for (const r of rows)
      for (const cell of r) {
        const text = cellText(cell);
        if (!text) continue;
        const idm = IDENTIFYING.exec(text.includes(":") ? text : `${text}:`);
        if (idm && wordCount(text) <= 12) {
          leftOut.add(titleCase(idm[1]));
          continue;
        }
        for (const line of runsText(cell).split("\n")) {
          const t = clean(line);
          if (!t) continue;
          const s = ensure();
          if (isInstruction(cell, t)) {
            if (!s.notesHint) s.notesHint = t.replace(/^\(|\)$/g, "");
            continue;
          }
          const labelled = /^([A-Z][^.:!?]{1,50}):\s*(.*)$/.exec(t);
          if (labelled && wordCount(labelled[1]) <= 6 && !labelled[2].trim()) {
            s.blocks.push({ kind: "subheading", id: `h${s.blocks.length + 1}`, text: clean(labelled[1]) });
            continue;
          }
          s.blocks.push({ kind: "para", id: `p${s.blocks.length + 1}`, text: paraToTemplate(reRun(cell, t), ctx) });
        }
      }
    return;
  }
  const header = rows[0].map(cellText);
  const dataRows = rows.slice(1);
  const scoreLike = header.slice(1).some((h) => SCORE_HEADER.test(h));
  const s = ensure();
  if (scoreLike) {
    // Score table: one labelled line per row, a blank per column.
    const cols = header.slice(1).filter(Boolean);
    let count = 0;
    for (const r of dataRows) {
      const item = cellText(r[0]);
      if (!item) continue;
      if (r.length === 1 || r.slice(1).every((c) => !cellText(c)) && r[0].some((run) => run.bold) && dataRows.some((x) => x.length > 1 && cellText(x[0]) && !x[0].some((run) => run.bold))) {
        s.blocks.push({ kind: "subheading", id: `h${s.blocks.length + 1}`, text: item });
        continue;
      }
      s.blocks.push({ kind: "para", id: `p${s.blocks.length + 1}`, label: item, text: `${cols.map((c) => `${c}: ${blankOf(c)}`).join(". ")}.` });
      count++;
    }
    if (count) ctx.notes.push({ kind: "scores", text: `${s.title}: a line per row for ${count} rows with blanks for ${cols.join(", ")}` });
    if (!s.grid && count) s.role = "assessment";
    return;
  }
  // Rating table: the other columns are the levels, the rows are the items, merged or bold rows start a group.
  const levels: GridLevel[] = header.slice(1).filter(Boolean).map((h, i) => ({ value: `l${i + 1}`, label: h, sentence: "{items}", ...(i > 0 && !/typical|functional|average|independent|expected|adequate|within|yes|met\b|pass/i.test(h) ? { concern: true } : {}) }));
  if (levels.length < 2) {
    for (const r of rows) for (const cell of r) {
      const t = cellText(cell);
      if (t) s.blocks.push({ kind: "para", id: `p${s.blocks.length + 1}`, text: paraToTemplate(cell, ctx) });
    }
    return;
  }
  const groups: GridGroup[] = [];
  let group: GridGroup | null = null;
  const groupId = () => `g${groups.length + 1}`;
  for (const r of dataRows) {
    const first = cellText(r[0]);
    if (!first) continue;
    const isGroupRow = r.length === 1 || (r.slice(1).every((c) => !cellText(c)) && r[0].some((run) => run.bold));
    if (isGroupRow) {
      group = { id: groupId(), label: first.replace(/:$/, ""), rows: [] };
      groups.push(group);
      continue;
    }
    if (!group) {
      group = { id: groupId(), label: subheading ?? s.title, rows: [] };
      groups.push(group);
    }
    const label = first.replace(/\s*\n\s*/g, " ").replace(/^☐\s*/, "").replace(/:$/, "");
    group.rows.push({ id: `r${group.rows.length + 1}`, label: label.charAt(0).toLowerCase() + label.slice(1) });
  }
  const nonEmpty = groups.filter((g) => g.rows.length);
  if (!nonEmpty.length) return;
  const sameLevels = (g: GridDef) => g.levels.map((l) => l.label).join("|") === levels.map((l) => l.label).join("|");
  if (s.grid && sameLevels(s.grid)) {
    // Another table with the same columns adds its rows as more groups of the same grid.
    const base = s.grid.groups.length;
    s.grid.groups.push(...nonEmpty.map((g, i) => ({ ...g, id: `g${base + i + 1}` })));
  } else if (s.grid) {
    const t = newSection(subheading ?? `${s.title} (continued)`);
    t.grid = makeGrid(t.id, levels, nonEmpty);
    t.blocks.push({ kind: "grid", id: "grid", grid: t.grid.id });
    ctx.notes.push({ kind: "grid", text: `${t.title}: a rating table with ${levels.length} levels` });
    return;
  } else {
    s.grid = makeGrid(s.id, levels, nonEmpty);
    s.blocks.push({ kind: "grid", id: "grid", grid: s.grid.id });
    ctx.notes.push({ kind: "grid", text: `${s.title}: a rating table with ${levels.length} levels and ${nonEmpty.reduce((a, g) => a + g.rows.length, 0)} items` });
  }
  void current;
}

function makeGrid(id: string, levels: GridLevel[], groups: GridGroup[]): GridDef {
  return {
    id: `grid-${id}`,
    title: "Rate each item",
    layout: "byLevel",
    levels,
    groups,
    blank: "[[items at this level, or none]]",
    none: "None",
    allClear: "within the expected range across all areas",
  };
}

// ---------- the pack ----------

export function packFromDraft(draft: Draft, disciplineLabel: string): TemplatePack {
  const assessments: PackAssessment[] = [];
  const sections: PackSection[] = [];
  const toSection = (s: DraftSection, place?: "before" | "after"): PackSection => ({
    id: s.id,
    title: s.title,
    blocks: s.blocks,
    examples: s.examples,
    ...(s.notesHint ? { notesHint: s.notesHint } : {}),
    ...(place ? { place } : {}),
  });
  for (const s of draft.sections) {
    if (s.role === "out") continue;
    if (s.role === "assessment") assessments.push({ id: `a-${s.id}`, label: s.title, sections: [toSection(s)], ...(s.grid ? { grid: s.grid } : {}) });
    else if (s.role === "part" && assessments.length) {
      const a = assessments[assessments.length - 1];
      a.sections.push(toSection(s));
      if (s.grid && !a.grid) a.grid = s.grid;
    } else sections.push(toSection(s, s.role === "before" ? "before" : "after"));
  }
  const lists: Record<string, OptionList> = { ...Object.fromEntries(Object.entries(OPTION_LISTS).map(([k, v]) => [k, { ...v, options: [...v.options] }])), ...draft.lists };
  return {
    version: 1,
    titles: { evaluation: `${disciplineLabel} Evaluation Report`, annual: `${disciplineLabel} Annual Review` },
    assessments,
    sections,
    lists,
  };
}
