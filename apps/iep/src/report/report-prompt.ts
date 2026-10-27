import type { PronounSet } from "../model/types";
import type { GradeGroup, ReportSection, ReportType, ReportValues } from "./types";
import { GRADE_GROUPS } from "./types";
import { blanksIn, sectionText } from "./render";

/**
 * One prompt per section, to paste into an AI chatbot together with the
 * writer's rough notes for that section. The frame fixes structure and fixed
 * wording; the examples set tone; the notes supply every fact.
 */

const PRONOUN_WORDS: Record<PronounSet, string> = { he: "he, him, his", she: "she, her, hers" };

export interface PromptContext {
  role: string;
  reportType: ReportType;
  grade: GradeGroup;
  pronoun: PronounSet;
}

/** Sections with nothing to fill and no examples need no prompt. */
export function needsPrompt(s: ReportSection, pronoun: PronounSet, values: ReportValues = {}): boolean {
  return !!s.notesHint && blanksIn(s, pronoun, values).length > 0;
}

export function buildSectionPrompt(s: ReportSection, ctx: PromptContext, values: ReportValues = {}): string {
  const grade = GRADE_GROUPS.find((g) => g.id === ctx.grade)?.label ?? "";
  const report = ctx.reportType === "evaluation" ? "evaluation report" : "annual review";
  const examples = s.examples.length
    ? `=== EXAMPLES (for style and tone only; never copy their details) ===\n${s.examples.map((e, i) => `Example ${i + 1}:\n${e}`).join("\n\n")}\n=== END EXAMPLES ===`
    : "";
  return [
    `You are helping a school-based ${ctx.role} write one section of a student's IEP ${report}. The student is in grade ${grade}.`,
    "",
    `SECTION: ${s.title}`,
    "",
    "Below is the FRAME for this section, then my ROUGH NOTES. Write the finished section.",
    "",
    "Rules:",
    "1. Keep the frame's headings, labels, order and fixed wording, including any details I already filled in. Replace each [[blank]] using only facts from my notes.",
    "2. Write in the same style and tone as the examples: objective, concise, functional, and focused on school participation. Small changes to the frame's sentences are fine when my notes need them, but keep the same ideas.",
    "3. Never invent scores, percentages, levels, dates or observations. If my notes do not cover a blank, leave it as [[blank]].",
    `4. The student is written as [STUDENT] once at the start, then ${PRONOUN_WORDS[ctx.pronoun]}. Keep that. Never add a name, initials, teacher or school names, or dates of birth, even if they appear in my notes.`,
    "5. If my notes say something the frame does not fit, keep the frame's meaning where you can and explain the change under Flags.",
    "6. Reply in plain text that can be pasted into Word, with the same labels as the frame.",
    "",
    "Reply with:",
    "A. The finished section.",
    "B. Missing: each [[blank]] you could not fill, one per line.",
    "C. Flags: anything you changed from the frame, and why.",
    "",
    "=== FRAME ===",
    sectionText(s, ctx.pronoun, values),
    "=== END FRAME ===",
    "",
    examples,
    examples ? "" : null,
    `=== MY ROUGH NOTES FOR THIS SECTION (paste below this line; ${s.notesHint ?? "anything relevant"}) ===`,
    "",
    "",
    "=== END NOTES ===",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
