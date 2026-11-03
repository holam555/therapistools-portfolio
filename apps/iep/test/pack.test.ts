import { describe, expect, it } from "vitest";
import { otReportSections } from "../src/report/ot-pack";
import { emptyOverrides, type TemplateOverrides } from "../src/report/overrides";
import {
  blankPack, conditionHolds, findSection, moveInList, newPackId, normalizePack, optionalBlocks, packFromOt, packSections, packUses, updateBlock, updateSection, type TemplatePack,
} from "../src/report/pack";
import { sectionText } from "../src/report/render";
import { SPM_SCALES, spmKey } from "../src/report/spm";
import { defaultSetup, withGrade } from "../src/report/setup";
import { GRADE_GROUPS, type ReportSetup } from "../src/report/types";
import { makeBackup, parseBackup, serializeBackup } from "../src/model/storage";
import { starterLibrary } from "../src/model/defaults";

const texts = (sections: ReturnType<typeof packSections>, pronoun: "he" | "she") => sections.map((s) => sectionText(s, pronoun));

/** Every choice the OT template reacts to, with and without a writer's edits. */
function otMatrix(o?: TemplateOverrides): ReportSetup[] {
  const out: ReportSetup[] = [];
  const spm = Object.fromEntries(SPM_SCALES.map((s) => [spmKey(s), "typical"]));
  spm[spmKey("Vision")] = "severe";
  for (const g of GRADE_GROUPS)
    for (const reportType of ["evaluation", "annual"] as const)
      for (const concerns of [true, false])
        for (const teacherAreas of [{ fine: true, gross: true, sensory: true }, { fine: false, gross: false, sensory: false }, { fine: false, gross: true, sensory: false }, { fine: true, gross: false, sensory: true }])
          for (const serviceType of ["direct", "indirect"] as const)
            for (const objectives of [2, 4])
              for (const goalAreas of [["writing", "cutting", "selfcare"], [], ["selfcare"]] as ReportSetup["goalAreas"][])
                for (const assessments of [{ teacher: true, screen: true, beery: true, spm2: true }, { teacher: true, screen: true, beery: false, spm2: false }, { teacher: false, screen: false, beery: true, spm2: true }])
                  for (const items of ["all", "half", "none"]) {
                    const base = withGrade(defaultSetup(), g.id, o);
                    const screenItems = items === "all" ? base.screenItems : items === "half" ? base.screenItems.filter((_, i) => i % 2 === 0) : [];
                    out.push({ ...base, reportType, concerns, teacherAreas, serviceType, objectives, goalAreas, assessments, screenItems, pronoun: items === "half" ? "she" : "he", ratings: { spm2: spm } });
                  }
  return out;
}
const full = (sections: ReturnType<typeof packSections>, pronoun: "he" | "she") => sections.map((s) => [s.id, s.title, sectionText(s, pronoun), ...s.examples, ...s.blocks.flatMap((b) => b.examples ?? [])].join("\n"));

describe("a pack copied from the OT template", () => {
  const pack = packFromOt("Physical therapy");

  it("reads exactly like the OT report for every setup, with ratings, ticks, objectives, standards and services", () => {
    for (const setup of otMatrix()) expect(full(packSections(pack, setup), setup.pronoun), JSON.stringify(setup)).toEqual(full(otReportSections(setup), setup.pronoun));
  });

  it("carries a writer's edits: wording, hidden and added items, titles, lists and the grid", () => {
    const o = emptyOverrides();
    o.blocks["screen/g25-grasp"] = { text: "{{They}} holds the pencil [[how]].", label: "Grasp", examples: ["He held it well."] };
    o.blocks["screen/g25-dominance"] = { hidden: true };
    o.blocks["summary/sensory"] = { text: "Sensory results from the {assessments}: {results}. {{They}} [[next step]]." };
    o.blocks["goal/goal-frame"] = { text: "{{student}} will meet [[number met::objectivesMet]] of these {count} objectives:" };
    o.blocks["next-steps/closing"] = { hidden: true };
    o.sectionExamples.impact = ["Her disability affects her writing."];
    o.lists.minutes = ["45 minutes monthly"];
    o.titles.spm2 = "Sensory measure";
    o.screen.k1 = { hidden: ["k1-strength"], added: [{ id: "custom-1", label: "Keyboarding", group: "classroom", opener: "{{They}} [[typing]].", examples: ["She typed well."] }] };
    const edited = packFromOt("Occupational Therapy", o);
    for (const setup of otMatrix(o)) expect(full(packSections(edited, setup), setup.pronoun), JSON.stringify(setup)).toEqual(full(otReportSections(setup, o), setup.pronoun));
    expect(edited.titles).toEqual({ evaluation: "Occupational Therapy Evaluation Report", annual: "Occupational Therapy Annual Review" });
    expect(edited.lists.minutes.options).toEqual(["45 minutes monthly"]);
    expect(optionalBlocks(edited).some((x) => x.block.id === "custom-1")).toBe(true);
    expect(optionalBlocks(edited).some((x) => x.block.id === "k1-strength")).toBe(false);
  });

  it("carries the assessments, their grid, tick boxes, options and dropdown lists", () => {
    expect(pack.assessments.map((a) => a.id)).toEqual(["teacher", "screen", "beery", "spm2"]);
    expect(pack.assessments.find((a) => a.id === "spm2")!.grid!.groups[0].rows.length).toBe(9);
    const screen = pack.assessments.find((a) => a.id === "screen")!.sections[0];
    expect(screen.id).toBe("screen");
    expect(optionalBlocks(pack).filter((x) => x.assessment.id === "screen").length).toBe(11 + 16 + 3);
    expect(screen.blocks.find((b) => b.id === "g68-typing")).toMatchObject({ optional: true, when: { grades: ["g68", "g912"] } });
    const uses = packUses(pack);
    expect(uses.teacherAreas.has("teacher")).toBe(true);
    expect(uses.serviceType).toBe(true);
    expect(uses.objectives).toBe(true);
    expect(uses.goalAreas).toEqual(["writing", "cutting", "selfcare"]);
    expect(packSections(pack, defaultSetup()).find((s) => s.id === "teacher")!.examples.length).toBe(3);
    expect(pack.lists.grasp.options).toContain("tripod");
    expect(pack.titles).toEqual({ evaluation: "Physical therapy Evaluation Report", annual: "Physical therapy Annual Review" });
  });

  it("writes rating lines from the pack's own grids", () => {
    const all = Object.fromEntries(["Social Participation", "Vision", "Hearing", "Touch", "Taste and Smell", "Body Awareness", "Balance and Motion", "Planning and Ideas", "Sensory Total"].map((s) => [`scales.${s}`, "typical"]));
    const setup: ReportSetup = { ...defaultSetup(), ratings: { spm2: { ...all, "scales.Vision": "severe" } } };
    const text = texts(packSections(pack, setup), "he").join("\n");
    expect(text).toContain("Severe Difficulties: Vision");
    expect(text).toContain("Moderate Difficulties: None");
    expect(texts(packSections(pack, defaultSetup()), "he").join("\n")).toContain("Typical Processing: [[scales at this level, or none]]");
  });

  it("drops an assessment that was not done", () => {
    const setup: ReportSetup = { ...defaultSetup(), assessments: { beery: false, spm2: false } };
    expect(packSections(pack, setup).map((s) => s.id)).toEqual(["teacher", "screen", "summary", "next-steps", "impact", "service", "goal"]);
    expect(packSections(pack, { ...setup, concerns: false }).map((s) => s.id)).toEqual(["teacher", "screen", "summary"]);
  });

  it("survives storage with its conditions, tick boxes and repeats", () => {
    const back = normalizePack(JSON.parse(JSON.stringify(pack)))!;
    expect(back).toEqual(pack);
    const goal = back.sections.find((s) => s.id === "goal")!;
    expect(goal.blocks.find((b) => b.id === "objective")).toMatchObject({ repeat: "objectives" });
    expect(goal.blocks.find((b) => b.id === "standard-writing")).toMatchObject({ when: { goalArea: "writing" } });
    const service = back.sections.find((s) => s.id === "service")!;
    expect(service.blocks.map((b) => b.kind !== "grid" && b.when?.serviceType)).toEqual(["direct", "indirect"]);
  });

  it("survives the backup file and storage unchanged", () => {
    const back = parseBackup(serializeBackup(makeBackup(starterLibrary(), [], "pt", undefined, pack)));
    expect(normalizePack(back.pack)).toEqual(pack);
    expect(normalizePack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
  });
});

describe("a blank pack", () => {
  it("starts with a summary and grows by adding sections, assessments and paragraphs", () => {
    let pack = blankPack("Speech-language pathology");
    const setup = defaultSetup();
    expect(texts(packSections(pack, setup), "he")).toEqual(["SUMMARY\n\n[[Summary of the findings and how they affect the student at school]]"]);

    pack = { ...pack, sections: [...pack.sections, { id: newPackId(pack, "section"), title: "Background", place: "before", blocks: [], examples: [], when: { reportType: "annual" } }] };
    expect(packSections(pack, setup).map((s) => s.id)).toEqual(["summary"]);
    expect(packSections(pack, { ...setup, reportType: "annual" }).map((s) => s.id)).toEqual(["section1", "summary"]);

    pack = updateSection(pack, "section1", (s) => ({ ...s, blocks: [{ kind: "para", id: "p1", text: "{{student}} was referred by [[who]]." }] }));
    pack = updateBlock(pack, "section1", "p1", (b) => (b.kind === "grid" ? b : { ...b, label: "Referral" }));
    const annual = packSections(pack, { ...setup, reportType: "annual", pronoun: "she" });
    expect(sectionText(annual[0], "she")).toBe("BACKGROUND\n\nReferral: [STUDENT] was referred by [[who]].");
    expect(findSection(pack, "section1")!.section.blocks.length).toBe(1);
    pack = updateBlock(pack, "section1", "p1", () => null);
    expect(findSection(pack, "section1")!.section.blocks.length).toBe(0);
    pack = updateSection(pack, "section1", () => null);
    expect(findSection(pack, "section1")).toBeNull();
  });

  it("expands a grid block into one line per level", () => {
    const pack: TemplatePack = {
      ...blankPack("X"),
      assessments: [
        {
          id: "a1", label: "Scale",
          grid: { id: "g1", title: "Rate", layout: "byLevel", blank: "[[items, or none]]", none: "None", levels: [{ value: "t", label: "Typical", sentence: "{items}" }, { value: "c", label: "Concern", sentence: "{items}", concern: true }], groups: [{ id: "items", label: "Items", rows: [{ id: "a", label: "Fluency" }, { id: "b", label: "Voice" }] }] },
          sections: [{ id: "s1", title: "Scale", blocks: [{ kind: "grid", id: "grid-g1", grid: "g1" }], examples: [] }],
        },
      ],
    };
    const empty = sectionText(packSections(pack, defaultSetup())[0], "he");
    expect(empty).toContain("Typical: [[items, or none]]");
    const rated = sectionText(packSections(pack, { ...defaultSetup(), ratings: { g1: { "items.a": "c", "items.b": "t" } } })[0], "he");
    expect(rated).toContain("Typical: Voice");
    expect(rated).toContain("Concern: Fluency");
    expect(findSection(pack, "s1")!.assessment!.id).toBe("a1");
  });
});

describe("pack paragraphs with conditions, tick boxes, repeats and slots", () => {
  it("writes objectives per setup, fills slots, keeps tick boxes and drops emptied subheadings", () => {
    const pack: TemplatePack = {
      ...blankPack("X"),
      assessments: [
        {
          id: "a1", label: "Scale",
          grid: { id: "g1", title: "Rate", layout: "byLevel", blank: "[[items, or none]]", none: "None", allClear: "typical across the board", levels: [{ value: "t", label: "Typical", sentence: "{items}" }, { value: "c", label: "Concern", sentence: "{items}", concern: true }], groups: [{ id: "items", label: "Items", rows: [{ id: "a", label: "Fluency" }, { id: "b", label: "Voice" }] }] },
          sections: [
            {
              id: "s1", title: "Scale", examples: [],
              blocks: [
                { kind: "subheading", id: "h1", text: "Done" },
                { kind: "bullet", id: "i1", label: "Item one", text: "{{They}} [[did one]].", optional: true },
                { kind: "bullet", id: "i2", label: "Item two", text: "{{They}} [[did two]].", optional: true, when: { grades: ["k1"] } },
                { kind: "subheading", id: "h2", text: "Always" },
                { kind: "para", id: "sum", text: "Overall {{they}} is {summary:g1}." },
              ],
            },
          ],
        },
      ],
      sections: [
        { id: "goal", title: "Goal", examples: [], place: "after", when: { concerns: true }, blocks: [{ kind: "para", id: "frame", text: "{{student}} will meet {count} objectives:" }, { kind: "numbered", id: "objective", text: "[[objective]]", repeat: "objectives" }, { kind: "subheading", id: "hs", text: "Standards" }, { kind: "bullet", id: "st", text: "[[standard]]", when: { goalArea: "writing" } }] },
        { id: "svc", title: "Service", examples: [], place: "after", blocks: [{ kind: "para", id: "d", text: "Direct.", when: { serviceType: "direct" } }, { kind: "para", id: "i", text: "Indirect.", when: { serviceType: "indirect" } }, { kind: "para", id: "t", text: "Fine motor concerns.", when: { teacherAreas: { fine: true } } }, { kind: "para", id: "n", text: "No areas.", when: { anyTeacherArea: false } }] },
      ],
    };
    const setup: ReportSetup = { ...defaultSetup(), grade: "k1", screenItems: ["i1", "i2"], objectives: 2, goalAreas: [], serviceType: "indirect", teacherAreas: { fine: false, gross: false, sensory: false }, ratings: { g1: { "items.a": "c", "items.b": "t" } } };
    const text = (s: ReportSetup) => packSections(pack, s).map((x) => sectionText(x, "he")).join("\n");
    const t1 = text(setup);
    expect(t1).toContain("- Item one – He [[did one]].");
    expect(t1).toContain("- Item two – He [[did two]].");
    expect(t1).toContain("Overall he is affected with Concern for Fluency.");
    expect(t1).toContain("[STUDENT] will meet 2 objectives:\n1. [[objective]]\n2. [[objective]]");
    expect(t1).not.toContain("Standards");
    expect(t1).toContain("Indirect.");
    expect(t1).not.toContain("Direct.");
    expect(t1).toContain("No areas.");
    expect(t1).not.toContain("Fine motor concerns.");
    const t2 = text({ ...setup, grade: "g25", screenItems: [], objectives: 3, goalAreas: ["writing"], serviceType: "direct", teacherAreas: { fine: true, gross: false, sensory: false } });
    expect(t2).not.toContain("Done");
    expect(t2).toContain("Always");
    expect(t2).toContain("3. [[objective]]");
    expect(t2).toContain("Standards\n- [[standard]]");
    expect(t2).toContain("Direct.");
    expect(t2).toContain("Fine motor concerns.");
    const goal = packSections(pack, setup).find((s) => s.id === "goal")!;
    expect(goal.blocks[0]).toMatchObject({ pattern: "{{student}} will meet {count} objectives:", slots: { count: "2" } });
    expect(goal.blocks[1]).toMatchObject({ id: "objective1", sourceId: "objective" });
    expect(normalizePack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
  });
});

describe("pack plumbing", () => {
  it("checks conditions and moves items", () => {
    const setup = { ...defaultSetup(), reportType: "annual" as const, concerns: false, grade: "k1" as const };
    expect(conditionHolds(undefined, setup)).toBe(true);
    expect(conditionHolds({ reportType: "annual", concerns: false, grades: ["k1", "g25"] }, setup)).toBe(true);
    expect(conditionHolds({ concerns: true }, setup)).toBe(false);
    expect(conditionHolds({ grades: ["g68"] }, setup)).toBe(false);
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(moveInList(list, "c", -1).map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(moveInList(list, "a", -1)).toBe(list);
    expect(moveInList(list, "zz", 1)).toBe(list);
  });

  it("reads stored packs carefully and refuses what isn't one", () => {
    expect(normalizePack(null)).toBeNull();
    expect(normalizePack({ version: 2 })).toBeNull();
    const p = normalizePack({
      version: 1,
      titles: { evaluation: "E" },
      assessments: [{ id: "a", sections: [{ id: "s", blocks: [{ kind: "para", text: "hi" }, { kind: "nope", text: "x" }, { kind: "grid", grid: "g" }, 7] }], grid: { id: "g", layout: "byLevel", levels: [{ value: "v" }], groups: [{ id: "x", rows: [{ id: "r" }] }] } }, "junk"],
      sections: [{ title: "T", when: { reportType: "bogus", concerns: "yes", grades: ["k1", "nope"] }, place: "middle" }],
      lists: { ok: { options: ["a", 1] }, bad: { options: [] } },
    })!;
    expect(p.titles).toEqual({ evaluation: "E", annual: "Annual Review" });
    expect(p.assessments[0].label).toBe("Assessment");
    expect(p.assessments[0].sections[0].blocks).toEqual([{ kind: "para", id: "b1", text: "hi" }, { kind: "grid", id: "b3", grid: "g" }]);
    expect(p.assessments[0].grid!.layout).toBe("byLevel");
    expect(p.sections[0]).toEqual({ id: "s1", title: "T", blocks: [], examples: [], when: { grades: ["k1"] } });
    expect(p.lists).toEqual({ ok: { options: ["a"] } });
  });
});
