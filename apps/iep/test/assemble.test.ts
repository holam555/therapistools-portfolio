import { describe, expect, it } from "vitest";
import { assemble, assembledToText, emptyBuilderState, matchingSentences, sectionToText } from "../src/model/assemble";
import { starterLibrary } from "../src/model/defaults";

const lib = starterLibrary();
const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
const dressing = lib.domains[2].tasks.find((t) => t.name === "Dressing")!;

describe("matchingSentences", () => {
  it("returns sentences of selected tasks only, respecting grade bands", () => {
    const state = { ...emptyBuilderState(), taskIds: [cutting.id] };
    expect(matchingSentences(lib, state).length).toBe(cutting.sentences.length);
    const restricted = structuredClone(lib);
    restricted.domains[0].tasks.find((t) => t.name === "Cutting")!.sentences[0].gradeBandIds = ["gb_912"];
    expect(matchingSentences(restricted, { ...state, gradeBandId: "gb_k2" }).length).toBe(cutting.sentences.length - 1);
    expect(matchingSentences(restricted, { ...state, gradeBandId: "gb_912" }).length).toBe(cutting.sentences.length);
    expect(matchingSentences(restricted, { ...state, gradeBandId: null }).length).toBe(cutting.sentences.length);
  });
});

describe("assemble", () => {
  it("groups by section in library order, then domain, then task paragraph", () => {
    const objectiveCut = cutting.sentences.find((s) => s.sectionId === "sec_objective")!;
    const plCut = cutting.sentences.filter((s) => s.sectionId === "sec_present");
    const objectiveCoat = dressing.sentences.find((s) => s.sectionId === "sec_objective")!;
    const state = {
      ...emptyBuilderState(),
      pronounSet: "she" as const,
      taskIds: [cutting.id, dressing.id],
      sentenceIds: [objectiveCoat.id, objectiveCut.id, plCut[0].id, plCut[1].id],
      values: { [plCut[1].id]: { "shape#0": "circle" } },
    };
    const a = assemble(lib, state);
    expect(a.sections.map((s) => s.sectionName)).toEqual(["Present Levels", "Objective"]);
    const pl = a.sections[0];
    expect(pl.blocks.map((b) => b.domainName)).toEqual(["Fine Motor"]);
    expect(pl.blocks[0].paragraphs[0].taskName).toBe("Cutting");
    expect(pl.blocks[0].paragraphs[0].text).toBe(
      "During cutting tasks, she opened and closed the scissors with a smooth rhythm and turned the paper with her helper hand. She cut a circle without deviation.",
    );
    const obj = a.sections[1];
    expect(obj.blocks.map((b) => b.domainName)).toEqual(["Fine Motor", "Self Care"]);
    expect(obj.text).toContain("[[line_type]]");
    // two domains in one section: each domain's name goes in front of its paragraph
    expect(obj.text).toContain("Fine Motor: [STUDENT] will improve fine motor cutting skills");
    expect(obj.text).toContain("\n\nSelf Care: [STUDENT] will fasten the top button of her coat");
    expect(a.sentenceCount).toBe(4);
    expect(a.missing).toBe(2); // line_type and tolerance in the cutting objective
    // one domain in a section: no label
    expect(assembledToText(a).startsWith("PRESENT LEVELS\n\nDuring cutting tasks")).toBe(true);
    expect(sectionToText(obj).startsWith("OBJECTIVE\n\nFine Motor: ")).toBe(true);
  });

  it("ignores ticked sentences whose task is no longer selected", () => {
    const state = { ...emptyBuilderState(), taskIds: [], sentenceIds: [cutting.sentences[0].id] };
    expect(assemble(lib, state).sentenceCount).toBe(0);
  });
});
