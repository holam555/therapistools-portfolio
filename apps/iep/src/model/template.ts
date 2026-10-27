import type { PronounSet } from "./types";

/**
 * Template tokens look like {{name}}. Two kinds exist:
 *  - reserved tokens: {{student}} and the pronoun tokens, filled by the tool;
 *  - variables: anything else, filled by the user (presets or free text).
 */

export const STUDENT_TOKEN = "student";
export const STUDENT_PLACEHOLDER = "[STUDENT]";

type PronounSlot = "they" | "them" | "their" | "theirs" | "themselves";

const PRONOUNS: Record<PronounSet, Record<PronounSlot, string>> = {
  he: { they: "he", them: "him", their: "his", theirs: "his", themselves: "himself" },
  she: { they: "she", them: "her", their: "her", theirs: "hers", themselves: "herself" },
};

/** Alternate spellings accepted inside braces, mapped to the canonical slot. */
const PRONOUN_ALIASES: Record<string, PronounSlot> = {
  they: "they",
  he: "they",
  she: "they",
  them: "them",
  him: "them",
  her: "them", // {{her}} is treated as the object form; use {{their}} for possessive
  their: "their",
  his: "their",
  theirs: "theirs",
  hers: "theirs",
  themselves: "themselves",
  himself: "themselves",
  herself: "themselves",
};

export const RESERVED_TOKENS: readonly string[] = [STUDENT_TOKEN, ...Object.keys(PRONOUN_ALIASES)];

export interface Token {
  /** Name exactly as written (may be capitalised). */
  raw: string;
  /** Lower-cased name. */
  name: string;
  start: number;
  end: number;
}

const TOKEN_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

export function parseTokens(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    out.push({ raw: m[1], name: m[1].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function isReservedToken(name: string): boolean {
  return RESERVED_TOKENS.includes(name.toLowerCase());
}

/** Unique, ordered list of user-variable names used in a text. */
export function variableNames(text: string): string[] {
  const seen = new Set<string>();
  for (const t of parseTokens(text)) if (!isReservedToken(t.name)) seen.add(t.name);
  return [...seen];
}

export function isValidVariableName(name: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(name) && !isReservedToken(name);
}

/** Turn arbitrary text ("Goal date!") into a usable variable name ("goal_date"). */
export function slugifyVariableName(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "v$&");
  return s || "value";
}

function matchCase(raw: string, word: string): string {
  return /^[A-Z]/.test(raw) ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

export interface RenderContext {
  pronounSet: PronounSet;
  values: Record<string, string>;
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "auto"; text: string }
  | { kind: "filled"; text: string; name: string; key: string }
  | { kind: "missing"; name: string; key: string };

/** One fill-in occurrence inside a sentence. The same blank used twice gets two slots. */
export interface Slot {
  name: string;
  /** Unique within the sentence: "accuracy#0", "accuracy#1"… Values are stored under this key. */
  key: string;
  index: number;
}

export function slotKey(name: string, index: number): string {
  return `${name}#${index}`;
}

/** All fill-in slots of a sentence, in order of appearance. */
export function variableSlots(text: string): Slot[] {
  const counts = new Map<string, number>();
  const out: Slot[] = [];
  for (const t of parseTokens(text)) {
    if (isReservedToken(t.name)) continue;
    const index = counts.get(t.name) ?? 0;
    counts.set(t.name, index + 1);
    out.push({ name: t.name, key: slotKey(t.name, index), index });
  }
  return out;
}

/**
 * Render a template into segments so the UI can highlight unfilled blanks.
 * Values are looked up by slot key first ("accuracy#1"), then by plain name.
 */
export function renderSegments(text: string, ctx: RenderContext): Segment[] {
  const segs: Segment[] = [];
  const counts = new Map<string, number>();
  let pos = 0;
  for (const t of parseTokens(text)) {
    if (t.start > pos) segs.push({ kind: "text", text: text.slice(pos, t.start) });
    if (t.name === STUDENT_TOKEN) {
      segs.push({ kind: "auto", text: STUDENT_PLACEHOLDER });
    } else if (t.name in PRONOUN_ALIASES) {
      const slot = PRONOUN_ALIASES[t.name];
      segs.push({ kind: "auto", text: matchCase(t.raw, PRONOUNS[ctx.pronounSet][slot]) });
    } else {
      const index = counts.get(t.name) ?? 0;
      counts.set(t.name, index + 1);
      const key = slotKey(t.name, index);
      const v = ctx.values[key] ?? ctx.values[t.name];
      if (v !== undefined && v.trim() !== "") segs.push({ kind: "filled", text: v, name: t.name, key });
      else segs.push({ kind: "missing", name: t.name, key });
    }
    pos = t.end;
  }
  if (pos < text.length) segs.push({ kind: "text", text: text.slice(pos) });
  return segs;
}

/** Human labels for the auto tokens, used by the Insert menu. */
export const AUTO_TOKENS: { token: string; label: string }[] = [
  { token: "{{student}}", label: "Student → [STUDENT]" },
  { token: "{{they}}", label: "he / she" },
  { token: "{{them}}", label: "him / her" },
  { token: "{{their}}", label: "his / her" },
  { token: "{{theirs}}", label: "his / hers" },
  { token: "{{themselves}}", label: "himself / herself" },
];

/** Render to plain text. Missing variables become [[name]] so they stay visible. */
export function renderText(text: string, ctx: RenderContext): { text: string; missing: string[] } {
  const missing: string[] = [];
  const out = renderSegments(text, ctx)
    .map((s) => {
      if (s.kind === "missing") {
        if (!missing.includes(s.name)) missing.push(s.name);
        return `[[${s.name}]]`;
      }
      return s.text;
    })
    .join("");
  return { text: out, missing };
}
