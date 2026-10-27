import { describe, expect, it } from "vitest";
import { assemble, emptyBuilderState } from "../src/model/assemble";
import { starterLibrary } from "../src/model/defaults";
import { DEFAULT_PROMPT_TEMPLATE, buildPrompt, unfilledBlanks } from "../src/model/prompt";

const lib = starterLibrary();
const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
const withBlanks = cutting.sentences[2]; // line_type, accuracy, trials
const state = { ...emptyBuilderState(), taskIds: [cutting.id], sentenceIds: [withBlanks.id], values: { [withBlanks.id]: { "accuracy#0": "80%" } } };

describe("AI hand-off prompt", () => {
  it("includes the template, the rules, the notes space and the unfilled blanks", () => {
    const a = assemble(lib, state);
    const p = buildPrompt(lib, a);
    expect(p).toContain("=== TEMPLATE ===\nPRESENT LEVELS\n\n[STUDENT] cut along a [[line_type]] with 80% accuracy in [[trials]] trials.");
    expect(p).toContain("Blanks to fill: [[line_type]] = Line type; [[trials]] = Trials");
    expect(p).toContain("=== MY ROUGH NOTES (paste them below this line) ===");
    expect(p).toContain('leave it as [[blank]] and list it under "Could not fill"');
    expect(p).toContain("The student is always written as [STUDENT]");
    expect(p).not.toContain("<<<");
    expect(unfilledBlanks(lib, a).map((b) => b.name)).toEqual(["line_type", "trials"]);
  });

  it("says so when every blank is filled", () => {
    const full = { ...state, values: { [withBlanks.id]: { "line_type#0": "curved line", "accuracy#0": "80%", "trials#0": "4 out of 5" } } };
    expect(buildPrompt(lib, assemble(lib, full))).toContain("Blanks to fill: none.");
  });

  it("uses the user's own wording when it keeps the markers, otherwise the default", () => {
    const a = assemble(lib, state);
    const custom = { ...lib, aiPromptTemplate: "Fill this:\n<<<TEMPLATE>>>\nMissing: <<<BLANKS>>>" };
    expect(buildPrompt(custom, a).startsWith("Fill this:\nPRESENT LEVELS")).toBe(true);
    const broken = { ...lib, aiPromptTemplate: "I deleted the markers" };
    expect(buildPrompt(broken, a)).toContain("You are helping a school-based occupational therapist finish an IEP draft.");
    expect(DEFAULT_PROMPT_TEMPLATE.length).toBeGreaterThan(100);
  });
});
