// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { assemble, emptyBuilderState } from "../src/model/assemble";
import { emptyLibrary, libraryFor, starterLibrary } from "../src/model/defaults";
import { DISCIPLINES, getDiscipline } from "../src/model/disciplines";
import { scanForLibrary } from "../src/model/privacy";
import { buildPrompt, DEFAULT_PROMPT_TEMPLATE, ROLE_MARKER } from "../src/model/prompt";
import {
  KEYS, keyFor, loadDiscipline, loadDraft, loadLibrary, loadRecipes, makeBackup, parseBackup, saveDiscipline, saveDraft, saveLibrary,
  saveRecipes, serializeBackup,
} from "../src/model/storage";

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

  it("keeps each discipline's library, recipes and draft apart; OT keeps the original keys", () => {
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
    saveDraft({ ...emptyBuilderState(), pronounSet: "she" }, "psych");
    expect(loadDraft("psych").pronounSet).toBe("she");
    expect(loadDraft("ot").pronounSet).toBe("he");
    expect(keyFor(KEYS.draft, "ot")).toBe("easyiep.draft");
    expect(keyFor(KEYS.draft, "sped")).toBe("easyiep.draft.sped");
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

  it("names the writer's role in the AI prompt without tripping the privacy check", () => {
    expect(DEFAULT_PROMPT_TEMPLATE).toContain(ROLE_MARKER);
    const lib = starterLibrary();
    const cutting = lib.domains[0].tasks.find((t) => t.name === "Cutting")!;
    const a = assemble(lib, { ...emptyBuilderState(), taskIds: [cutting.id], sentenceIds: [cutting.sentences[0].id] });
    for (const d of DISCIPLINES) {
      const p = buildPrompt(lib, a, d.role);
      expect(p, d.id).toContain(`a school-based ${d.role} finish`);
      expect(p, d.id).not.toContain(ROLE_MARKER);
      expect(scanForLibrary(p, lib), d.id).toEqual([]);
    }
    expect(getDiscipline("psych").role).toBe("psychologist");
  });
});
