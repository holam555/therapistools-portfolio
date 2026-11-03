// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { adoptOtPackOnce } from "../src/report/adopt";
import { fullOverrides } from "../src/report/freeze";
import { emptyOverrides, saveOverrides } from "../src/report/overrides";
import { loadPack } from "../src/report/pack";

describe("turning a browser's OT edits into its own pack", () => {
  beforeEach(() => localStorage.clear());

  it("adopts once when the browser has OT edits", () => {
    saveOverrides("ot", fullOverrides());
    expect(adoptOtPackOnce()).toBe(true);
    const pack = loadPack("ot")!;
    expect(pack.titles.evaluation).toBe("Occupational Therapy Evaluation Report");
    expect(pack.assessments.map((a) => a.id)).toEqual(["teacher", "screen", "beery", "spm2"]);
    expect(adoptOtPackOnce()).toBe(false);
  });

  it("leaves a browser without edits alone, for good", () => {
    expect(adoptOtPackOnce()).toBe(false);
    expect(loadPack("ot")).toBeNull();
    saveOverrides("ot", { ...emptyOverrides(), titles: { spm2: "Later edit" } });
    expect(adoptOtPackOnce()).toBe(false);
    expect(loadPack("ot")).toBeNull();
  });
});
