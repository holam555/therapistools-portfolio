import type { Id, Library, PronounSet, SentenceRef } from "./types";
import { allSentences } from "./library";
import { renderSegments, renderText, variableSlots, type Segment } from "./template";

/** Everything the builder needs to remember for one IEP draft. No student data. */
export interface BuilderState {
  pronounSet: PronounSet;
  gradeBandId: Id | null;
  domainIds: Id[];
  taskIds: Id[];
  sentenceIds: Id[];
  /** sentenceId → slotKey ("accuracy#0") → value */
  values: Record<Id, Record<string, string>>;
}

export function emptyBuilderState(): BuilderState {
  return { pronounSet: "he", gradeBandId: null, domainIds: [], taskIds: [], sentenceIds: [], values: {} };
}

/** Sentences whose task is selected and whose grade bands fit (or are unrestricted). */
export function matchingSentences(lib: Library, state: BuilderState): SentenceRef[] {
  return allSentences(lib).filter(({ sentence, task }) => {
    if (!state.taskIds.includes(task.id)) return false;
    if (sentence.gradeBandIds.length === 0 || state.gradeBandId === null) return true;
    return sentence.gradeBandIds.includes(state.gradeBandId);
  });
}

export interface AssembledSentence {
  sentenceId: Id;
  segments: Segment[];
  text: string;
  missing: string[];
}
export interface AssembledParagraph {
  taskId: Id;
  taskName: string;
  sentences: AssembledSentence[];
  /** The sentences only. */
  text: string;
  /** Domain name written in front of the paragraph ("Fine Motor: …"), on the first paragraph of each domain. */
  label?: string;
  /** label + text, as it appears in copied text. */
  fullText: string;
}
export interface AssembledBlock {
  domainId: Id;
  domainName: string;
  paragraphs: AssembledParagraph[];
}
export interface AssembledSection {
  sectionId: Id | null;
  sectionName: string;
  blocks: AssembledBlock[];
  /** Plain text for this section (without the section heading). */
  text: string;
  missing: number;
}
export interface Assembled {
  sections: AssembledSection[];
  sentenceCount: number;
  missing: number;
}

/**
 * Group the ticked sentences by section (library order) → domain → task, and render them.
 * Sentences keep library order within a task. Unfilled blanks render as [[name]] in text.
 */
export function assemble(lib: Library, state: BuilderState): Assembled {
  const ticked = matchingSentences(lib, state).filter((r) => state.sentenceIds.includes(r.sentence.id));
  const sectionOrder: (Id | null)[] = [...lib.sections.map((s) => s.id), null];
  const sections: AssembledSection[] = [];
  let missingTotal = 0;
  for (const sectionId of sectionOrder) {
    const inSection = ticked.filter((r) => r.sentence.sectionId === sectionId);
    if (inSection.length === 0) continue;
    const blocks: AssembledBlock[] = [];
    let sectionMissing = 0;
    for (const domain of lib.domains) {
      const paragraphs: AssembledParagraph[] = [];
      for (const task of domain.tasks) {
        const refs = inSection.filter((r) => r.task.id === task.id);
        if (refs.length === 0) continue;
        const sentences = refs.map(({ sentence }) => {
          const ctx = { pronounSet: state.pronounSet, values: state.values[sentence.id] ?? {} };
          const { text, missing } = renderText(sentence.text, ctx);
          sectionMissing += variableSlots(sentence.text).filter((s) => !(ctx.values[s.key] ?? ctx.values[s.name])?.trim()).length;
          return { sentenceId: sentence.id, segments: renderSegments(sentence.text, ctx), text, missing };
        });
        const text = sentences.map((s) => s.text).join(" ");
        paragraphs.push({ taskId: task.id, taskName: task.name, sentences, text, fullText: text });
      }
      if (paragraphs.length) blocks.push({ domainId: domain.id, domainName: domain.name, paragraphs });
    }
    // Put the domain name in front of its first paragraph, but only when the section mixes
    // two or more domains. A section with one domain (e.g. Service Delivery) needs no label.
    if (blocks.length > 1)
      for (const b of blocks) {
        const first = b.paragraphs[0];
        first.label = b.domainName;
        first.fullText = `${b.domainName}: ${first.text}`;
      }
    const text = blocks.flatMap((b) => b.paragraphs.map((p) => p.fullText)).join("\n\n");
    sections.push({
      sectionId,
      sectionName: sectionId ? (lib.sections.find((s) => s.id === sectionId)?.name ?? "Section") : "Other",
      blocks,
      text,
      missing: sectionMissing,
    });
    missingTotal += sectionMissing;
  }
  return { sections, sentenceCount: ticked.length, missing: missingTotal };
}

/** One section with its heading, as copied by "Copy section". */
export function sectionToText(s: AssembledSection): string {
  return `${s.sectionName.toUpperCase()}\n\n${s.text}`;
}

/** All sections as one plain-text document with section headings. */
export function assembledToText(a: Assembled): string {
  return a.sections.map(sectionToText).join("\n\n\n");
}
