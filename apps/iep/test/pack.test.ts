import { describe, expect, it } from "vitest";
import { otReportSections } from "../src/report/ot-pack";
import {
  blankPack, conditionHolds, findSection, moveInList, newPackId, normalizePack, packFromOt, packSections, updateBlock, updateSection, type TemplatePack,
} from "../src/report/pack";
import { sectionText } from "../src/report/render";
import { defaultSetup, withGrade } from "../src/report/setup";
import { GRADE_GROUPS, type ReportSetup } from "../src/report/types";
import { makeBackup, parseBackup, serializeBackup } from "../src/model/storage";
import { starterLibrary } from "../src/model/defaults";

const texts = (sections: ReturnType<typeof packSections>, pronoun: "he" | "she") => sections.map((s) => sectionText(s, pronoun));

describe("a pack copied from the OT template", () => {
  const pack = packFromOt("Physical therapy");

  it("reads exactly like the OT report for every report type, result and grade", () => {
    for (const g of GRADE_GROUPS)
      for (const reportType of ["evaluation", "annual"] as const)
        for (const concerns of [true, false])
          for (const pronoun of ["he", "she"] as const) {
            // The copy fixes what OT decides at report time: every teacher area follows the result, services are direct, and the goal lists every standard.
            const setup: ReportSetup = { ...withGrade(defaultSetup(), g.id), reportType, concerns, teacherAreas: { fine: concerns, gross: concerns, sensory: concerns }, pronoun, goalAreas: ["writing", "cutting", "selfcare"] };
            expect(texts(packSections(pack, setup), pronoun), `${g.id} ${reportType} ${concerns}`).toEqual(texts(otReportSections(setup), pronoun));
          }
  });

  it("carries the assessments, their grids, sample sentences and dropdown lists", () => {
    expect(pack.assessments.map((a) => a.id)).toEqual(["teacher", "screen", "beery", "spm2"]);
    expect(pack.assessments.find((a) => a.id === "spm2")!.grid!.groups[0].rows.length).toBe(9);
    expect(pack.assessments.find((a) => a.id === "screen")!.sections.map((s) => s.when?.grades)).toEqual([["k1"], ["g25"], ["g68", "g912"]]);
    const teacher = pack.assessments[0].sections.find((s) => s.id === "teacher-concerns")!;
    expect(teacher.examples.length).toBe(3);
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
    expect(packSections(pack, setup).map((s) => s.id)).toEqual(["teacher-concerns", "screen-g25", "summary-concerns", "next-steps", "impact", "service", "goal"]);
    expect(packSections(pack, { ...setup, concerns: false }).map((s) => s.id)).toEqual(["teacher-none", "screen-g25", "summary-none"]);
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
