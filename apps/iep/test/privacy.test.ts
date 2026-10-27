import { describe, expect, it } from "vitest";
import { assemble, assembledToText, emptyBuilderState } from "../src/model/assemble";
import { starterLibrary } from "../src/model/defaults";
import { buildPrompt } from "../src/model/prompt";
import { buildAllowList, scanForLibrary, scanText } from "../src/model/privacy";

const lib = { ...starterLibrary(), neverAllow: ["Example Elementary", "Room 12"] };
const allow = buildAllowList(lib);
const scan = (t: string) => scanText(t, { neverAllow: lib.neverAllow, allow });

describe("privacy scan", () => {
  it("flags never-allow phrases regardless of case", () => {
    const w = scan("[STUDENT] attends example elementary in room 12.");
    expect(w.map((x) => x.kind)).toEqual(["never-allow", "never-allow"]);
    expect(w[0].text).toBe("example elementary");
  });

  it("flags full dates, phones and emails but not month-year goal dates", () => {
    const w = scan("Born 3/14/2018, call 555-123-4567 or mom@example.com. By October of 2027, [STUDENT] will cut. Review on March 3, 2026.").filter((x) => x.kind !== "name");
    expect(w.map((x) => x.kind).sort()).toEqual(["date", "date", "email", "phone"]);
    expect(w.find((x) => x.kind === "date")?.text).toBe("3/14/2018");
    expect(scan("By October 2027 he will improve.").length).toBe(0);
  });

  it("flags capitalised words that are not library wording, but not template words or sentence starts", () => {
    const w = scan("During cutting tasks, Jordan Lee demonstrated functional bilateral coordination. However, his writing was small. Marisol cut a heart.");
    expect(w.map((x) => x.text)).toEqual(["Jordan Lee", "Marisol"]);
  });

  it("treats K-12 as a grade range but still catches hyphenated names", () => {
    expect(scan("[STUDENT] attends a K-12 school.").length).toBe(0);
    expect(scan("[STUDENT] worked with Mary-Kate today.").map((x) => x.text)).toEqual(["Mary-Kate"]);
  });

  it("ignores [STUDENT], [[blanks]] and single capital letters", () => {
    expect(scan("[STUDENT] reversed B, D and Z. [[line_type]] within 1/8 inch.").length).toBe(0);
  });

  it("produces no warnings for a fully-filled starter draft and its AI prompt", () => {
    const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
    const s = cutting.sentences[2];
    const state = { ...emptyBuilderState(), taskIds: [cutting.id], sentenceIds: cutting.sentences.map((x) => x.id), values: { [s.id]: { "line_type#0": "curved line", "accuracy#0": "80%", "trials#0": "4 out of 5" } } };
    const a = assemble(lib, state);
    expect(scanForLibrary(assembledToText(a), lib)).toEqual([]);
    expect(scanForLibrary(buildPrompt(lib, a), lib)).toEqual([]);
  });

  it("produces no warnings for a prompt whose blanks are all filled", () => {
    const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
    const s = cutting.sentences[1];
    const state = { ...emptyBuilderState(), taskIds: [cutting.id], sentenceIds: [s.id], values: { [s.id]: { "shape#0": "circle" } } };
    const p = buildPrompt(lib, assemble(lib, state));
    expect(p).toContain("Blanks to fill: none.");
    expect(scanForLibrary(p, lib)).toEqual([]);
  });

  it("catches a name typed into a blank", () => {
    const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
    const s = cutting.sentences[1]; // "{{They}} cut a {{shape}} without deviation."
    const state = { ...emptyBuilderState(), taskIds: [cutting.id], sentenceIds: [s.id], values: { [s.id]: { "shape#0": "heart for Ms. Rivera" } } };
    const w = scanForLibrary(assembledToText(assemble(lib, state)), lib);
    expect(w.some((x) => x.kind === "name" && x.text.includes("Rivera"))).toBe(true);
  });
});
