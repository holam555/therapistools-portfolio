import type { PronounSet } from "../model/types";
import { convertPronouns, splitSentences } from "../model/splitter";
import { fillPronouns } from "./render";

/**
 * What the blank picker offers from the template's own examples. Three
 * layers, from the most to the least specific:
 *
 *   1. `fills`: when an example follows this paragraph's wording ("Standard
 *      score 82, percentile rank 12, Below Average"), the words that sit
 *      where this blank sits are lifted out ("82"). The paragraph's wording
 *      becomes a pattern: fixed text must match, pronouns match any pronoun,
 *      and every blank captures what the example put there.
 *   2. `sentences`: sentences from the examples that share words with the
 *      blank's label or the fixed wording around it.
 *   3. `all`: every sentence, for "show all".
 *
 * Examples are rewritten for the chosen he/she, and [STUDENT] becomes a
 * pronoun because the section already names the student once.
 */

/** Drop a leading item label such as "Pencil grasp – " or "Typing: ". */
const stripLabel = (ex: string) => ex.replace(/^[A-Z][A-Za-z /&-]{1,40}?\s*(?:–|-|:)\s+/, "");

/** Pronoun tokens and the student mark, written for the chosen he/she; "[STUDENT]" after a preposition is an object. */
function speak(text: string, pronoun: PronounSet): string {
  const s = text
    .replace(/^\[STUDENT\]['’]s\b/, pronoun === "he" ? "His" : "Her")
    .replace(/^\[STUDENT\]/, pronoun === "he" ? "He" : "She")
    .replace(/\[STUDENT\]['’]s\b/g, pronoun === "he" ? "his" : "her")
    .replace(/\b(with|to|for|from|by|of|about|at|on|in|between|beside|near|asks?|asked|helps?|helped|tells?|told|gives?|gave|shows?|showed|lets?|reminds?|reminded)\s+\[STUDENT\]/g, (_m, prep: string) => `${prep} ${pronoun === "he" ? "him" : "her"}`)
    .replace(/\[STUDENT\]/g, pronoun === "he" ? "he" : "she");
  return fillPronouns(convertPronouns(s).text, pronoun).trim();
}

/** Every sentence of the examples, rewritten for the chosen he/she. */
export function sampleSentences(examples: string[] | undefined, pronoun: PronounSet, max = 14): string[] {
  const out: string[] = [];
  for (const ex of examples ?? []) {
    for (const raw of splitSentences(stripLabel(ex))) {
      const sentence = speak(raw, pronoun);
      if (sentence && !out.includes(sentence)) out.push(sentence);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Fit a chosen sentence into a blank: the template supplies the closing period when one follows. */
export function fitToBlank(sentence: string, periodAfter: boolean): string {
  const t = sentence.trim();
  return periodAfter ? t.replace(/[.]+$/, "") : t;
}

// ---------- lifting fills out of examples that follow the wording ----------

const MARK = /(\[\[.+?\]\]|\{\{\w+\}\}(?:['’]s)?|\{[a-z]+(?::[A-Za-z0-9_-]+)?\})/;
const TOKEN = String.raw`\{\{\w+\}\}(?:['’]s)?`;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The paragraph's wording as a pattern over an example written with pronoun tokens, or null when it has too little fixed text to be safe. */
export function wordingPattern(template: string): { re: RegExp; blanks: number } | null {
  const pieces = template.split(MARK).filter((p) => p !== "");
  let blanks = 0;
  let fixedWords = 0;
  const parts = pieces.map((p) => {
    if (/^\[\[/.test(p)) {
      blanks++;
      return "(.+?)";
    }
    if (/^\{\{/.test(p)) return TOKEN;
    if (/^\{/.test(p)) return String.raw`\S+`;
    fixedWords = Math.max(fixedWords, (p.match(/[A-Za-z]{2,}/g) ?? []).length);
    // Whitespace in the wording must be whitespace in the example, so two blanks side by side stay apart.
    return escape(p).replace(/\s+/g, String.raw`\s+`);
  });
  if (!blanks || fixedWords < 2) return null;
  const joined = parts.join("");
  const start = /^\[\[/.test(pieces[0]) ? String.raw`(?:^|(?<=[.!?]\s))` : "";
  const end = /^\[\[/.test(pieces[pieces.length - 1]) ? String.raw`(?=[.!?](?:\s|$)|$)` : "";
  try {
    return { re: new RegExp(`${start}${joined}${end}`, "gi"), blanks };
  } catch {
    return null;
  }
}

/** An example written the way templates are: pronoun tokens and the student as one too. */
function tokenize(example: string): string {
  return convertPronouns(stripLabel(example).replace(/\[STUDENT\]['’]s/g, "{{their}}").replace(/\[STUDENT\]/g, "{{they}}")).text;
}

/** What the examples put where this blank sits, when they follow the paragraph's wording. */
export function liftFills(template: string, blankIndex: number, examples: string[], pronoun: PronounSet, max = 8): string[] {
  const p = wordingPattern(template);
  if (!p || blankIndex >= p.blanks) return [];
  const out: string[] = [];
  for (const ex of examples) {
    for (const m of tokenize(ex).matchAll(p.re)) {
      const raw = (m[blankIndex + 1] ?? "").trim().replace(/^[,;:]\s*|[,;:]$/g, "");
      if (!raw || raw.length > 240) continue;
      const v = fillPronouns(raw, pronoun);
      if (!out.includes(v)) out.push(v);
      if (out.length >= max) return out;
    }
  }
  return out;
}

// ---------- sentences that relate to the blank ----------

const STOP = new Set(
  "the a an and or of to in on with for at by from is was were are be as that this these those it its he she they them their his her him student what which how when where who whether such not no any each one per than then into out up down about over under also very more most some all both either own same so too can will would should may might has have had do does did during while after before if your you our us we i".split(" "),
);
const words = (s: string) => (s.toLowerCase().match(/[a-z][a-z'’-]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));

/** The fixed wording of the sentence this blank sits in, without marks and blanks. */
function fixedTextAround(template: string, blankIndex: number): string {
  let seen = 0;
  for (const sentence of splitSentences(template)) {
    const n = (sentence.match(/\[\[.+?\]\]/g) ?? []).length;
    if (blankIndex < seen + n) return sentence.replace(/\[\[.+?\]\]|\{\{\w+\}\}|\{[a-z]+(?::[A-Za-z0-9_-]+)?\}/g, " ");
    seen += n;
  }
  return "";
}

/**
 * Sentences that share words with the blank's label (counted double) or with
 * the fixed wording of the sentence it sits in, best first. A blank with no
 * fixed wording around it (a paragraph that is one big blank) gets every
 * sentence.
 */
export function relevantSentences(all: string[], template: string | undefined, blankIndex: number, label: string, max = 6): string[] {
  const fixed = template ? words(fixedTextAround(template, blankIndex)) : [];
  if (!fixed.length) return all.slice(0, max);
  const weights = new Map<string, number>();
  for (const w of words(label)) weights.set(w, 2);
  for (const w of fixed) if (!weights.has(w)) weights.set(w, 1);
  const scored = all.map((s, i) => {
    const ws = new Set(words(s));
    let score = 0;
    for (const [w, k] of weights) if (ws.has(w)) score += k;
    return { s, i, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .map((x) => x.s);
}

export interface Suggestions {
  fills: string[];
  sentences: string[];
  all: string[];
}

export function blankSuggestions(o: { template?: string; blankIndex: number; label: string; examples: string[] | undefined; pronoun: PronounSet }): Suggestions {
  const examples = o.examples ?? [];
  const all = sampleSentences(examples, o.pronoun, 40);
  const fills = o.template ? liftFills(o.template, o.blankIndex, examples, o.pronoun) : [];
  const sentences = relevantSentences(all, o.template, o.blankIndex, o.label).filter((s) => !fills.includes(s));
  return { fills, sentences, all };
}
