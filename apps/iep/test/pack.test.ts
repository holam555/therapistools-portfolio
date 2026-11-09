import { describe, expect, it } from "vitest";
import { blankPack, conditionHolds, describeCondition, findSection, moveInList, newPackId, normalizePack, optionalBlocks, packGrids, packSections, packUses, updateBlock, updateSection, withFreshIds, type TemplatePack } from "../src/report/pack";
import { adlChecklist, readyMadeAssessments } from "../src/report/premade/assessments";
import { premadePack } from "../src/report/premade";
import { sectionText } from "../src/report/render";
import { defaultSetup } from "../src/report/setup";
import type { ReportSetup } from "../src/report/types";
import { makeBackup, parseBackup, serializeBackup } from "../src/model/storage";
import { starterLibrary } from "../src/model/defaults";

const texts = (sections: ReturnType<typeof packSections>, pronoun: "he" | "she") => sections.map((s) => sectionText(s, pronoun));

describe("a ready-made pack", () => {
  const pack = premadePack("ot");

  it("says which setup choices it reacts to", () => {
    const uses = packUses(pack);
    expect(uses.teacherAreas.size).toBe(0);
    expect(uses.serviceType).toBe(true);
    expect(uses.objectives).toBe(true);
    expect(uses.goalAreas).toEqual(["writing", "cutting", "selfcare"]);
    expect(optionalBlocks(pack).filter((x) => x.assessment.id === "screen").length).toBe(9 + 11 + 9);
    expect(optionalBlocks(pack).every((x) => x.section.when?.grades)).toBe(true);
  });

  it("survives storage and the backup file with its conditions, tick boxes and repeats", () => {
    const back = normalizePack(JSON.parse(JSON.stringify(pack)))!;
    expect(back).toEqual(pack);
    const goal = back.sections.find((s) => s.id === "goal")!;
    expect(goal.blocks.find((b) => b.id === "objective")).toMatchObject({ repeat: "objectives" });
    expect(goal.blocks.find((b) => b.id === "standard-writing")).toMatchObject({ when: { goalArea: "writing" } });
    const service = back.sections.find((s) => s.id === "service")!;
    expect(service.blocks.map((b) => b.kind !== "grid" && b.when?.serviceType)).toEqual([undefined, "direct", "indirect", undefined]);
    const file = parseBackup(serializeBackup(makeBackup(starterLibrary(), [], "ot", pack)));
    expect(normalizePack(file.pack)).toEqual(pack);
    expect(file).not.toHaveProperty("template");
  });

  it("ignores the retired OT edits in an old backup file", () => {
    const old = parseBackup(JSON.stringify({ app: "easyiep", version: 1, exportedAt: "", library: starterLibrary(), recipes: [], template: { version: 1, blocks: {} } }));
    expect(old).not.toHaveProperty("template");
    expect(old).not.toHaveProperty("pack");
  });
});

describe("a ready-made assessment added to a pack", () => {
  it("joins the OT sample with fresh ids where they clash, and writes its paragraphs from the ratings", () => {
    const pack = premadePack("ot");
    const once = { ...pack, assessments: [...pack.assessments, withFreshIds(pack, adlChecklist())] };
    const adl = once.assessments.at(-1)!;
    expect(adl.id).toBe("adl");
    expect(adl.grid!.id).toBe("adl");
    // A second copy gets numbered ids, and its grid block follows its grid.
    const twice = { ...once, assessments: [...once.assessments, withFreshIds(once, adlChecklist())] };
    const second = twice.assessments.at(-1)!;
    expect(second.id).toBe("adl-2");
    expect(second.grid!.id).toBe("adl-2");
    expect(second.sections[0].id).toBe("adl-2");
    expect(second.sections[0].blocks.find((b) => b.kind === "grid")).toMatchObject({ grid: "adl-2" });
    expect(adl.sections[0].blocks.find((b) => b.kind === "grid")).toMatchObject({ grid: "adl" });
    expect(Object.keys(packGrids(twice))).toEqual(["teacher", "spm2", "adl", "adl-2"]);
    // The grid writes one paragraph per group once its rows are rated.
    const ratings: Record<string, string> = {};
    for (const g of adl.grid!.groups) for (const r of g.rows) ratings[`${g.id}.${r.id}`] = "5";
    ratings["dressing.shoes"] = "1";
    ratings["dressing.buttons"] = "na";
    ratings["dressing.zip-up"] = "3";
    const text = sectionText(packSections(once, { ...defaultSetup(), ratings: { adl: ratings } }).find((s) => s.id === "adl")!, "she");
    expect(text).toContain("Dressing: Putting on and taking off a coat, hanging a coat in a cubby, starting a zipper, unzipping a coat, and snaps were independent (Level 5). Moderate assistance (Level 3) was needed for zipping up a coat. Tying shoes required total assistance (Level 1). Buttons were not rated.");
    expect(text).toContain("Across the checklist, she [[the pattern");
    expect(text).not.toMatch(/\{\{|::/);
    expect(normalizePack(JSON.parse(JSON.stringify(twice)))).toEqual(twice);
  });

  it("offers the daily living checklist and every assessment of the discipline's sample", () => {
    const labels = readyMadeAssessments("ot").map((r) => r.label);
    expect(labels).toEqual(["Activities of daily living checklist", "Teacher rating checklist", "Informal fine motor screen", "Beery VMI", "SPM-2 School form"]);
    const beery = readyMadeAssessments("ot")[3].build();
    expect(beery.id).toBe("beery");
    expect(beery).not.toBe(readyMadeAssessments("ot")[3].build());
    expect(readyMadeAssessments("slp").map((r) => r.label)[0]).toBe("Activities of daily living checklist");
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

describe("edit mode shows every paragraph", () => {
  const pack = premadePack("ot");

  it("keeps hidden paragraphs with the reason, while the report itself leaves them out", () => {
    const setup: ReportSetup = { ...defaultSetup("g25"), serviceType: "direct", screenItems: ["g25-near"] };
    const plain = packSections(pack, setup);
    const edit = packSections(pack, setup, { showHidden: true });
    expect(edit.map((s) => s.id)).toEqual(plain.map((s) => s.id));
    const service = edit.find((s) => s.id === "service")!;
    const indirect = service.blocks.find((b) => b.id === "indirect")!;
    expect(indirect).toMatchObject({ hidden: true, hiddenWhy: "indirect services" });
    expect(service.blocks.find((b) => b.id === "direct")!.hidden).toBeUndefined();
    expect(plain.find((s) => s.id === "service")!.blocks.map((b) => b.id)).toEqual(["intro", "direct", "accommodations"]);
    const screen = edit.find((s) => s.id === "screen-g25")!;
    const grasp = screen.blocks.find((b) => b.id === "g25-grasp")!;
    expect(grasp).toMatchObject({ hidden: true, hiddenWhy: "unticked under “What did you do?”" });
    expect(screen.blocks.find((b) => b.id === "g25-near")!.hidden).toBeUndefined();
    // A subheading whose items are all unticked is marked hidden too, and comes back when one is ticked.
    expect(screen.blocks.find((b) => b.id === "h-tools")).toMatchObject({ hidden: true });
    expect(screen.blocks.find((b) => b.id === "h-handwriting")!.hidden).toBeUndefined();
    expect(sectionText(plain.find((s) => s.id === "screen-g25")!, "he")).not.toContain("Scissors and tools");
    // Objectives: the report writes one per objective; edit mode shows the hidden template line once.
    const goal = edit.find((s) => s.id === "goal")!;
    expect(goal.blocks.filter((b) => b.sourceId === "objective").length).toBe(3);
    const writing = goal.blocks.find((b) => b.id === "standard-selfcare")!;
    expect(writing).toMatchObject({ hidden: true, hiddenWhy: "self care standard chosen" });
  });

  it("describes conditions in words", () => {
    expect(describeCondition(undefined)).toBe("");
    expect(describeCondition({ reportType: "annual", concerns: false })).toBe("annual review only · no concerns / does not qualify");
    expect(describeCondition({ grades: ["k1", "g25"], serviceType: "indirect" })).toBe("grades K–1, 2–5 · indirect services");
    expect(describeCondition({ teacherAreas: { sensory: false }, anyTeacherArea: true })).toBe("sensory not ticked · at least one teacher area ticked");
    expect(describeCondition({ assessments: { spm2: true, teacher: false } }, pack)).toBe("SPM-2 School form done · Teacher rating checklist not done");
    expect(describeCondition({ goalArea: "writing" })).toBe("writing standard chosen");
  });
});
