// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { freezeTemplateOnce, fullOverrides, wordingSetups } from "../src/report/freeze";
import { otReportSections } from "../src/report/ot-pack";
import { emptyOverrides, loadOverrides, normalizeOverrides } from "../src/report/overrides";
import { OPTION_LISTS } from "../src/report/options";
import { blockKeyOf, sectionText } from "../src/report/render";
import { defaultSetup } from "../src/report/setup";
import { checkTemplate } from "../src/account/sync";
import { starterLibrary } from "../src/model/defaults";

const texts = (o?: ReturnType<typeof fullOverrides>) =>
  wordingSetups().flatMap((setup) => otReportSections(setup, o).map((s) => [s.id, s.title, sectionText(s, setup.pronoun), ...s.examples, ...s.blocks.flatMap((b) => b.examples ?? [])].join("\n")));

describe("freezing the built-in wording into the writer's own template", () => {
  const full = fullOverrides();

  it("covers every paragraph, label, sample, title and dropdown list", () => {
    for (const setup of wordingSetups())
      for (const s of otReportSections(setup)) {
        expect(full.titles[s.id], s.id).toBe(s.title);
        s.blocks.forEach((b, i) => {
          if (b.generated) return;
          const ov = full.blocks[`${s.id}/${blockKeyOf(b, i)}`];
          expect(ov, `${s.id}/${blockKeyOf(b, i)}`).toBeDefined();
          expect(ov.text).toBe(b.text);
          if ("label" in b && b.label !== undefined) expect(ov.label).toBe(b.label);
          if (b.examples) expect(ov.examples).toEqual(b.examples);
        });
      }
    for (const name of Object.keys(OPTION_LISTS)) if (name !== "year") expect(full.lists[name]).toEqual(OPTION_LISTS[name].options);
    expect(full.lists.year).toBeUndefined();
    expect(Object.keys(full.blocks).length).toBeGreaterThan(60);
  });

  it("reads exactly like the built-in template when laid over it", () => {
    expect(texts(full)).toEqual(texts());
  });

  it("keeps the writer's own edits on top", () => {
    const own = emptyOverrides();
    own.blocks["screen/g25-grasp"] = { text: "{{They}} holds the pencil [[how]].", label: "Grasp" };
    own.blocks["screen/g25-dominance"] = { hidden: true };
    own.sectionExamples.teacher = ["The teacher reported no concerns."];
    own.lists.minutes = ["45 minutes monthly"];
    own.titles.spm2 = "Sensory measure";
    own.screen.k1 = { hidden: ["k1-strength"], added: [] };
    const merged = fullOverrides(own);
    expect(merged.blocks["screen/g25-grasp"]).toMatchObject({ text: "{{They}} holds the pencil [[how]].", label: "Grasp" });
    expect(merged.blocks["screen/g25-grasp"].examples?.length).toBeGreaterThan(0);
    expect(merged.blocks["screen/g25-dominance"].hidden).toBe(true);
    expect(merged.sectionExamples.teacher).toEqual(["The teacher reported no concerns."]);
    expect(merged.lists.minutes).toEqual(["45 minutes monthly"]);
    expect(merged.titles.spm2).toBe("Sensory measure");
    expect(merged.screen.k1).toEqual({ hidden: ["k1-strength"], added: [] });
    const screen = otReportSections(defaultSetup(), merged).find((s) => s.id === "screen")!;
    expect(sectionText(screen, "she")).toContain("- Grasp – She holds the pencil [[how]].");
    expect(sectionText(screen, "she")).not.toContain("Hand dominance");
  });

  it("survives storage and passes the account's privacy gate", () => {
    expect(normalizeOverrides(JSON.parse(JSON.stringify(full)))).toEqual(full);
    expect(checkTemplate(full, starterLibrary()).blocking).toEqual([]);
  });

  describe("at start-up", () => {
    beforeEach(() => localStorage.clear());

    it("freezes a browser that used the tool before, once", () => {
      localStorage.setItem("easyiep.library", "{}");
      expect(freezeTemplateOnce()).toBe(true);
      expect(Object.keys(loadOverrides("ot").blocks).length).toBeGreaterThan(60);
      expect(freezeTemplateOnce()).toBe(false);
    });

    it("leaves a new browser alone and does not come back later", () => {
      expect(freezeTemplateOnce()).toBe(false);
      expect(loadOverrides("ot")).toEqual(emptyOverrides());
      localStorage.setItem("easyiep.library", "{}");
      expect(freezeTemplateOnce()).toBe(false);
      expect(loadOverrides("ot")).toEqual(emptyOverrides());
    });
  });
});
