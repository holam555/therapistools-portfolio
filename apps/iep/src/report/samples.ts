import type { PronounSet } from "../model/types";
import { convertPronouns, splitSentences } from "../model/splitter";
import { fillPronouns } from "./render";

/**
 * What the blank picker offers from the template's own examples, from the
 * most to the least specific:
 *
 *   0. `parts`: short pieces to tick and combine. When what the examples put
 *      in this spot is a list ("a line, a circle and a square"), each item is
 *      its own choice, so the writer picks the ones that are true this time.
 *
 *   1. `fills`: when an example follows this paragraph's wording ("Standard
 *      score 82, percentile rank 12, Below Average"), the words that sit
 *      where this blank sits are lifted out ("82"). The paragraph's wording
 *      becomes a pattern: fixed text must match, pronouns match any pronoun,
 *      and every blank captures what the example put there. When an example
 *      words the line a little differently, the fixed words right before and
 *      after the blank still find the spot (`liftNear`).
 *   2. `sentences`: sentences from the examples that share words with the
 *      blank's label or the fixed wording around it.
 *   3. `all`: every sentence, for "show all".
 *
 * A blank in the middle of a sentence is never offered whole sentences first:
 * they do not fit there. A paragraph with a label ("Coloring") reads only the
 * parts of the examples under that label.
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

// ---------- where the blank sits in its sentence ----------

export interface BlankSpot {
  /** Fixed wording of the same sentence before the blank, as it reads in the report. */
  before: string;
  /** Fixed wording of the same sentence after the blank. */
  after: string;
  /** Nothing comes before it in its sentence. */
  startsSentence: boolean;
  /** Nothing but the closing mark comes after it in its sentence. */
  endsSentence: boolean;
  /** A comma, semicolon or colon straight after the blank, which closes the spot when no words do. */
  markAfter?: string;
}

const WHOLE: BlankSpot = { before: "", after: "", startsSentence: true, endsSentence: true };

/** The sentence around the nth blank of a paragraph, written for the chosen he/she. */
export function blankSpot(template: string | undefined, blankIndex: number, pronoun: PronounSet): BlankSpot {
  if (!template) return WHOLE;
  const text = fillPronouns(template, pronoun);
  const m = [...text.matchAll(/\[\[.+?\]\]/g)][blankIndex];
  if (!m) return WHOLE;
  // Another blank or a {slot} in the same sentence bounds the wording: what lies beyond it is not next to this blank.
  const OTHER = /\[\[.+?\]\]|\{[a-z]+(?::[A-Za-z0-9_-]+)?\}/g;
  const head = text.slice(0, m.index);
  const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), head.lastIndexOf("\n"));
  const sentenceHead = head.slice(cut + 1);
  const before = (sentenceHead.split(OTHER).pop() ?? "").trim();
  const tail = text.slice(m.index + m[0].length);
  const stop = tail.search(/[.!?](?:\s|$)|\n/);
  const sentenceTail = stop < 0 ? tail : tail.slice(0, stop);
  const after = sentenceTail.split(OTHER)[0].trim();
  const mark = /^[,;:]/.exec(sentenceTail)?.[0];
  return { before, after, startsSentence: !/[A-Za-z0-9[{]/.test(sentenceHead), endsSentence: !/[A-Za-z0-9[{]/.test(sentenceTail), ...(mark ? { markAfter: mark } : {}) };
}

const LOWER_START = new Set(
  "he she his her they their it its the a an this these those when while during after before with without in on at to for from using given based overall there each some most both all no one two three".split(" "),
);
const wordsOf = (s: string) => [...s.matchAll(/[A-Za-z0-9][A-Za-z0-9'’%/-]*/g)].map((m) => ({ w: m[0].toLowerCase().replace(/’/g, "'"), at: m.index, end: m.index + m[0].length }));

/**
 * Make a chosen piece read right where the blank sits: wording the template
 * already has before or after the blank is not written twice, a piece in the
 * middle of a sentence starts in lowercase, one that opens a sentence starts
 * with a capital, and the closing period is the template's when it has one.
 */
export function fitToSpot(choice: string, spot: BlankSpot, periodAfter: boolean): string {
  let t = choice.trim();
  if (!t) return t;
  if (!spot.startsSentence) {
    // The template's last words before the blank, found in the choice: what comes after them is the piece.
    const b = wordsOf(spot.before).map((x) => x.w);
    const c = wordsOf(t);
    for (let k = Math.min(b.length, 4); k >= 1; k--) {
      const needle = b.slice(-k);
      const hit = k > 1 ? findRun(c, needle, 0) : needle[0].length > 3 && c[0]?.w === needle[0] ? 0 : -1;
      if (hit >= 0 && hit + k < c.length) {
        t = t.slice(c[hit + k].at);
        break;
      }
    }
    const first = /^[A-Z][a-z]*/.exec(t)?.[0];
    if (first && LOWER_START.has(first.toLowerCase())) t = t[0].toLowerCase() + t.slice(1);
  } else if (/^[a-z]/.test(t)) t = t[0].toUpperCase() + t.slice(1);
  if (!spot.endsSentence) {
    t = t.replace(/[.]+$/, "");
    const a = wordsOf(spot.after).map((x) => x.w);
    const c = wordsOf(t);
    for (let k = Math.min(a.length, 4); k >= 1; k--) {
      const needle = a.slice(0, k);
      const hit = k > 1 ? findRun(c, needle, 1) : needle[0].length > 3 && c.length > 1 && c[c.length - 1].w === needle[0] ? c.length - 1 : -1;
      if (hit > 0) {
        t = t.slice(0, c[hit].at).replace(/[\s,;:]+$/, "");
        break;
      }
    }
  }
  return periodAfter ? t.replace(/[.]+$/, "") : t;
}

// ---------- the spot found by the words around it ----------

function findRun(hay: { w: string }[], needle: string[], from: number): number {
  for (let i = from; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j].w === w)) return i;
  return -1;
}

/**
 * What a sentence puts where the blank sits, found by the fixed words right
 * before and after the blank. For examples that do not follow the paragraph
 * word for word ("from the model" where the template says "from a model").
 */
export function liftNear(sentence: string, spot: BlankSpot): string | null {
  if (spot.startsSentence && spot.endsSentence) return null;
  const toks = wordsOf(sentence);
  const before = wordsOf(spot.before).map((x) => x.w);
  const after = wordsOf(spot.after).map((x) => x.w);
  let from = 0;
  let strong = false;
  if (!spot.startsSentence) {
    if (!before.length) return null;
    let hit = -1;
    let k = Math.min(3, before.length);
    for (; k >= 1 && hit < 0; k--) {
      const needle = before.slice(-k);
      if (k === 1 && (needle[0].length < 4 || STOP.has(needle[0]))) break;
      hit = findRun(toks, needle, 0);
      if (hit >= 0) {
        from = hit + k;
        strong = k >= 2;
      }
    }
    if (hit < 0) return null;
  }
  let to = toks.length;
  // One word is too weak a mark on its own: it needs the wording after the blank to close the spot.
  if (spot.endsSentence && !spot.startsSentence && !strong) return null;
  let end = -1;
  if (!spot.endsSentence) {
    let hit = -1;
    for (let k = Math.min(2, after.length); k >= 1 && hit < 0; k--) {
      const needle = after.slice(0, k);
      hit = findRun(toks, needle, from + 1);
      // A small word such as "with" closes the spot only when the sentence has it once.
      if (hit >= 0 && k === 1 && STOP.has(needle[0]) && (spot.startsSentence || findRun(toks, needle, hit + 1) >= 0)) hit = -1;
    }
    if (hit >= 0) to = hit;
    else if (!after.length && spot.markAfter && from < toks.length) {
      end = sentence.indexOf(spot.markAfter, toks[from].at);
      if (end < 0) return null;
    } else return null;
  }
  if (to <= from) return null;
  const start = toks[from].at;
  if (end < 0) end = to < toks.length ? toks[to].at : sentence.length;
  const out = sentence.slice(start, end).trim().replace(/^[,;:]\s*|[\s,;:.!?]+$/g, "");
  if (!out || out.length > 220 || count(out) > 24) return null;
  return out;
}

// ---------- lists become pieces ----------

/** Split on commas that are not inside brackets. */
function splitCommas(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ("([".includes(ch)) depth++;
    else if (")]".includes(ch)) depth = Math.max(0, depth - 1);
    else if ((ch === "," || ch === ";") && depth === 0 && !/\d/.test(text[i + 1] ?? "")) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((x) => x.trim()).filter(Boolean);
}

const count = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * "a line, a circle and a square" → its three items; "extra time and a slant
 * board" → two. Text that is not a list gives nothing. Names with "and" in
 * them ("Taste and Smell, and Balance and Motion") stay whole.
 */
export function listItems(text: string): string[] {
  const t = text.trim().replace(/[.]+$/, "");
  let items = splitCommas(t);
  if (items.length >= 2) {
    const last = items[items.length - 1];
    const lead = /^(?:and|or)\s+/i.exec(last);
    if (lead) items[items.length - 1] = last.slice(lead[0].length);
    else {
      const two = last.split(/\s+and\s+/);
      if (two.length === 2) items.splice(items.length - 1, 1, two[0], two[1]);
    }
  } else {
    const two = t.split(/\s+and\s+/);
    if (two.length !== 2 || count(two[0]) > 6 || count(two[1]) > 6) return [];
    items = two;
  }
  items = items.map((x) => x.trim()).filter(Boolean);
  if (items.length < 2 || items.some((x) => count(x) > 14)) return [];
  return items;
}

/** A list taken from a whole sentence carries the sentence's opening on its first item: split it off, keeping as many words as the other items have. */
export function splitLead(items: string[]): { lead: string; items: string[] } {
  const rest = items.slice(1).map(count).sort((x, y) => x - y);
  const typical = rest[Math.floor((rest.length - 1) / 2)] ?? 0;
  const first = items[0].split(/\s+/);
  if (!typical || first.length <= typical + 2) return { lead: "", items };
  return { lead: first.slice(0, -typical).join(" "), items: [first.slice(-typical).join(" "), ...items.slice(1)] };
}

// ---------- examples under this paragraph's label ----------

const LABELLED = /^([A-Z][A-Za-z /&-]{1,40}?)\s*(?:–|-|:)\s+/;
const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * When examples carry labels ("Coloring – …", "Motor: …") and this paragraph
 * has one, only the parts under the same label; otherwise every example.
 */
export function examplesFor(examples: string[], blockLabel: string | undefined): string[] {
  if (!blockLabel) return examples;
  const out: string[] = [];
  for (const ex of examples) {
    for (const line of ex.split(/\n+/)) {
      let on = false;
      let inline = false;
      let run: string[] = [];
      for (const sentence of splitSentences(line)) {
        const m = LABELLED.exec(sentence);
        if (m) {
          if (on && run.length) out.push(run.join(" "));
          on = sameLabel(m[1], blockLabel);
          run = [];
          // A label in the middle of a running paragraph covers its own sentence; one that opens a line covers the line.
          if (on && inline) {
            out.push(sentence);
            on = false;
          }
        }
        inline = true;
        if (on) run.push(sentence);
      }
      if (on && run.length) out.push(run.join(" "));
    }
  }
  return out.length ? out : examples;
}

export interface Suggestions {
  /** Short pieces to tick and combine, when the examples hold lists for this spot. */
  parts: string[];
  /** For a blank that takes a whole sentence: the sentence opening the ticked pieces follow ("She copied"). */
  partsLead: string;
  fills: string[];
  sentences: string[];
  all: string[];
  /** Where the blank sits; whole sentences only fit a blank that is a whole sentence. */
  spot: BlankSpot;
}

const uniq = (xs: string[]) => xs.filter((x, i) => xs.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);

export function blankSuggestions(o: { template?: string; blankIndex: number; label: string; blockLabel?: string; examples: string[] | undefined; pronoun: PronounSet }): Suggestions {
  const examples = examplesFor(o.examples ?? [], o.blockLabel);
  const spot = blankSpot(o.template, o.blankIndex, o.pronoun);
  const all = sampleSentences(examples, o.pronoun, 40);
  const exact = o.template ? liftFills(o.template, o.blankIndex, examples, o.pronoun) : [];
  const near = all.map((s) => liftNear(s, spot)).filter((x): x is string => !!x);
  const fills = uniq([...exact, ...near]).slice(0, 8);
  const whole = spot.startsSentence && spot.endsSentence;
  const sentences = relevantSentences(all, o.template, o.blankIndex, o.label).filter((s) => !fills.includes(s));
  const lists = fills.map(listItems).filter((l) => l.length);
  let partsLead = "";
  // A blank that takes a whole sentence has no spot to lift from: the first related sentence that holds a list gives the pieces, and its opening leads them.
  if (whole && !lists.length) {
    for (const sentence of sentences) {
      const l = listItems(sentence);
      if (l.length < 3) continue;
      const split = splitLead(l);
      lists.push(split.items);
      partsLead = split.lead;
      break;
    }
  }
  const parts = uniq(lists.flat()).slice(0, 18);
  return parts.length >= 2 ? { parts, partsLead, fills, sentences, all, spot } : { parts: [], partsLead: "", fills, sentences, all, spot };
}
