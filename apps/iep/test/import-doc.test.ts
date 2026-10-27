// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel } from "docx";
import { itemsFromText, readDocx, runsText } from "../src/report/docx-read";
import { draftFromItems, packFromDraft, toTemplateText } from "../src/report/import-doc";
import { packSections } from "../src/report/pack";
import { sectionText } from "../src/report/render";
import { defaultSetup } from "../src/report/setup";

/** A small district-style form, like the owner's reference: headings, red instructions, highlighted choices, score and rating tables. */
async function formDocx(): Promise<Uint8Array> {
  const red = (text: string) => new TextRun({ text, color: "FF0000" });
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: "SPEECH AND LANGUAGE EVALUATION REPORT", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: "Name: ", bold: true }), new TextRun("")] }),
          new Paragraph({ children: [new TextRun({ text: "Date of Birth: ", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: "REFERRAL INFORMATION", bold: true })] }),
          new Paragraph({
            children: [new TextRun("This evaluation is taking place as part of "), red("(Blank)"), new TextRun("'s "), new TextRun({ text: "initial evaluation / triennial review", highlight: "green" }), new TextRun(" to determine his/her eligibility for services.")],
          }),
          new Paragraph({ children: [red("(Describe why the student was referred.)")] }),
          new Paragraph({ children: [new TextRun({ text: "Parent Report:", bold: true })] }),
          new Paragraph({ children: [new TextRun("The parent was contacted on "), red("(INSERT DATE)"), new TextRun(". Parent/caregiver indicated the following concerns: "), red("(add parent concerns)")] }),
          new Paragraph({ children: [new TextRun({ text: "Clinical Evaluation of Language Fundamentals (CELF-5)", bold: true })] }),
          new Paragraph({ children: [new TextRun("The CELF-5 measures language skills. (Blank) achieved the following results:")] }),
          new Table({
            rows: [
              new TableRow({ children: [cell("Subtest", true), cell("Scaled Score", true), cell("Percentile", true)] }),
              new TableRow({ children: [cell("Sentence Comprehension"), cell(""), cell("")] }),
              new TableRow({ children: [cell("Word Structure"), cell(""), cell("")] }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "ORAL MOTOR EXAMINATION", bold: true })] }),
          new Table({
            rows: [
              new TableRow({ children: [cell("Structure", true), cell("Functional", true), cell("Inconsistent", true), cell("Concern", true)] }),
              new TableRow({ children: [cell("Lips", true), cell(""), cell(""), cell("")] }),
              new TableRow({ children: [cell("Closure"), cell(""), cell(""), cell("")] }),
              new TableRow({ children: [cell("Rounding"), cell(""), cell(""), cell("")] }),
              new TableRow({ children: [cell("Tongue", true), cell(""), cell(""), cell("")] }),
              new TableRow({ children: [cell("Elevation"), cell(""), cell(""), cell("")] }),
            ],
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Summary" }),
          new Paragraph({ children: [new TextRun("Based on the results, (Blank) [performance description] and he/she is eligible for speech services.")] }),
          new Paragraph({ children: [new TextRun({ text: "Student was tired.", strike: true }), new TextRun(" Recommendations: ")] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

describe("reading a Word file", () => {
  it("keeps bold, colour, highlight, headings, tables and drops struck text", async () => {
    const items = await readDocx(await formDocx());
    expect(items[0]).toMatchObject({ kind: "para", runs: [{ text: "SPEECH AND LANGUAGE EVALUATION REPORT", bold: true }] });
    const referral = items.find((i) => i.kind === "para" && runsText(i.runs).startsWith("This evaluation"))!;
    expect(referral.kind === "para" && referral.runs.map((r) => [r.text, r.color ?? r.highlight ?? ""])).toEqual([
      ["This evaluation is taking place as part of ", ""],
      ["(Blank)", "FF0000"],
      ["'s ", ""],
      ["initial evaluation / triennial review", "green"],
      [" to determine his/her eligibility for services.", ""],
    ]);
    const tables = items.filter((i) => i.kind === "table");
    expect(tables.length).toBe(2);
    expect(tables[0].kind === "table" && tables[0].rows.map((r) => r.map(runsText))).toEqual([["Subtest", "Scaled Score", "Percentile"], ["Sentence Comprehension", "", ""], ["Word Structure", "", ""]]);
    const summary = items.find((i) => i.kind === "para" && i.heading === 1)!;
    expect(summary.kind === "para" && runsText(summary.runs)).toBe("Summary");
    const last = items.at(-1)!;
    expect(last.kind === "para" && runsText(last.runs)).toBe(" Recommendations: ");
  });

  it("refuses files that are not Word documents", async () => {
    await expect(readDocx(new TextEncoder().encode("hello"))).rejects.toThrow(/Word document/);
  });
});

describe("drafting a template from a form", () => {
  it("finds sections, assessments, blanks, choices, hints and rating tables, and leaves identifying lines out", async () => {
    const draft = draftFromItems(await readDocx(await formDocx()));
    expect(draft.sections.map((s) => [s.title, s.role])).toEqual([
      ["Speech and Language Evaluation Report", "out"],
      ["Referral Information", "before"],
      ["Clinical Evaluation of Language Fundamentals (Celf-5)", "assessment"],
      ["Oral Motor Examination", "assessment"],
      ["Summary", "after"],
    ]);
    expect(draft.notes.filter((n) => n.kind === "left-out").map((n) => n.text)).toEqual(["Name", "Date of Birth"]);

    const referral = draft.sections[1];
    const intro = referral.blocks[0];
    expect(intro.kind === "para" && intro.text).toBe("This evaluation is taking place as part of {{student}}'s [[initial evaluation or triennial review::initialEvaluation]] to determine {{their}} eligibility for services.");
    expect(draft.lists.initialEvaluation.options).toEqual(["initial evaluation", "triennial review"]);
    expect(referral.notesHint).toBe("Describe why the student was referred.");
    expect(referral.blocks[1]).toMatchObject({ kind: "subheading", text: "Parent Report" });
    const parent = referral.blocks[2];
    expect(parent.kind === "para" && parent.text).toBe("The parent was contacted on [[date]]. Parent/caregiver indicated the following concerns: [[add parent concerns]]");

    const celf = draft.sections[2];
    expect(celf.blocks.map((b) => (b.kind === "grid" ? "grid" : `${"label" in b && b.label ? b.label + ": " : ""}${b.text}`))).toEqual([
      "The CELF-5 measures language skills. {{student}} achieved the following results:",
      "Sentence Comprehension: Scaled Score: [[scaled score]]. Percentile: [[percentile]].",
      "Word Structure: Scaled Score: [[scaled score]]. Percentile: [[percentile]].",
    ]);

    const oral = draft.sections[3];
    expect(oral.grid!.levels.map((l) => [l.label, !!l.concern])).toEqual([["Functional", false], ["Inconsistent", true], ["Concern", true]]);
    expect(oral.grid!.groups.map((g) => [g.label, g.rows.map((r) => r.label)])).toEqual([["Lips", ["closure", "rounding"]], ["Tongue", ["elevation"]]]);

    const summary = draft.sections[4];
    expect(summary.blocks[0].kind === "para" && summary.blocks[0].text).toBe("Based on the results, {{student}} [[performance description]] and {{they}} is eligible for speech services.");
    expect(summary.blocks[1]).toMatchObject({ kind: "subheading", text: "Recommendations" });

    const pack = packFromDraft(draft, "Speech-language pathology");
    expect(pack.assessments.map((a) => [a.id, a.label, !!a.grid])).toEqual([["a-section3", "Clinical Evaluation of Language Fundamentals (Celf-5)", false], ["a-section4", "Oral Motor Examination", true]]);
    expect(pack.sections.map((s) => [s.id, s.place])).toEqual([["section2", "before"], ["section5", "after"]]);
    const text = packSections(pack, { ...defaultSetup(), pronoun: "she", ratings: { "grid-section4": { "g1.r1": "l3", "g1.r2": "l1", "g2.r1": "l1" } } }).map((s) => sectionText(s, "she")).join("\n");
    expect(text).toContain("[STUDENT]'s [[initial evaluation or triennial review]] to determine her eligibility");
    expect(text).toContain("Concern: closure");
    expect(text).toContain("Functional: rounding and elevation");
    expect(text).not.toMatch(/\{\{|Name:|Date of Birth/);
  });

  it("reads pasted text with tab-separated table rows", () => {
    const items = itemsFromText(["BACKGROUND", "Student: ", "XX was referred by his/her teacher.", "- Concern one", "Item\tTypical\tConcern", "Voice\t\t", "Fluency\t\t", "SUMMARY", "Overall, XX did well."].join("\n"));
    const draft = draftFromItems(items);
    expect(draft.sections.map((s) => [s.title, s.role, s.blocks.length])).toEqual([["Background", "assessment", 3], ["Summary", "after", 1]]);
    expect(draft.sections[0].blocks[0]).toMatchObject({ kind: "para", text: "{{student}} was referred by {{their}} teacher." });
    expect(draft.sections[0].blocks[1]).toMatchObject({ kind: "bullet", text: "Concern one" });
    expect(draft.sections[0].grid!.groups[0].rows.map((r) => r.label)).toEqual(["voice", "fluency"]);
    expect(draft.notes[0]).toEqual({ kind: "left-out", text: "Student" });
  });

  it("turns a finished report's details into blanks and keeps the sentence as a sample", () => {
    const items = itemsFromText(["RESULTS", "Jordan scored in the 12th percentile with a standard score of 82. Jordan is 7 years, 3 months old and she enjoyed the tasks."].join("\n"));
    const draft = draftFromItems(items, { finishedReport: true, studentName: "Jordan Lee" });
    const b = draft.sections[0].blocks[0];
    expect(b.kind === "para" && b.text).toBe("{{student}} scored in the [[percentile]] percentile with a standard score of [[standard score]]. {{student}} is [[age]] and {{they}} enjoyed the tasks.");
    expect(b.kind === "para" && b.examples).toEqual(["[STUDENT] scored in the 12th percentile with a standard score of 82. [STUDENT] is 7 years, 3 months old and he enjoyed the tasks."]);
    expect(JSON.stringify(draft)).not.toContain("Jordan");
  });

  it("converts the marks a district form uses", () => {
    expect(toTemplateText("(Blank)'s teacher said he/she uses his/her left hand; [student] likes [the task].")).toBe("{{student}}'s teacher said {{they}} uses {{their}} left hand; {{student}} likes [[the task]].");
    expect(toTemplateText("Scores: ______ and (insert date) and (Describe the setting)")).toBe("Scores: [[fill in]] and [[insert date]] and [[describe the setting]]");
  });
});
