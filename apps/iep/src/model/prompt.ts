import type { Library } from "./types";
import { assembledToText, type Assembled } from "./assemble";

/**
 * Phase 4: build a prompt for any AI chatbot. The prompt locks the therapist's
 * wording and structure, allows only blank-filling and small grammar fixes,
 * and leaves a marked space for rough session notes.
 *
 * The wording below is a default; the user can edit it in Settings. Two
 * markers must stay in the wording: <<<TEMPLATE>>> and <<<BLANKS>>>.
 */

export const TEMPLATE_MARKER = "<<<TEMPLATE>>>";
export const BLANKS_MARKER = "<<<BLANKS>>>";
/** Replaced by the writer's role, e.g. "speech-language pathologist". Optional in custom wording. */
export const ROLE_MARKER = "<<<ROLE>>>";

export const DEFAULT_PROMPT_TEMPLATE = `You are helping a school-based ${ROLE_MARKER} finish an IEP draft.

Below is a TEMPLATE the ${ROLE_MARKER} wrote in their own words, followed by their ROUGH NOTES from sessions and assessments.

Rules:
1. Keep the template's wording, sentence order, headings and structure exactly as written. Do not rephrase, reorder, merge, shorten or add sentences.
2. Fill in only the blanks marked like [[this]], using facts from the notes.
3. You may make small grammar fixes that a filled blank requires (for example "a" vs "an", singular vs plural, verb agreement).
4. If the notes clearly contradict a sentence, or describe something very different from what the template says, do NOT rewrite that sentence. Keep it as written and report the conflict under "Flags".
5. If the notes do not contain the information for a blank, leave it as [[blank]] and list it under "Could not fill". Never guess or invent details, scores, levels, dates or names.
6. The student is always written as [STUDENT]. Keep the pronouns used in the template. Do not add any names, initials, school names, dates of birth or other identifying details, even if they appear in the notes.

Respond with:
A. The completed template, same headings and order.
B. "Could not fill": the blanks you left empty, one per line.
C. "Flags": places where the notes disagree with the template, each with a one-line explanation.
Nothing else.

=== TEMPLATE ===
${TEMPLATE_MARKER}
=== END TEMPLATE ===

Blanks to fill: ${BLANKS_MARKER}

=== MY ROUGH NOTES (paste them below this line) ===


=== END NOTES ===`;

export interface BlankSummary {
  name: string;
  label: string;
}

/** Unique unfilled blanks across the assembled draft, with friendly labels. */
export function unfilledBlanks(lib: Library, a: Assembled): BlankSummary[] {
  const seen = new Map<string, BlankSummary>();
  for (const s of a.sections)
    for (const b of s.blocks)
      for (const p of b.paragraphs)
        for (const sn of p.sentences)
          for (const name of sn.missing)
            if (!seen.has(name)) seen.set(name, { name, label: lib.variables.find((v) => v.name === name)?.label ?? name.replace(/_/g, " ") });
  return [...seen.values()];
}

export function promptTemplate(lib: Library): string {
  const t = lib.aiPromptTemplate?.trim();
  return t && t.includes(TEMPLATE_MARKER) ? lib.aiPromptTemplate! : DEFAULT_PROMPT_TEMPLATE;
}

export function buildPrompt(lib: Library, a: Assembled, role = "occupational therapist"): string {
  const blanks = unfilledBlanks(lib, a);
  const blanksText = blanks.length ? blanks.map((b) => `[[${b.name}]] = ${b.label}`).join("; ") : "none. Every blank is already filled; only check grammar and report flags.";
  const template = promptTemplate(lib).split(ROLE_MARKER).join(role);
  const out = template.replace(TEMPLATE_MARKER, assembledToText(a));
  return out.includes(BLANKS_MARKER) ? out.replace(BLANKS_MARKER, blanksText) : `${out}\n\nBlanks to fill: ${blanksText}`;
}
