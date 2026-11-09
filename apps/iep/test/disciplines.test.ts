// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLibrary, libraryFor, starterLibrary } from "../src/model/defaults";
import { DISCIPLINES, getDiscipline } from "../src/model/disciplines";
import { KEYS, keyFor, loadDiscipline, loadLibrary, loadRecipes, makeBackup, parseBackup, saveDiscipline, saveLibrary, saveRecipes, serializeBackup } from "../src/model/storage";
import { buildSectionPrompt } from "../src/report/report-prompt";
import { premadePack } from "../src/report/premade";
import { packSections } from "../src/report/pack";
import { defaultSetup } from "../src/report/setup";
import { scanReportText } from "../src/report/privacy-words";

beforeEach(() => localStorage.clear());

describe("disciplines", () => {
  it("only occupational therapy ships a starter library", () => {
    expect(DISCIPLINES.filter((d) => d.hasStarter).map((d) => d.id)).toEqual(["ot"]);
    expect(libraryFor("ot").domains.length).toBeGreaterThan(0);
    for (const d of DISCIPLINES.filter((x) => x.id !== "ot")) {
      const lib = libraryFor(d.id);
      expect(lib.domains, d.id).toEqual([]);
      expect(lib.sections.length).toBeGreaterThan(0);
      expect(lib.variables.map((v) => v.name)).toContain("accuracy");
    }
  });

  it("keeps each discipline's library and recipes apart; OT keeps the original keys", () => {
    const ot = starterLibrary();
    const slp = { ...emptyLibrary(), domains: [{ id: "d1", name: "Articulation", tasks: [] }] };
    saveLibrary(ot, "ot");
    saveLibrary(slp, "slp");
    expect(localStorage.getItem(KEYS.library)).toBe(JSON.stringify(ot));
    expect(localStorage.getItem("easyiep.library.slp")).toBe(JSON.stringify(slp));
    expect(loadLibrary("slp").library.domains.map((d) => d.name)).toEqual(["Articulation"]);
    expect(loadLibrary("ot").library.domains[0].name).toBe("Fine Motor");
    expect(loadLibrary("pt")).toEqual({ library: emptyLibrary(), fresh: true });

    saveRecipes([{ id: "r", name: "SLP set", pronounSet: "she", gradeBandId: null, domainIds: [], taskIds: [], sentenceIds: [] }], "slp");
    expect(loadRecipes("slp").map((r) => r.name)).toEqual(["SLP set"]);
    expect(loadRecipes("ot")).toEqual([]);
    expect(keyFor(KEYS.recipes, "ot")).toBe("easyiep.recipes");
    expect(keyFor(KEYS.recipes, "sped")).toBe("easyiep.recipes.sped");
  });

  it("asks a new visitor, treats an existing library as OT, and remembers the choice", () => {
    expect(loadDiscipline()).toBeNull();
    saveLibrary(starterLibrary(), "ot");
    expect(loadDiscipline()).toBe("ot");
    saveDiscipline("slp");
    expect(loadDiscipline()).toBe("slp");
    localStorage.setItem(KEYS.discipline, "astronaut");
    expect(loadDiscipline()).toBe("ot");
  });

  it("records the discipline in backups and reads it back", () => {
    const b = parseBackup(serializeBackup(makeBackup(emptyLibrary(), [], "pt")));
    expect(b.discipline).toBe("pt");
    const old = parseBackup(serializeBackup(makeBackup(emptyLibrary(), [])));
    expect(old.discipline).toBeUndefined();
  });

  it("names the writer's role in the section prompt without tripping the privacy check", () => {
    const lib = starterLibrary();
    const section = packSections(premadePack("ot"), defaultSetup())[0];
    for (const d of DISCIPLINES) {
      const p = buildSectionPrompt(section, { role: d.role, reportType: "evaluation", grade: "g25", pronoun: "he" });
      expect(p, d.id).toContain(`a school-based ${d.role} write`);
      expect(scanReportText(p, lib).filter((w) => w.kind !== "name"), d.id).toEqual([]);
    }
    expect(getDiscipline("psych").role).toBe("psychologist");
  });
});
