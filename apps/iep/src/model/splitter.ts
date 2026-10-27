import { newId } from "./ids";
import { slugifyVariableName } from "./template";

/**
 * Import helper: turn a pasted chunk of a report/template into rows the user
 * can tag. No AI, just text rules. Tuned on the fictional sample report in test/fixtures.
 */

export type ImportRowKind = "heading" | "sentence" | "item";
export type HeadingLevel = "domain" | "task" | "ignore";

export interface ImportRow {
  id: string;
  kind: ImportRowKind;
  text: string;
  /** For headings: how the row should be used. */
  headingLevel?: HeadingLevel;
  /** Suggested placement carried down from headings/bullet labels. */
  domainName: string;
  taskName: string;
  /** Set when the task came from a bullet label on the same line ("Cutting – …"). */
  labelTask?: string;
  /** Variables suggested by bracket blanks like [XX disability]. */
  suggestedVariables: string[];
}

const ABBREVIATIONS = new Set([
  "i.e", "e.g", "vs", "etc", "mr", "mrs", "ms", "dr", "st", "no", "approx", "min", "max", "ot", "pt", "slp", "cf", "al", "fig",
]);

const CLOSERS = ")]}\"”";

function isUpperStart(ch: string): boolean {
  return /[A-Z0-9“"(\[{]/.test(ch);
}

/** Split one paragraph into sentences. Keeps terminators; never splits inside ( ) or " ". */
export function splitSentences(paragraph: string): string[] {
  // collapse accidental double periods ("cue..") but keep real ellipses
  const text = paragraph.replace(/\s+/g, " ").replace(/(?<!\.)\.\.(?!\.)/g, ".").trim();
  if (!text) return [];
  const out: string[] = [];
  let start = 0;
  let depth = 0;
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "“" || ch === "”") inQuote = ch === "”" ? false : !inQuote;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    if (!".!?".includes(ch) || depth > 0) continue;
    // consume the whole run of terminators (handles "cue..")
    let j = i;
    while (j + 1 < text.length && ".!?".includes(text[j + 1])) j++;
    if (inQuote) {
      // a terminator may end the sentence only if the quote closes right after it: …word."
      if (j + 1 < text.length && '"”'.includes(text[j + 1])) {
        j++;
        inQuote = false;
      } else continue;
    } else {
      // allow a closing quote/paren right after the terminator
      while (j + 1 < text.length && CLOSERS.includes(text[j + 1])) j++;
    }
    const rest = text.slice(j + 1);
    const nextNonSpace = rest.trimStart();
    const endsHere = nextNonSpace.length === 0;
    const spaced = rest.length !== nextNonSpace.length;
    if (!endsHere && !(spaced && isUpperStart(nextNonSpace[0]))) {
      i = j;
      continue;
    }
    // look at the word right before the terminator
    const before = text.slice(start, i);
    const prevWord = (before.match(/(\S+)$/)?.[1] ?? "").replace(/^[("“\[]+/, "");
    const prevLower = prevWord.toLowerCase();
    const codeLike = /\d/.test(prevWord) && /[.]/.test(prevWord); // WLP.1.1, F2.2
    if (!endsHere && (ABBREVIATIONS.has(prevLower) || codeLike)) {
      i = j;
      continue;
    }
    out.push(text.slice(start, j + 1).trim());
    start = j + 1;
    i = j;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const STUDENT_WORD = /\bxx\b/i;

/**
 * Replace de-identified placeholders with template tokens:
 *   XX / xx / XX's        → {{student}} / {{student}}'s
 *   XX minutes             → {{minutes}} minutes
 *   [XX disability] [[x]]  → {{disability}} (also returned as a suggested variable)
 *   [STUDENT] / [Student]  → {{student}}
 * Returns the converted text and any variable names it introduced.
 */
export function convertPlaceholders(input: string): { text: string; variables: string[] } {
  const variables: string[] = [];
  let text = input;
  text = text.replace(/\bxx\s+(minutes?|min)\b/gi, (_m, unit: string) => {
    if (!variables.includes("minutes")) variables.push("minutes");
    return `{{minutes}} ${unit}`;
  });
  text = text.replace(/\[\s*student\s*\]/gi, "{{student}}");
  text = text.replace(/\[+\s*([^\]]+?)\s*\]+/g, (m, inner: string) => {
    const cleaned = inner.replace(/\bxx\b/gi, "").trim();
    if (!cleaned || wordCount(cleaned) > 4) return m;
    const name = slugifyVariableName(cleaned);
    if (!variables.includes(name)) variables.push(name);
    return `{{${name}}}`;
  });
  text = text.replace(/\bxx(['’]s)?/gi, (_m, pos: string | undefined) => (pos ? "{{student}}'s" : "{{student}}"));
  return { text, variables };
}

/** Words after "her" that mean it was an object ("gave her the…"), not possessive ("her paper"). */
const OBJECT_FOLLOWERS = new Set([
  "to", "that", "a", "an", "the", "with", "in", "on", "at", "for", "from", "of", "into", "up", "down", "off", "out", "by",
  "and", "or", "when", "if", "as", "so", "but", "during", "after", "before", "while", "through", "about", "over", "under",
  "some", "this", "these", "those", "it", "there", "here", "how", "what", "which", "where", "very", "more", "less", "enough",
  "too", "not", "again", "then", "because", "until", "without", "within", "than", "is", "was", "were", "will", "can", "could",
]);

function keepCase(original: string, token: string): string {
  return /^[A-Z]/.test(original) ? `{{${token.charAt(0).toUpperCase()}${token.slice(1)}}}` : `{{${token}}}`;
}

/** Replace he/she/him/his/her… with pronoun tokens. "her" is guessed from context. */
export function convertPronouns(input: string): { text: string; ambiguous: number } {
  let ambiguous = 0;
  const text = input.replace(/\b(he|she|him|his|hers|himself|herself|her)\b(?=([,.;:!?)]?)\s*(\S*))/gi, (m, _w, punct: string, nextRaw: string) => {
    const w = m.toLowerCase();
    switch (w) {
      case "he":
      case "she":
        return keepCase(m, "they");
      case "him":
        return keepCase(m, "them");
      case "his":
        return keepCase(m, "their");
      case "hers":
        return keepCase(m, "theirs");
      case "himself":
      case "herself":
        return keepCase(m, "themselves");
      default: {
        ambiguous++;
        const next = (nextRaw || "").toLowerCase().replace(/[^a-z]/g, "");
        const isObject = punct !== "" || next === "" || OBJECT_FOLLOWERS.has(next);
        return keepCase(m, isObject ? "them" : "their");
      }
    }
  });
  return { text, ambiguous };
}

function stripListMarker(line: string): { text: string; wasBullet: boolean } {
  const m = line.match(/^\s*(?:[*\-•·▪◦]|\d{1,2}[.)]|[a-z][.)])\s+(.*)$/);
  return m ? { text: m[1], wasBullet: true } : { text: line.trim(), wasBullet: false };
}

/** "Cutting – During cutting tasks…" → label "Cutting", rest "During cutting tasks…" */
function splitLabel(line: string): { label: string; rest: string } | null {
  const m = line.match(/^(.{1,60}?)\s*(?:[–—]|\s-\s)\s*(.+)$/);
  if (!m) return null;
  const label = m[1].trim();
  if (wordCount(label) > 6 || /[.!?]$/.test(label) || !/^[A-Za-z]/.test(label)) return null;
  return { label, rest: m[2].trim() };
}

function guessDomain(heading: string, knownDomains: string[]): boolean {
  const words = new Set(heading.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2));
  for (const d of knownDomains) {
    const dw = d.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
    if (dw.length && dw.every((w) => words.has(w))) return true;
    if ([...words].some((w) => dw.includes(w) && w.length > 4)) return true;
  }
  return false;
}

export function splitIntoRows(input: string, knownDomains: string[] = []): ImportRow[] {
  const rows: ImportRow[] = [];
  let domainName = "";
  let taskName = "";
  const push = (kind: ImportRowKind, raw: string, extra: Partial<ImportRow> = {}) => {
    const { text, variables } = convertPlaceholders(raw);
    rows.push({ id: newId("row"), kind, text, domainName, taskName, suggestedVariables: variables, ...extra });
  };
  for (const rawLine of input.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const { text: line, wasBullet } = stripListMarker(trimmed);

    const labelled = splitLabel(line);
    if (labelled && (wasBullet || wordCount(labelled.label) <= 4)) {
      taskName = labelled.label;
      for (const s of splitSentences(labelled.rest)) push("sentence", s, { labelTask: labelled.label });
      continue;
    }

    const headingText = line.replace(/:\s*$/, "").trim();
    const looksLikeHeading =
      !wasBullet && wordCount(headingText) <= 5 && !/[.!?]/.test(headingText) && !STUDENT_WORD.test(headingText);
    if (looksLikeHeading) {
      const isDomain = guessDomain(headingText, knownDomains);
      if (isDomain) {
        domainName = headingText;
        taskName = "";
      } else taskName = headingText;
      push("heading", headingText, { headingLevel: isDomain ? "domain" : "task", suggestedVariables: [] });
      continue;
    }

    if (wasBullet && !/[.!?]\s*$/.test(line) && wordCount(line) <= 10) {
      push("item", line);
      continue;
    }
    for (const s of splitSentences(line)) push("sentence", s);
  }
  return rows;
}
