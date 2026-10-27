import { describe, expect, it } from "vitest";
import { assemble, emptyBuilderState } from "../src/model/assemble";
import { starterLibrary } from "../src/model/defaults";
import { buildDocx, docxFileName, docxToBuffer } from "../src/model/docx";

describe("docx export", () => {
  it("produces a Word file containing the assembled text and no identifiers", async () => {
    const lib = starterLibrary();
    const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
    const state = { ...emptyBuilderState(), taskIds: [cutting.id], sentenceIds: [cutting.sentences[1].id], values: { [cutting.sentences[1].id]: { "shape#0": "circle" } } };
    const buf = await docxToBuffer(buildDocx(assemble(lib, state)));
    expect(buf.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(buf[0], buf[1])).toBe("PK"); // zip container
    // Word stores the text in word/document.xml; the zip stores small entries uncompressed or deflated.
    // Unzip with the same library docx bundles to check the text made it in.
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Present Levels");
    expect(xml).toContain("He cut a circle without deviation.");
    expect(xml).not.toMatch(/\/Users\//);
  });

  it("puts the domain name in bold in front of the paragraph when a section mixes domains", async () => {
    const lib = starterLibrary();
    const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
    const dressing = lib.domains[2].tasks.find((t) => t.name === "Dressing")!;
    const ids = [cutting, dressing].map((t) => t.sentences.find((s) => s.sectionId === "sec_objective")!.id);
    const state = { ...emptyBuilderState(), taskIds: [cutting.id, dressing.id], sentenceIds: ids };
    const buf = await docxToBuffer(buildDocx(assemble(lib, state)));
    const { default: JSZip } = await import("jszip");
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:b\/>[\s\S]*?Fine Motor: /);
    expect(xml).toContain("Self Care: ");
  });

  it("names the file by date only", () => {
    expect(docxFileName(new Date(2026, 9, 13))).toBe("IEP-draft-2026-10-13.docx");
  });
});
