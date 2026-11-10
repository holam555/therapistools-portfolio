import { describe, expect, it, vi } from "vitest";
import { starterLibrary } from "../src/model/defaults";
import { cloneGrid, groupSentences, normalizeGrid, ratingKey, type GridDef } from "../src/report/grids";
import { joinList, parseBlank } from "../src/report/options";
import { conditionHolds, normalizePack, packGrids, packSections, type TemplatePack } from "../src/report/pack";
import { premadePack } from "../src/report/premade";
import { scanReportText } from "../src/report/privacy-words";
import { blanksIn, fillPattern, fromEditable, renderSection, sectionText, toEditable } from "../src/report/render";
import { buildReportDocx, reportDocxBuffer } from "../src/report/report-docx";
import { buildSectionPrompt, needsPrompt } from "../src/report/report-prompt";
import { blankSuggestions, fitToBlank, liftFills, relevantSentences, sampleSentences, wordingPattern } from "../src/report/samples";
import { defaultSetup, loadSetup, migrateSpmKeys, migrateValueKeys } from "../src/report/setup";
import type { ReportSetup } from "../src/report/types";

// The ready-made OT template, as a report. The generic checks every ready-made
// pack must pass are in premade.test.ts; these pin what the OT pack does with
// the setup choices: assessments done, tick boxes, ratings, services, objectives.

const pack = premadePack("ot");
const SPM_SCALES = ["Social Participation", "Vision", "Hearing", "Touch", "Taste and Smell", "Body Awareness", "Balance and Motion", "Planning and Ideas", "Sensory Total"];
const spmKey = (scale: string) => ratingKey("scales", scale);
/** A setup with every tick box for the grade ticked, as the builder does when a template is chosen. */
const allTicked = (grade: ReportSetup["grade"] = "g25"): ReportSetup => {
  const s = { ...defaultSetup(), grade };
  const screen = pack.assessments.find((a) => a.id === "screen")!;
  const ids = screen.sections.filter((x) => x.when?.grades?.includes(grade)).flatMap((x) => x.blocks.flatMap((b) => (b.kind !== "grid" && b.optional && b.id ? [b.id] : [])));
  return { ...s, screenItems: ids };
};
const sections = (p: Partial<ReportSetup> = {}) => packSections(pack, { ...allTicked(), ...p });
const find = (id: string, p: Partial<ReportSetup> = {}) => sections(p).find((s) => s.id === id)!;

describe("OT report template", () => {
  it("builds the right sections for each report", () => {
    const ids = (p: Partial<ReportSetup>) => sections(p).map((s) => s.id);
    expect(ids({ reportType: "evaluation" })).toEqual(["teacher", "screen-g25", "beery", "spm2", "summary", "next-steps", "impact", "service", "goal"]);
    expect(ids({ reportType: "evaluation", concerns: false })).toEqual(["teacher", "screen-g25", "beery", "spm2", "summary-none"]);
    expect(ids({ reportType: "annual", concerns: true })).toEqual(["present-levels", "teacher", "screen-g25", "beery", "spm2", "next-steps", "impact", "service", "goal"]);
    expect(ids({ reportType: "annual", concerns: false })).toEqual(["present-levels", "teacher", "screen-g25", "beery", "spm2", "ending"]);
    expect(ids({ reportType: "evaluation", concerns: false, assessments: { teacher: false, beery: false, spm2: false } })).toEqual(["screen-g25", "summary-none"]);
    expect(ids({ grade: "k1" })).toContain("screen-k1");
    expect(ids({ grade: "g68" })).toContain("screen-older");
    expect(ids({ grade: "g912" })).toContain("screen-older");
  });

  it("keeps the section headings a school OT report carries", () => {
    const titles = sections({ reportType: "annual" }).map((s) => s.title);
    expect(titles).toEqual([
      "Present Level of Performance",
      "Teacher Rating Checklist",
      "Informal Fine Motor Screen",
      "Beery-Buktenica Developmental Test of Visual-Motor Integration",
      "Sensory Processing Measure-2: Child School Form",
      "Next Steps",
      "Impact of Disability Statement",
      "Service Delivery Statement",
      "Motor Goal",
    ]);
    expect(find("summary").title).toBe("Evaluation Summary");
    expect(find("summary-none", { concerns: false }).title).toBe("Evaluation Summary");
    expect(find("ending", { reportType: "annual", concerns: false }).title).toBe("Ending");
  });

  it("fills pronouns for she and leaves no list names in the text", () => {
    const text = sectionText(find("screen-g25", { pronoun: "she" }), "she");
    expect(text).toContain("She used a [[handedness]] [[grasp type]] grasp");
    expect(text).not.toContain("::");
    expect(text).not.toMatch(/\b(he|his|him)\b/);
  });

  it("shows only the ticked screen items and drops a subheading whose items are all unticked", () => {
    const k1 = allTicked("k1");
    expect(k1.screenItems.every((id) => id.startsWith("k1-"))).toBe(true);
    const text = sectionText(packSections(pack, { ...k1, screenItems: ["k1-name", "k1-fasteners"] }).find((s) => s.id === "screen-k1")!, "he");
    expect(text).toContain("Writing and drawing");
    expect(text).toContain("- Name writing – He wrote his first name [[from memory or from a model]]");
    expect(text).toContain("Hands and posture");
    expect(text).toContain("- Fasteners – He [[managed or needed help with]] a zipper");
    expect(text).not.toContain("Scissors and tools");
    expect(text).not.toContain("Prewriting strokes");
    expect(sectionText(packSections(pack, { ...k1, screenItems: [] }).find((s) => s.id === "screen-k1")!, "he")).not.toContain("–");
  });

  it("does not change other assessments with grade", () => {
    const strip = (g: ReportSetup["grade"]) => packSections(pack, allTicked(g)).filter((x) => !x.id.startsWith("screen")).map((x) => sectionText(x, "he"));
    expect(strip("k1")).toEqual(strip("g68"));
  });

  it("lists the chosen number of objectives and standards under the goal", () => {
    const goal = find("goal", { reportType: "annual", objectives: 4, goalAreas: ["selfcare"] });
    expect(goal.blocks.filter((b) => b.kind === "numbered").length).toBe(4);
    const text = sectionText(goal, "she");
    expect(text).toContain("by meeting the 4 objectives below.");
    expect(text).toContain("4. She will [[the step toward the goal]] in [[percent]]% of opportunities.");
    expect(text).toContain("Independence: [[the life-skills or health standard this goal supports, with its code]]");
    expect(text).not.toContain("Writing:");
    expect(goal.blocks[0]).toMatchObject({ generated: true, slots: { count: "4" } });
    expect(sectionText(find("goal", { goalAreas: [] }), "he")).not.toContain("Related Standards");
  });

  it("writes a direct or an indirect service statement for any report with concerns", () => {
    const service = (p: Partial<ReportSetup>) => sectionText(find("service", p), "he");
    expect(service({ reportType: "evaluation" })).toContain("Services will be direct: the occupational therapist will work with him on [[what the sessions will target]]");
    expect(service({ reportType: "evaluation" })).not.toContain("indirect");
    const indirect = service({ reportType: "annual", serviceType: "indirect" });
    expect(indirect).toContain("These services will be indirect, to support [[what they support, such as accommodations or strategies]]");
    expect(indirect).toContain("collaborating with his special education team and general education teachers, or working one to one with the occupational therapist");
    expect(indirect).not.toContain("Services will be direct");
    expect(find("service", { reportType: "annual", serviceType: "indirect" }).examples.some((e) => e.includes("20 minutes semesterly") && e.includes("will be indirect"))).toBe(true);
    expect(sections({ reportType: "evaluation", concerns: false }).some((s) => s.id === "service")).toBe(false);
  });

  it("writes the teacher checklist from the ratings and feeds the summary", () => {
    const grid = packGrids(pack).teacher;
    const ratings: Record<string, string> = {};
    for (const g of grid.groups) for (const r of g.rows) ratings[ratingKey(g.id, r.id)] = "typical";
    ratings["written.letters"] = "often";
    ratings["written.copying"] = "some";
    ratings["tools.keyboard"] = "na";
    const text = sectionText(find("teacher", { ratings: { teacher: ratings } }), "he");
    expect(text).toContain("Written work: Sizing and spacing, finishing written work in the time given, and pencil pressure and grip were rated as typical for the class. Difficulty with copying from the board or a book was noted some of the time. Forming letters and numbers was rated as a frequent difficulty.");
    expect(text).toContain("Classroom tools: Using scissors, coloring and drawing, gluing and folding, and using a ruler were rated as typical for the class.");
    expect(text).not.toContain("keyboard and mouse use");
    const summary = sectionText(find("summary", { ratings: { teacher: ratings } }), "he");
    expect(summary).toContain("On the teacher checklist, his classroom performance was affected with Frequent difficulty for forming letters and numbers and Some difficulty for copying from the board or a book.");
    expect(sectionText(find("teacher"), "he")).toContain("Written work: [[ratings for this group]]");
    expect(sectionText(find("summary", { assessments: { teacher: false } }), "he")).not.toContain("On the teacher checklist");
  });

  it("keeps the summary's no-concerns and with-concerns versions apart", () => {
    const none = sectionText(find("summary-none", { concerns: false }), "he");
    expect(none).toContain("within the range expected for his age and grade");
    expect(none).toContain("Occupational therapy is not recommended at this time.");
    const some = sectionText(find("summary"), "he");
    expect(some).toContain("[STUDENT] has difficulty with [[areas of need]]");
    expect(some).toContain("Strengths include");
  });
});

describe("SPM-2 scales", () => {
  const all = (r: string) => Object.fromEntries(SPM_SCALES.map((s) => [spmKey(s), r]));
  it("fills the result lines once every scale is set, and feeds the summary", () => {
    const spm = { ...all("typical"), [spmKey("Vision")]: "severe", [spmKey("Touch")]: "severe", [spmKey("Planning and Ideas")]: "moderate" };
    const text = sectionText(find("spm2", { ratings: { spm2: spm } }), "he");
    expect(text).toContain("Typical Processing: Social Participation, Hearing, Taste and Smell, Body Awareness, Balance and Motion, and Sensory Total");
    expect(text).toContain("Moderate Difficulties: Planning and Ideas");
    expect(text).toContain("Severe Difficulties: Vision and Touch");
    const summary = sectionText(find("summary", { ratings: { spm2: spm } }), "he");
    expect(summary).toContain("On the SPM-2, his sensory processing at school was affected with Severe Difficulties for Vision and Touch and Moderate Difficulties for Planning and Ideas.");
    expect(sectionText(find("summary", { ratings: { spm2: all("typical") } }), "he")).toContain("was within the typical range on every scale.");
    expect(sectionText(find("summary", { assessments: { spm2: false } }), "he")).not.toContain("On the SPM-2");
  });

  it("keeps blanks until every scale is set", () => {
    const text = sectionText(find("spm2", { ratings: { spm2: { [spmKey("Vision")]: "severe" } } }), "he");
    expect(text).toContain("Severe Difficulties: [[scales in this range, or none]]");
    expect(sectionText(find("summary", { ratings: { spm2: { [spmKey("Vision")]: "severe" } } }), "he")).toContain("was [[results by scale]].");
  });

  it("moves results saved under the scale name alone to the grid key", () => {
    expect(migrateSpmKeys({ Vision: "severe", "scales.Touch": "typical" })).toEqual({ "scales.Vision": "severe", "scales.Touch": "typical" });
  });
});

describe("Word draft", () => {
  it("contains the report with yellow blanks and no template marks", async () => {
    const buf = await reportDocxBuffer(buildReportDocx(pack.titles.annual, sections({ reportType: "annual", concerns: true }), "he"));
    const { default: JSZip } = await import("jszip");
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain("Occupational Therapy Annual Review");
    expect(xml).toContain("Impact of Disability Statement");
    expect(xml).toContain("School-based occupational therapy supports a student");
    expect(xml).toMatch(/<w:highlight w:val="yellow"\/>/);
    expect(xml).toContain("[STUDENT]");
    expect(xml).not.toMatch(/\{\{|\}\}/);
  });
});

describe("section prompts", () => {
  const setup = { ...allTicked(), pronoun: "she" as const };
  const built = packSections(pack, setup);
  const ctx = { role: "occupational therapist", reportType: setup.reportType, grade: setup.grade, pronoun: setup.pronoun };

  it("offers prompts for every section with blanks to fill", () => {
    const withPrompts = built.filter((s) => needsPrompt(s, "she")).map((s) => s.id);
    expect(withPrompts).toEqual(["teacher", "screen-g25", "beery", "spm2", "summary", "next-steps", "impact", "service", "goal"]);
    expect(blanksIn(built.find((s) => s.id === "beery")!, "she").length).toBeGreaterThan(0);
  });

  it("carries the frame, examples, rules, role and a place for notes", () => {
    const p = buildSectionPrompt(built.find((s) => s.id === "screen-g25")!, ctx);
    expect(p).toContain("school-based occupational therapist write one section of a student's IEP evaluation report");
    expect(p).toContain("grade 2–5");
    expect(p).toContain("=== FRAME ===\nINFORMAL FINE MOTOR SCREEN");
    expect(p).toContain("- Grasp and pressure – She used a [[handedness]] [[grasp type]] grasp");
    expect(p).toContain("=== EXAMPLES (for style and tone only; never copy their details) ===");
    expect(p).toContain("She used a left-handed thumb wrap grasp and pressed too hard.");
    expect(p).toContain("then she, her, hers");
    expect(p).toContain("Never invent scores");
    expect(p).toMatch(/=== MY ROUGH NOTES FOR THIS SECTION \(paste below this line; [^)]+\) ===\n\n\n=== END NOTES ===$/);
    expect(p).not.toMatch(/\{\{|\bXX\b/);
  });

  it("renders blank runs separately for highlighting", () => {
    const runs = renderSection(built[0], "she")[0].runs;
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
    const service = find("service", { reportType: "annual", concerns: true });
    const keys = renderSection(service, "he").flatMap((b) => b.runs.filter((r) => r.blank).map((r) => r.blank!));
    expect(keys.map((k) => k.list)).toEqual(["minutes", "location", "skillAreas", undefined, "accommodations"]);
    for (const k of keys) expect(pack.lists[k.list ?? "minutes"]).toBeDefined();
    const values = { [keys[0].key]: "120 minutes monthly", [keys[1].key]: "outside the classroom", [keys[2].key]: "fine motor skills and sensory processing", [keys[3].key]: "letter formation", [keys[4].key]: "a slant board" };
    const text = sectionText(service, "he", values);
    expect(text).toContain("[STUDENT] will receive occupational therapy as a related service for 120 minutes monthly, outside the classroom, to address fine motor skills and sensory processing.");
    expect(text).toContain("Accommodations include a slant board.");
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
    const setup = allTicked("g25");
    const screen = packSections(pack, setup).find((s) => s.id === "screen-g25")!;
    const grasp = renderSection(screen, "he").find((b) => b.key === "g25-grasp")!;
    const key = grasp.runs.find((r) => r.blank)!.blank!.key;
    const values = { [key]: "tripod" };
    const fewer = packSections(pack, { ...setup, screenItems: setup.screenItems.filter((id) => id !== "g25-near") }).find((s) => s.id === "screen-g25")!;
    expect(sectionText(fewer, "he", values)).toContain("- Grasp and pressure – He used a tripod [[grasp type]] grasp");
  });

  it("offers sample sentences from the section's examples, in the chosen pronoun", () => {
    const screen = find("screen-k1", { grade: "k1" });
    const she = sampleSentences(screen.examples, "she");
    expect(she[0]).toBe("An informal fine motor screen was completed with her to see how she manages the hand skills expected in her grade.");
    expect(she).toContain("She held the crayon with a right-handed fisted grasp and switched hands twice.");
    expect(she.join(" ")).not.toMatch(/\[STUDENT\]|\bhe\b|\bhis\b/i);
    expect(fitToBlank("He had good use of his stabilizer hand.", true)).toBe("He had good use of his stabilizer hand");
    expect(fitToBlank("He had good use of his stabilizer hand.", false)).toBe("He had good use of his stabilizer hand.");
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

  it("uses renamed SPM-2 levels and scales in the lines and the summary", () => {
    const grid = cloneGrid(packGrids(pack).spm2);
    grid.levels[2].label = "Definite Dysfunction";
    grid.groups[0].rows = [{ id: "Vision", label: "Vision" }, { id: "Touch", label: "Touch" }, { id: "Total", label: "Total", composite: true }];
    const edited: TemplatePack = { ...pack, assessments: pack.assessments.map((a) => (a.id === "spm2" ? { ...a, grid } : a)) };
    const setup = { ...allTicked(), ratings: { spm2: { [spmKey("Vision")]: "severe", [spmKey("Touch")]: "typical", [spmKey("Total")]: "moderate" } } };
    const built = packSections(edited, setup);
    const text = sectionText(built.find((s) => s.id === "spm2")!, "he");
    expect(text).toContain("Definite Dysfunction: Vision");
    expect(text).toContain("Moderate Difficulties: Total");
    expect(sectionText(built.find((s) => s.id === "summary")!, "he")).toContain("affected with Definite Dysfunction for Vision and Moderate Difficulties for Total.");
    expect(normalizeGrid({ levels: [{ value: "x" }], groups: [{ id: "g", rows: [{ id: "r" }] }] }, grid)).toMatchObject({ levels: [{ value: "x", label: "x", sentence: "" }], groups: [{ id: "g", label: "", rows: [{ id: "r", label: "" }] }] });
  });
});

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

  it("keeps the wording around what the app fills into a generated line", () => {
    const edited: TemplatePack = {
      ...pack,
      sections: pack.sections.map((s) =>
        s.id !== "goal" ? s : { ...s, blocks: s.blocks.map((b) => (b.id === "frame" ? { ...b, text: "{{student}} will meet [[number met::objectivesMet]] of these {count} objectives:" } : b)) },
      ),
    };
    const goal = packSections(edited, { ...allTicked(), reportType: "annual", objectives: 4, pronoun: "she" }).find((s) => s.id === "goal")!;
    expect(sectionText(goal, "she")).toContain("[STUDENT] will meet [[number met]] of these 4 objectives:");
    expect(goal.blocks[0].pattern).toBe("{{student}} will meet [[number met::objectivesMet]] of these {count} objectives:");
    expect(goal.blocks[0].slots).toEqual({ count: "4" });
    expect(fillPattern("{count} of {unknown}", { count: "2" })).toBe("2 of {unknown}");
  });

  it("moves values saved by position to the block's id", () => {
    const migrated = migrateValueKeys({ "teacher/0/0": "general education teacher", "screen-g25/g25-grasp/0": "tripod" }, sections());
    expect(migrated).toEqual({ "teacher/intro/0": "general education teacher", "screen-g25/g25-grasp/0": "tripod" });
  });
});

describe("privacy check while editing the template", () => {
  const lib = starterLibrary();
  it("does not flag the template's own words, but still flags a new name", () => {
    for (const s of sections()) for (const ex of s.examples) expect(scanReportText(ex, lib), s.id).toEqual([]);
    const flagged = scanReportText("He and Ms. Rivera reported that he scored Below Average on Visual Perception.", lib).map((w) => w.text);
    expect(flagged).toContain("Rivera");
    expect(flagged.filter((w) => ["He", "Below", "Average", "Visual", "Perception"].includes(w))).toEqual([]);
  });
});

describe("what the blank picker offers", () => {
  const beery = "Standard score [[score]], percentile rank [[percentile]], [[descriptor::beeryDescriptor]]. {{They}} copied the forms [[how: which forms were lost, line quality, rotations]].";
  const example =
    "The Beery VMI asks [STUDENT] to copy forms. Visual-Motor Integration: standard score 82, percentile rank 12, Below Average. He copied the forms with wobbly lines and lost the diagonal forms, drawing the triangle with rounded corners. Visual Perception: standard score 104, percentile rank 61, Average, with no errors.";

  it("lifts what an example put where this blank sits when the example follows the wording", () => {
    expect(liftFills(beery, 0, [example], "she")).toEqual(["82"]);
    expect(liftFills(beery, 1, [example], "she")).toEqual(["12"]);
    expect(liftFills(beery, 2, [example], "she")).toEqual(["Below Average"]);
    expect(liftFills(beery, 3, [example], "she")).toEqual(["with wobbly lines and lost the diagonal forms, drawing the triangle with rounded corners"]);
    const grasp = "{{They}} used a [[handedness::handedness]] [[grasp type::grasp]] grasp and pressed [[too hard, too lightly or evenly]].";
    const screen = "She copied a sentence in two minutes. She used a left-handed thumb wrap grasp and pressed too hard. She sat slumped at the desk.";
    expect(liftFills(grasp, 0, [screen], "he")).toEqual(["left-handed"]);
    expect(liftFills(grasp, 1, [screen], "he")).toEqual(["thumb wrap"]);
    expect(liftFills(grasp, 2, [screen], "he")).toEqual(["too hard"]);
    // Pronouns inside a lifted value follow the chosen he/she.
    const posture = "At the table {{they}} sat [[how]], and {{their}} helper hand [[held the paper or stayed in the lap]].";
    expect(liftFills(posture, 1, ["At the table he sat leaning on an elbow, and his helper hand stayed in his lap until reminded."], "she")).toEqual(["stayed in her lap until reminded"]);
  });

  it("does not guess from wording with too little fixed text, or from examples that do not follow it", () => {
    expect(wordingPattern("[[Summary of the findings]]")).toBeNull();
    expect(wordingPattern("{{They}} [[did what]].")).toBeNull();
    expect(liftFills(beery, 0, ["He worked carefully and asked to erase several forms."], "he")).toEqual([]);
  });

  it("ranks sentences by the words they share with the blank and its line, and offers everything for a blank-only paragraph", () => {
    const all = sampleSentences([example, "During testing he worked carefully and asked to erase several forms."], "he");
    const related = relevantSentences(all, "During testing {{they}} [[attention, effort and pace]].", 0, "attention, effort and pace");
    expect(related[0]).toBe("During testing he worked carefully and asked to erase several forms.");
    expect(relevantSentences(all, "[[Summary]]", 0, "Summary")).toEqual(all.slice(0, 6));
    expect(relevantSentences(all, "{{They}} ate [[what]] for lunch.", 0, "what")).toEqual([]);
    // Only the sentence the blank sits in counts: the score lines do not pull in sentences about scores for the "how" blank.
    expect(relevantSentences(all, beery, 3, "how")).toEqual([
      "He copied the forms with wobbly lines and lost the diagonal forms, drawing the triangle with rounded corners.",
      "The Beery VMI asks him to copy forms.",
      "During testing he worked carefully and asked to erase several forms.",
    ]);
  });

  it("puts lifted fills first, then related sentences, and keeps every sentence for show-all", () => {
    const s = blankSuggestions({ template: beery, blankIndex: 3, label: "how", examples: [example], pronoun: "he" });
    expect(s.fills).toEqual(["with wobbly lines and lost the diagonal forms, drawing the triangle with rounded corners"]);
    expect(s.sentences.every((x) => /forms|copied/i.test(x))).toBe(true);
    expect(s.all.length).toBe(4);
    const none = blankSuggestions({ template: undefined, blankIndex: 0, label: "x", examples: undefined, pronoun: "he" });
    expect(none).toEqual({ fills: [], sentences: [], all: [] });
  });

  it("finds the Beery and screen fills in the ready-made OT template's own examples", () => {
    const setup = allTicked("g25");
    const beerySection = packSections(pack, setup).find((s) => s.id === "beery")!;
    const overall = beerySection.blocks.find((b) => b.id === "overall")!;
    expect(liftFills(overall.text, 0, beerySection.examples, "she")).toEqual(["below average", "average"]);
    const screen = packSections(pack, setup).find((s) => s.id === "screen-g25")!;
    const grasp = screen.blocks.find((b) => b.id === "g25-grasp")!;
    expect(liftFills(grasp.text, 0, screen.examples, "he")).toEqual(["left-handed"]);
    expect(liftFills(grasp.text, 1, screen.examples, "he")).toEqual(["thumb wrap"]);
  });
});

describe("areas of concern", () => {
  const summary = (p: Partial<ReportSetup>) => sectionText(find("summary", p), "he");

  it("writes motor and sensory apart, so one can be a concern while the other is not", () => {
    const both = summary({});
    expect(both).toContain("Motor: His fine motor and visual-motor skills are an area of concern: [[what the screen and testing showed]].");
    expect(both).toContain("Sensory: His sensory processing is an area of concern: [[what it looks like in class and what helps]].");
    const sensoryOnly = summary({ concernIn: { motor: false, sensory: true } });
    expect(sensoryOnly).toContain("Motor: His fine motor and visual-motor skills are within the range expected for his grade.");
    expect(sensoryOnly).toContain("Sensory: His sensory processing is an area of concern");
    expect(sensoryOnly).not.toContain("skills are an area of concern");
    const motorOnly = summary({ concernIn: { motor: true, sensory: false } });
    expect(motorOnly).toContain("Motor: His fine motor and visual-motor skills are an area of concern");
    expect(motorOnly).toContain("Sensory: No sensory concerns that interfere with learning or participation were found.");
  });

  it("counts every area as no concern when the result is no concerns, and reads old setups as both", () => {
    const none: ReportSetup = { ...allTicked(), concerns: false };
    expect(conditionHolds({ concernIn: { sensory: true } }, none)).toBe(false);
    expect(conditionHolds({ concernIn: { sensory: false, motor: false } }, none)).toBe(true);
    expect(conditionHolds({ concernIn: { motor: true } }, allTicked())).toBe(true);
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    store.set("easyiep.report", JSON.stringify({ reportType: "evaluation", concerns: true, grade: "g25" }));
    expect(loadSetup("ot").concernIn).toEqual({ motor: true, sensory: true });
    store.set("easyiep.report", JSON.stringify({ concerns: true, concernIn: { motor: false } }));
    expect(loadSetup("ot").concernIn).toEqual({ motor: false, sensory: true });
    vi.unstubAllGlobals();
  });

  it("keeps the condition through storage", () => {
    const back = normalizePack(JSON.parse(JSON.stringify(pack)))!;
    const s = back.sections.find((x) => x.id === "summary")!;
    expect(s.blocks.find((b) => b.id === "motor-none")).toMatchObject({ when: { concernIn: { motor: false } } });
  });
});
