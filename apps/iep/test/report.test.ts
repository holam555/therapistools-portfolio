import { describe, expect, it } from "vitest";
import { otReportSections, OT_REPORT_TITLE } from "../src/report/ot-pack";
import { screenItemsFor } from "../src/report/ot-screen";
import { blanksIn, renderSection, sectionText } from "../src/report/render";
import { buildReportDocx, reportDocxBuffer } from "../src/report/report-docx";
import { buildSectionPrompt, needsPrompt } from "../src/report/report-prompt";
import { defaultSetup, withGrade } from "../src/report/setup";
import { GRADE_GROUPS, type ReportSetup } from "../src/report/types";
import { SPM_GRID, SPM_SCALES, spmKey, spmSummaryPhrase, type SpmResult } from "../src/report/spm";
import { cloneGrid, groupSentences, normalizeGrid, type GridDef } from "../src/report/grids";
import { joinList, parseBlank } from "../src/report/options";
import { fitToBlank, sampleSentences } from "../src/report/samples";

/** Every combination of the choices that change which sections and wording appear. */
function allSetups(): ReportSetup[] {
  const out: ReportSetup[] = [];
  for (const g of GRADE_GROUPS)
    for (const reportType of ["evaluation", "annual"] as const)
      for (const concerns of [true, false])
        for (const teacherAreas of [{ fine: true, gross: true, sensory: true }, { fine: false, gross: true, sensory: false }, { fine: false, gross: false, sensory: false }])
          for (const serviceType of ["direct", "indirect"] as const)
            for (const pronoun of ["he", "she"] as const) out.push({ ...withGrade(defaultSetup(), g.id), reportType, concerns, teacherAreas, serviceType, pronoun });
  return out;
}

const PRONOUN = /\b(he|him|his|she|her|hers|himself|herself)\b/i;

describe("OT report template", () => {
  it("renders every section with no leftover marks, placeholders or real names", () => {
    for (const setup of allSetups())
      for (const s of otReportSections(setup)) {
        const text = sectionText(s, setup.pronoun);
        expect(text, s.id).not.toMatch(/\{\{|\}\}/);
        expect(text, s.id).not.toMatch(/\bXX+\b/);
        for (const e of s.examples) expect(e, s.id).not.toMatch(/\bXX+\b|\{\{/);
      }
  });

  it("writes [STUDENT] once, at the start of each section, then pronouns", () => {
    for (const setup of allSetups())
      for (const s of otReportSections(setup)) {
        const text = sectionText(s, setup.pronoun).replace(/^[^\n]*\n/, ""); // drop the title line
        const count = (text.match(/\[STUDENT\]/g) ?? []).length;
        expect(count, `${s.id} uses [STUDENT] ${count} times`).toBeLessThanOrEqual(1);
        const pronounAt = text.search(PRONOUN);
        if (pronounAt >= 0 && s.id !== "spm2") {
          // SPM-2 scale definitions talk about "the child" in general, not this student.
          expect(text.indexOf("[STUDENT]"), `${s.id}: pronoun before [STUDENT]`).toBeGreaterThanOrEqual(0);
          expect(text.indexOf("[STUDENT]"), `${s.id}: pronoun before [STUDENT]`).toBeLessThan(pronounAt);
        }
      }
  });

  it("fills pronouns for she", () => {
    const setup = { ...defaultSetup(), pronoun: "she" as const };
    const screen = otReportSections(setup).find((s) => s.id === "screen")!;
    const text = sectionText(screen, "she");
    expect(text).toContain("She uses a [[grasp type]] pencil grasp.");
    expect(text).not.toContain("::");
    expect(text).not.toMatch(/\b(he|his|him)\b/);
  });

  it("shows the fine motor screen items for the chosen grade; 9–12 borrows 6–8", () => {
    const ids = (g: Parameters<typeof screenItemsFor>[0]) => screenItemsFor(g).map((i) => i.id);
    expect(ids("k1")).toContain("k1-design");
    expect(ids("g25")).toContain("g25-alphabet");
    expect(ids("g68")).toEqual(["g68-typing", "g68-handwriting", "g68-sensory"]);
    expect(ids("g912")).toEqual(ids("g68"));
    const k1 = withGrade(defaultSetup(), "k1");
    expect(k1.screenItems.every((id) => id.startsWith("k1-"))).toBe(true);
    const screen = otReportSections({ ...k1, screenItems: ["k1-grasp", "k1-tone"] }).find((s) => s.id === "screen")!;
    const text = sectionText(screen, "he");
    expect(text).toContain("Classroom Skills");
    expect(text).toContain("- Pencil grasp – He is [[handedness]] and uses a [[grasp type]] grasp");
    expect(text).toContain("Supporting Skills");
    expect(text).not.toContain("Design copy");
    expect(screen.examples.length).toBe(2);
  });

  it("does not change other assessments with grade", () => {
    const strip = (s: ReportSetup) => otReportSections(s).filter((x) => x.id !== "screen").map((x) => sectionText(x, "he"));
    expect(strip(withGrade(defaultSetup(), "k1"))).toEqual(strip(withGrade(defaultSetup(), "g68")));
  });

  it("builds the right sections for each report", () => {
    const ids = (p: Partial<ReportSetup>) => otReportSections({ ...defaultSetup(), ...p }).map((s) => s.id);
    expect(ids({ reportType: "evaluation" })).toEqual(["teacher", "screen", "beery", "spm2", "summary", "next-steps", "impact", "service", "goal"]);
    expect(ids({ reportType: "evaluation", concerns: false })).toEqual(["teacher", "screen", "beery", "spm2", "summary"]);
    expect(ids({ reportType: "annual", concerns: true })).toEqual(["plop-header", "teacher", "screen", "beery", "spm2", "next-steps", "impact", "service", "goal"]);
    expect(ids({ reportType: "annual", concerns: false })).toEqual(["plop-header", "teacher", "screen", "beery", "spm2", "ending"]);
    expect(ids({ reportType: "evaluation", concerns: false, assessments: { teacher: false, screen: true, beery: false, spm2: false } })).toEqual(["screen", "summary"]);
    const header = otReportSections({ ...defaultSetup(), reportType: "annual" })[0];
    expect(sectionText(header, "he")).toContain("[[Paste the record review and progress toward goals from last year's review, then update it]]");
  });

  it("lists the chosen number of objectives and standards under the goal", () => {
    const goal = otReportSections({ ...defaultSetup(), reportType: "annual", objectives: 4, goalAreas: ["selfcare"] }).find((s) => s.id === "goal")!;
    expect(goal.blocks.filter((b) => b.kind === "numbered").length).toBe(4);
    const text = sectionText(goal, "she");
    expect(text).toContain("Standards Based Life Skill Curriculum");
    expect(text).not.toContain("WLP.1.1");
  });

  it("writes the teacher checklist one area at a time", () => {
    const text = (areas: ReportSetup["teacherAreas"]) => sectionText(otReportSections({ ...defaultSetup(), teacherAreas: areas }).find((s) => s.id === "teacher")!, "she");
    const sensoryOnly = text({ fine: false, gross: false, sensory: true });
    expect(sensoryOnly).toContain("[STUDENT] demonstrates age and grade level fine motor skills 80-100%");
    expect(sensoryOnly).toContain("Gross motor skills are 80-100% as compared to peers");
    expect(sensoryOnly).toContain("noting that she [[sensory behaviors noted by the teacher]]");
    expect(sensoryOnly).toContain("accommodations such as [[accommodations in use]] are used.");
    const grossOnly = text({ fine: false, gross: true, sensory: false });
    expect(grossOnly).toContain("Gross motor concerns were also reported: she [[gross motor difficulties and how often]]");
    expect(grossOnly).toContain("The sensory area is listed as no concerns");
    expect(grossOnly).not.toContain("[[fine motor delays and how often]]");
    const none = text({ fine: false, gross: false, sensory: false });
    expect(none).toContain("Record review and analysis of the teacher rating checklist form");
    expect(none).not.toContain("accommodations");
  });

  it("writes a direct or an indirect service statement for any report with concerns", () => {
    const service = (p: Partial<ReportSetup>) => sectionText(otReportSections({ ...defaultSetup(), ...p }).find((s) => s.id === "service")!, "he");
    expect(service({ reportType: "evaluation" })).toContain("[[minutes and frequency]] of occupational therapy will be provided [[inside or outside the classroom]]");
    expect(service({ reportType: "annual", serviceType: "indirect" })).toContain("[STUDENT] will receive [[minutes and frequency]] of indirect Occupational Therapy services to support [[skill areas]]. These services will consist of collaborating with his special education team");
    expect(otReportSections({ ...defaultSetup(), reportType: "evaluation", concerns: false }).some((s) => s.id === "service")).toBe(false);
  });

  it("keeps the summary's no-concerns and with-concerns versions apart", () => {
    const none = sectionText(otReportSections({ ...defaultSetup(), concerns: false }).find((s) => s.id === "summary")!, "he");
    expect(none).toContain("there are no motor or sensory concerns");
    const some = sectionText(otReportSections({ ...defaultSetup(), concerns: true }).find((s) => s.id === "summary")!, "he");
    expect(some).toContain("Fine Motor:");
      });
});

describe("Word draft", () => {
  it("contains the report with yellow blanks and no template marks", async () => {
    const setup = { ...defaultSetup(), reportType: "annual" as const, concerns: true };
    const buf = await reportDocxBuffer(buildReportDocx(OT_REPORT_TITLE.annual, otReportSections(setup), "he"));
    const { default: JSZip } = await import("jszip");
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain("Occupational Therapy Annual Review");
    expect(xml).toContain("Impact of Disability Statement");
    expect(xml).toContain("Occupational Therapy in the school environment is a related service.");
    expect(xml).toMatch(/<w:highlight w:val="yellow"\/>/);
    expect(xml).toContain("[STUDENT]");
    expect(xml).not.toMatch(/\{\{|\}\}/);
  });
});

describe("section prompts", () => {
  const setup = { ...defaultSetup(), pronoun: "she" as const };
  const sections = otReportSections(setup);
  const ctx = { role: "occupational therapist", reportType: setup.reportType, grade: setup.grade, pronoun: setup.pronoun };

  it("only offers prompts for sections with blanks to fill", () => {
    const withPrompts = sections.filter((s) => needsPrompt(s, "she")).map((s) => s.id);
    expect(withPrompts).toEqual(["teacher", "screen", "summary", "next-steps", "impact", "service", "goal"]);
    expect(blanksIn(sections.find((s) => s.id === "beery")!, "she").length).toBeGreaterThan(0);
  });

  it("carries the frame, examples, rules, role and a place for notes", () => {
    const p = buildSectionPrompt(sections.find((s) => s.id === "screen")!, ctx);
    expect(p).toContain("school-based occupational therapist write one section of a student's IEP evaluation report");
    expect(p).toContain("grade 2–5");
    expect(p).toContain("=== FRAME ===\nINFORMAL FINE MOTOR SCREEN");
    expect(p).toContain("- Pencil grasp – She uses a [[grasp type]] pencil grasp.");
    expect(p).toContain("=== EXAMPLES (for style and tone only; never copy their details) ===");
    expect(p).toContain("Copy Alphabet & Numbers – He can copy numbers 1–10 legibly, reversing the 7.");
    expect(p).toContain("then she, her, hers");
    expect(p).toContain("Never invent scores");
    expect(p).toMatch(/=== MY ROUGH NOTES FOR THIS SECTION \(paste below this line; [^)]+\) ===\n\n\n=== END NOTES ===$/);
    expect(p).not.toMatch(/\{\{|\bXX\b/);
  });

  it("renders blank runs separately for highlighting", () => {
    const runs = renderSection(sections[0], "she")[0].runs;
    expect(runs.some((r) => r.blank && r.text.startsWith("[["))).toBe(true);
    expect(runs.filter((r) => !r.blank).every((r) => !r.text.includes("[["))).toBe(true);
  });
});


describe("fillable blanks", () => {
  it("reads list names from blanks and joins lists naturally", () => {
    expect(parseBlank("disability category::disability")).toEqual({ label: "disability category", list: "disability" });
    expect(parseBlank("score")).toEqual({ label: "score" });
    expect(parseBlank("odd::nolist")).toEqual({ label: "odd", list: "nolist" });
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b"])).toBe("a and b");
    expect(joinList(["a", "b", "c"])).toBe("a, b, and c");
  });

  it("puts filled values into the text, the Word draft and the prompt", async () => {
    const setup = { ...defaultSetup(), reportType: "annual" as const, concerns: true };
    const service = otReportSections(setup).find((s) => s.id === "service")!;
    const keys = renderSection(service, "he").flatMap((b) => b.runs.filter((r) => r.blank).map((r) => r.blank!));
    expect(keys.map((k) => k.list)).toEqual(["minutes", "location", "skillAreas"]);
    const values = { [keys[0].key]: "120 minutes monthly", [keys[1].key]: "outside the classroom", [keys[2].key]: "fine motor skills and sensory processing" };
    const text = sectionText(service, "he", values);
    expect(text).toContain("120 minutes monthly of occupational therapy will be provided outside the classroom to address fine motor skills and sensory processing.");
    expect(blanksIn(service, "he", values)).toEqual([]);
    expect(needsPrompt(service, "he", values)).toBe(false);
    expect(needsPrompt(service, "he")).toBe(true);
    const buf = await reportDocxBuffer(buildReportDocx("T", [service], "he", values));
    const { default: JSZip } = await import("jszip");
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain("120 minutes monthly");
    expect(xml).not.toMatch(/<w:highlight/);
  });

  it("keeps a filled value attached to its item when other items are unticked", () => {
    const setup = withGrade(defaultSetup(), "g25");
    const screen = otReportSections(setup).find((s) => s.id === "screen")!;
    const grasp = renderSection(screen, "he").find((b) => b.key === "g25-grasp")!;
    const key = grasp.runs.find((r) => r.blank)!.blank!.key;
    const values = { [key]: "tripod" };
    const fewer = otReportSections({ ...setup, screenItems: setup.screenItems.filter((id) => id !== "g25-dominance") }).find((s) => s.id === "screen")!;
    expect(sectionText(fewer, "he", values)).toContain("- Pencil grasp – He uses a tripod pencil grasp.");
  });

  it("offers sample sentences from the item's own examples, in the chosen pronoun", () => {
    const item = screenItemsFor("k1").find((i) => i.id === "k1-grasp")!;
    const she = sampleSentences(item.examples, "she");
    expect(she[0]).toBe("She is right handed and uses a quadrupod grasp on pencils and crayons.");
    expect(she).toContain("She pressed lightly, so her marks were faint and hard to read.");
    expect(she.join(" ")).not.toMatch(/\[STUDENT\]|\bhe\b|\bhis\b/i);
    expect(fitToBlank("He had good use of his stabilizer hand.", true)).toBe("He had good use of his stabilizer hand");
    expect(fitToBlank("He had good use of his stabilizer hand.", false)).toBe("He had good use of his stabilizer hand.");
  });
});

describe("SPM-2 scales", () => {
  const all = (r: SpmResult) => Object.fromEntries(SPM_SCALES.map((s) => [spmKey(s), r])) as Record<string, SpmResult>;
  it("fills the result lines once every scale is set, and feeds the summary", () => {
    const spm: Record<string, SpmResult> = { ...all("typical"), [spmKey("Vision")]: "severe", [spmKey("Touch")]: "severe", [spmKey("Planning and Ideas")]: "moderate" };
    const setup = { ...defaultSetup(), ratings: { spm2: spm } };
    const text = sectionText(otReportSections(setup).find((s) => s.id === "spm2")!, "he");
    expect(text).toContain("Typical Processing: Social Participation, Hearing, Taste and Smell, Body Awareness, Balance and Motion, and Sensory Total");
    expect(text).toContain("Moderate Difficulties: Planning and Ideas");
    expect(text).toContain("Severe Difficulties: Vision and Touch");
    const summary = sectionText(otReportSections(setup).find((s) => s.id === "summary")!, "he");
    expect(summary).toContain("sensorimotor skills are affected with Severe Difficulties for Vision and Touch and Moderate Difficulties for Planning and Ideas.");
    expect(spmSummaryPhrase(all("typical"))).toBe("within the typical range across all areas");
  });

  it("keeps blanks until every scale is set", () => {
    const setup = { ...defaultSetup(), ratings: { spm2: { [spmKey("Vision")]: "severe" } } };
    const text = sectionText(otReportSections(setup).find((s) => s.id === "spm2")!, "he");
    expect(text).toContain("Severe Difficulties: [[scales at this level, or none]]");
  });

  it("moves results saved under the scale name alone to the grid key", () => {
    expect(migrateSpmKeys({ Vision: "severe", "scales.Touch": "typical" })).toEqual({ "scales.Vision": "severe", "scales.Touch": "typical" });
  });
});

describe("editable rating grids", () => {
  it("writes checklist paragraphs from items, levels and sentence patterns", () => {
    const grid: GridDef = {
      id: "art", title: "Rate", layout: "byGroup", blank: "[[ratings]]",
      groups: [{ id: "art", label: "Art Room", rows: [{ id: "paint", label: "using a paintbrush" }, { id: "smock", label: "putting on a smock" }, { id: "aprons", label: "aprons", plural: true }] }],
      levels: [
        { value: "i", label: "Independent", sentence: "{Items} {was} done without help." },
        { value: "h", label: "With help", sentence: "Help was needed for {items}." },
      ],
    };
    expect(groupSentences(grid, grid.groups[0], { "art.paint": "h", "art.smock": "i" })).toBe("Putting on a smock was done without help. Help was needed for using a paintbrush.");
    expect(groupSentences(grid, grid.groups[0], { "art.paint": "i", "art.smock": "i" })).toBe("Using a paintbrush and putting on a smock were done without help.");
    expect(groupSentences(grid, grid.groups[0], { "art.aprons": "i" })).toBe("Aprons were done without help.");
    expect(groupSentences(grid, grid.groups[0], {})).toBeNull();
  });

  it("uses renamed SPM-2 levels and scales in the lines, the intro and the summary", () => {
    const grid = cloneGrid(SPM_GRID);
    grid.levels[2].label = "Definite Dysfunction";
    grid.groups[0].rows = [{ id: "Vision", label: "Vision" }, { id: "Touch", label: "Touch" }, { id: "Total", label: "Total", composite: true }];
    const o = emptyOverrides();
    o.grids.spm2 = grid;
    const setup = { ...defaultSetup(), ratings: { spm2: { [spmKey("Vision")]: "severe", [spmKey("Touch")]: "typical", [spmKey("Total")]: "moderate" } } };
    const sections = otReportSections(setup, o);
    const text = sectionText(sections.find((s) => s.id === "spm2")!, "he");
    expect(text).toContain("Subtests include: Vision, Touch.");
    expect(text).toContain("Typical Processing, Moderate Difficulties, or Definite Dysfunction");
    expect(text).toContain("Definite Dysfunction: Vision");
    expect(text).toContain("Moderate Difficulties: Total");
    expect(sectionText(sections.find((s) => s.id === "summary")!, "he")).toContain("affected with Definite Dysfunction for Vision and Moderate Difficulties for Total.");
  });

  it("keeps edited grids and titles through storage, dropping broken ones", () => {
    const grid = cloneGrid(SPM_GRID);
    grid.groups[0].rows.push({ id: "item1", label: "Smell" });
    const o = normalizeOverrides({ version: 1, grids: { spm2: grid, madeUp: grid, broken: { levels: [], groups: [] } }, titles: { spm2: " Sensory measure ", teacher: "" } });
    expect(o.grids.spm2.groups[0].rows.at(-1)).toEqual({ id: "item1", label: "Smell" });
    expect(o.grids).not.toHaveProperty("madeUp");
    expect(o.grids).not.toHaveProperty("broken");
    expect(o.titles).toEqual({ spm2: "Sensory measure" });
    // an unchanged copy is not an edit
    expect(normalizeOverrides({ version: 1, grids: { spm2: cloneGrid(SPM_GRID) } }).grids).toEqual({});
    expect(normalizeGrid({ levels: [{ value: "x" }], groups: [{ id: "g", rows: [{ id: "r" }] }] }, SPM_GRID)).toMatchObject({ levels: [{ value: "x", label: "x", sentence: "" }], groups: [{ id: "g", label: "", rows: [{ id: "r", label: "" }] }] });
    const sections = otReportSections(defaultSetup(), o);
    expect(sections.find((s) => s.id === "spm2")!.title).toBe("Sensory measure");
    expect(sections.find((s) => s.id === "teacher")!.title).toBe("Teacher Rating Checklist");
  });
});

import { applyBlockOverrides, emptyOverrides, fromEditable, listFor, normalizeOverrides, toEditable } from "../src/report/overrides";
import { migrateSpmKeys, migrateValueKeys } from "../src/report/setup";

describe("template edits", () => {
  it("round-trips wording between template marks and plain he/him/his text", () => {
    const original = "{{They}} uses {{their}} helper hand to [[how {{they}} stabilizes the paper]]. {{student}} likes it.";
    const editable = toEditable(original);
    expect(editable).toBe("He uses his helper hand to [[how he stabilizes the paper]]. [STUDENT] likes it.");
    expect(fromEditable(editable)).toBe(original);
    // An edited sentence still switches to she/her.
    const edited = fromEditable("He holds the paper with his left hand while [[task]].");
    expect(sectionText({ id: "x", title: "T", examples: [], blocks: [{ kind: "para", text: edited }] }, "she")).toContain("She holds the paper with her left hand while [[task]].");
  });

  it("lays wording, labels, samples and hidden paragraphs over the template", () => {
    const setup = withGrade(defaultSetup(), "g25");
    const o = emptyOverrides();
    o.blocks["screen/g25-grasp"] = { text: fromEditable("He holds the pencil with a [[grasp type::grasp]] grasp."), label: "Grasp", examples: ["He used a tripod grasp."] };
    o.blocks["screen/g25-dominance"] = { hidden: true };
    o.sectionExamples["teacher"] = ["The teacher reported no concerns."];
    const sections = otReportSections(setup, o);
    const screen = sections.find((s) => s.id === "screen")!;
    const text = sectionText(screen, "she");
    expect(text).toContain("- Grasp – She holds the pencil with a [[grasp type]] grasp.");
    expect(text).not.toContain("Hand dominance");
    expect(screen.blocks.find((b) => b.id === "g25-grasp")!.examples).toEqual(["He used a tripod grasp."]);
    expect(sections.find((s) => s.id === "teacher")!.examples).toEqual(["The teacher reported no concerns."]);
    // the edited blank keeps its dropdown
    const run = renderSection(screen, "she").find((b) => b.key === "g25-grasp")!.runs.find((r) => r.blank)!;
    expect(run.blank!.list).toBe("grasp");
    // without edits nothing changes
    expect(applyBlockOverrides(otReportSections(setup), emptyOverrides())).toEqual(otReportSections(setup));
  });

  it("keeps teacher-checklist versions apart when one is edited", () => {
    const o = emptyOverrides();
    o.blocks["teacher/teacher-concerns"] = { text: "Concerns were reported." };
    const withConcerns = otReportSections({ ...defaultSetup(), teacherAreas: { fine: true, gross: false, sensory: false } }, o).find((s) => s.id === "teacher")!;
    const without = otReportSections({ ...defaultSetup(), teacherAreas: { fine: false, gross: false, sensory: false } }, o).find((s) => s.id === "teacher")!;
    expect(sectionText(withConcerns, "he")).toContain("Concerns were reported.");
    expect(sectionText(without, "he")).toContain("Record review and analysis of the teacher rating checklist form");
  });

  it("adds the writer's own screen items and hides built-in ones per grade", () => {
    const o = emptyOverrides();
    o.screen.k1 = { hidden: ["k1-strength"], added: [{ id: "custom-1", label: "Keyboarding", group: "classroom", opener: "{{They}} [[typing]].", examples: [] }] };
    const setup = withGrade(defaultSetup(), "k1", o);
    expect(setup.screenItems).toContain("custom-1");
    expect(setup.screenItems).not.toContain("k1-strength");
    const text = sectionText(otReportSections(setup, o).find((s) => s.id === "screen")!, "she");
    expect(text).toContain("- Keyboarding – She [[typing]].");
    expect(text).not.toContain("Strength –");
    // other grades are untouched
    expect(withGrade(defaultSetup(), "g25", o).screenItems.some((id) => id.startsWith("custom"))).toBe(false);
  });

  it("uses edited dropdown choices and ignores unknown or broken data", () => {
    const o = normalizeOverrides({ version: 1, lists: { minutes: ["45 minutes monthly"], madeUp: ["x"] }, blocks: { "a/b": { text: 5, hidden: true } }, junk: 1 });
    expect(listFor("minutes", o)!.options).toEqual(["45 minutes monthly"]);
    expect(o.lists).not.toHaveProperty("madeUp");
    expect(o.blocks["a/b"]).toEqual({ hidden: true });
    expect(normalizeOverrides(null)).toEqual(emptyOverrides());
  });

  it("moves values saved by position to the block's id", () => {
    const setup = { ...defaultSetup(), teacherAreas: { fine: true, gross: false, sensory: false } };
    const migrated = migrateValueKeys({ "teacher/0/0": "general education teacher", "screen/g25-grasp/0": "tripod" }, otReportSections(setup));
    expect(migrated).toEqual({ "teacher/teacher-concerns/0": "general education teacher", "screen/g25-grasp/0": "tripod" });
  });
});

import { scanReportText } from "../src/report/privacy-words";
import { starterLibrary } from "../src/model/defaults";

describe("privacy check while editing the template", () => {
  const lib = starterLibrary();
  it("does not flag the template's own words, but still flags a new name", () => {
    const typing = screenItemsFor("g68").find((i) => i.id === "g68-typing")!;
    for (const ex of typing.examples) expect(scanReportText(ex, lib)).toEqual([]);
    const flagged = scanReportText("He and Ms. Rivera reported that he types with Shift and Backspace.", lib).map((w) => w.text);
    expect(flagged).toContain("Rivera");
    expect(flagged.filter((w) => ["He", "Shift", "Backspace"].includes(w))).toEqual([]);
  });
});
