import type { PronounSet } from "../model/types";
import { convertPronouns, splitSentences } from "../model/splitter";
import { fillPronouns } from "./render";

/**
 * Sample sentences for a descriptive blank, taken from the author's own
 * examples for that item (or the section), rewritten for the chosen he/she.
 * [STUDENT] is turned into a pronoun because the section already names the
 * student once.
 */
export function sampleSentences(examples: string[] | undefined, pronoun: PronounSet, max = 14): string[] {
  const out: string[] = [];
  for (const ex of examples ?? []) {
    // Drop a leading item label such as "Pencil grasp – " or "Typing: ".
    const body = ex.replace(/^[A-Z][A-Za-z /&-]{1,40}?\s*(?:–|-|:)\s+/, "");
    for (const raw of splitSentences(body)) {
      const s = raw
        .replace(/^\[STUDENT\]['’]s\b/, pronoun === "he" ? "His" : "Her")
        .replace(/^\[STUDENT\]/, pronoun === "he" ? "He" : "She")
        .replace(/\[STUDENT\]['’]s\b/g, pronoun === "he" ? "his" : "her")
        .replace(/\[STUDENT\]/g, pronoun === "he" ? "he" : "she");
      const sentence = fillPronouns(convertPronouns(s).text, pronoun).trim();
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
