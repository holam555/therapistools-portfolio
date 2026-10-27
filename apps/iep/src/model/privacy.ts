import type { Library } from "./types";
import { allSentences } from "./library";
import { promptTemplate } from "./prompt";

/**
 * Phase 5: warn (never block) about text that looks like personal information
 * before it is copied, downloaded or handed to an AI.
 */

export type WarningKind = "never-allow" | "name" | "date" | "phone" | "email";

export interface PrivacyWarning {
  kind: WarningKind;
  /** The matched text. */
  text: string;
  /** A little context around the match. */
  snippet: string;
  reason: string;
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

/** Words that are capitalised for ordinary reasons in OT/IEP writing. */
const COMMON_ALLOW = new Set(
  (
    "I A An The And Or But For Nor So Yet Of In On At To By With From As Is Was Were Are Be Been " +
    "Monday Tuesday Wednesday Thursday Friday Saturday Sunday " +
    `${MONTHS.replace(/\|/g, " ")} ` +
    "IEP OT OTR COTA PT SLP PE K Level Levels Typical Moderate Severe Difficulties Processing " +
    "Present Levels Annual Goal Objective Objectives Accommodation Accommodations Recommendation Recommendations " +
    "Fine Motor Visual Sensory Self Care Gross Student STUDENT He She His Her Him Hers Himself Herself They Them Their " +
    "However Overall Additionally During When Based Services Service Occupational Therapy Therapist Registered Certified Assistant " +
    "Beery VMI TVPS SPM DTVP PDMS BOT PEDI Sensory Measure School Form Teacher Rating Checklist Standards Related Impact Disability Delivery " +
    "Every Blanks Could Flags Nothing Note " +
    "X R Q Y Z B D E N S W M T P"
  ).split(/\s+/),
);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function snippetAt(text: string, start: number, end: number): string {
  const a = Math.max(0, start - 30);
  const b = Math.min(text.length, end + 30);
  return `${a > 0 ? "…" : ""}${text.slice(a, b).replace(/\s+/g, " ")}${b < text.length ? "…" : ""}`;
}

/**
 * Capitalised words that are part of the user's own library (sentences, names,
 * labels, presets) are template wording, not personal data. Anything capitalised
 * that is NOT in this set probably came from a filled-in value or pasted notes.
 */
export function buildAllowList(lib: Library): Set<string> {
  const allow = new Set(COMMON_ALLOW);
  const add = (s: string) => {
    for (const w of s.match(/[A-Z][A-Za-z'’-]*/g) ?? []) allow.add(w);
  };
  for (const { sentence } of allSentences(lib)) add(sentence.text);
  for (const d of lib.domains) {
    add(d.name);
    for (const t of d.tasks) add(t.name);
  }
  for (const s of lib.sections) add(s.name);
  for (const g of lib.gradeBands) add(g.label);
  for (const v of lib.variables) {
    add(v.label);
    for (const p of v.presets) add(p);
  }
  add(promptTemplate(lib));
  return allow;
}

export interface ScanOptions {
  neverAllow: string[];
  allow: Set<string>;
}

export function scanText(text: string, opts: ScanOptions): PrivacyWarning[] {
  const out: PrivacyWarning[] = [];
  const seen = new Set<string>();
  const push = (w: PrivacyWarning) => {
    const k = `${w.kind}:${w.text.toLowerCase()}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(w);
  };

  // 1. never-allow list (whole words/phrases, case-insensitive)
  for (const phrase of opts.neverAllow) {
    const p = phrase.trim();
    if (!p) continue;
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRe(p)}(?![A-Za-z0-9])`, "gi");
    for (const m of text.matchAll(re)) push({ kind: "never-allow", text: m[0], snippet: snippetAt(text, m.index, m.index + m[0].length), reason: "On your never-allow list" });
  }

  // 2. emails
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
    push({ kind: "email", text: m[0], snippet: snippetAt(text, m.index, m.index + m[0].length), reason: "Looks like an email address" });

  // 3. phone numbers
  for (const m of text.matchAll(/(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)/g))
    push({ kind: "phone", text: m[0], snippet: snippetAt(text, m.index, m.index + m[0].length), reason: "Looks like a phone number" });

  // 4. day-level dates (a month and year alone, like a goal date, is fine)
  const dateRes = [
    /(?<!\d)\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?!\d)/g,
    /(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/g,
    new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, "g"),
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?,?\\s+\\d{4}\\b`, "g"),
  ];
  for (const re of dateRes)
    for (const m of text.matchAll(re)) push({ kind: "date", text: m[0], snippet: snippetAt(text, m.index, m.index + m[0].length), reason: "A full date could be a birth date or identify a session" });

  // 5. capitalised words that are not sentence starts and not known template words
  // A capital followed by lowercase letters; hyphens only between letters, so "Mary-Kate" counts but "K-12" does not.
  const word = "[A-Z][a-z'’]+(?:-[A-Za-z][a-z'’]*)*";
  const wordRe = new RegExp(`${word}(?:\\s+${word})*`, "g");
  for (const m of text.matchAll(wordRe)) {
    const start = m.index;
    // skip anything inside [brackets] like [STUDENT] or [[blank]]
    const before = text.slice(0, start);
    const openB = before.lastIndexOf("[");
    if (openB >= 0 && text.indexOf("]", start) >= 0 && before.lastIndexOf("]") < openB) continue;
    const words = m[0].split(/\s+/);
    // drop known words from the ends of the run; keep the unknown middle
    const unknown = words.filter((w) => !opts.allow.has(w) && !opts.allow.has(w.replace(/['’]s$/, "")));
    if (unknown.length === 0) continue;
    if (unknown.every((w) => w.length < 2)) continue;
    const textOut = unknown.join(" ");
    push({
      kind: "name",
      text: textOut,
      snippet: snippetAt(text, start, start + m[0].length),
      reason: unknown.length > 1 ? "Two or more capitalised words together often form a name" : "A capitalised word that is not part of your library wording",
    });
  }
  return out;
}

export function scanForLibrary(text: string, lib: Library): PrivacyWarning[] {
  return scanText(text, { neverAllow: lib.neverAllow, allow: buildAllowList(lib) });
}

export const KIND_LABEL: Record<WarningKind, string> = {
  "never-allow": "Never-allow list",
  name: "Possible name",
  date: "Date",
  phone: "Phone number",
  email: "Email address",
};
