import type { PronounSet } from "../model/types";
import { renderText } from "../model/template";
import type { Block, ReportSection, ReportValues } from "./types";
import { parseBlank } from "./options";

/** Where a blank lives and what it offers. */
export interface BlankInfo {
  /** "section/block/n": the key its value is stored under. */
  key: string;
  label: string;
  list?: string;
  /** The template puts a period right after this blank. */
  periodAfter: boolean;
  sectionId: string;
  blockKey: string;
}

/** A run of text: plain, an empty blank (highlighted in Word), or a blank the writer filled. */
export type Run = { text: string; blank?: BlankInfo; filled?: BlankInfo };

/** Fill pronouns and the student placeholder. {{student}} becomes [STUDENT]. */
export function fillPronouns(text: string, pronoun: PronounSet): string {
  return renderText(text, { pronounSet: pronoun, values: {} }).text;
}

export const blockKeyOf = (b: Block, index: number) => b.id ?? String(index);

/** Split filled text into runs, swapping in any values the writer chose. */
export function toRuns(filled: string, sectionId: string, blockKey: string, values: ReportValues = {}): Run[] {
  const runs: Run[] = [];
  let pos = 0;
  let n = 0;
  for (const m of filled.matchAll(/\[\[(.+?)\]\]/g)) {
    if (m.index > pos) runs.push({ text: filled.slice(pos, m.index) });
    const { label, list } = parseBlank(m[1]);
    const end = m.index + m[0].length;
    const info: BlankInfo = { key: `${sectionId}/${blockKey}/${n++}`, label, list, periodAfter: filled.charAt(end) === ".", sectionId, blockKey };
    const v = values[info.key];
    runs.push(v && v.trim() ? { text: v.trim(), filled: info } : { text: `[[${label}]]`, blank: info });
    pos = end;
  }
  if (pos < filled.length) runs.push({ text: filled.slice(pos) });
  return runs;
}

export interface RenderedBlock {
  kind: Block["kind"];
  key: string;
  label?: string;
  runs: Run[];
  plain: string;
  examples?: string[];
}

export function renderBlock(b: Block, index: number, sectionId: string, pronoun: PronounSet, values: ReportValues = {}): RenderedBlock {
  const key = blockKeyOf(b, index);
  const runs = toRuns(fillPronouns(b.text, pronoun), sectionId, key, values);
  return { kind: b.kind, key, label: "label" in b ? b.label : undefined, runs, plain: runs.map((r) => r.text).join(""), examples: b.examples };
}

export function renderSection(s: ReportSection, pronoun: PronounSet, values: ReportValues = {}): RenderedBlock[] {
  return s.blocks.map((b, i) => renderBlock(b, i, s.id, pronoun, values));
}

/** Plain text of a section as it appears in the Word draft (used in prompts). */
export function sectionText(s: ReportSection, pronoun: PronounSet, values: ReportValues = {}): string {
  const lines = [s.title.toUpperCase()];
  let n = 0;
  for (const r of renderSection(s, pronoun, values)) {
    const label = r.label ? `${r.label}${r.kind === "bullet" ? " – " : ": "}` : "";
    if (r.kind === "subheading" || r.kind === "heading") lines.push("", r.plain);
    else if (r.kind === "bullet") lines.push(`- ${label}${r.plain}`);
    else if (r.kind === "numbered") lines.push(`${++n}. ${r.plain}`);
    else lines.push("", `${label}${r.plain}`);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Blanks still empty in a section. */
export function blanksIn(s: ReportSection, pronoun: PronounSet, values: ReportValues = {}): string[] {
  const out: string[] = [];
  for (const r of renderSection(s, pronoun, values)) for (const run of r.runs) if (run.blank && !out.includes(run.text)) out.push(run.text);
  return out;
}
