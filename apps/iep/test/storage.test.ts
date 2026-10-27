// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { starterLibrary } from "../src/model/defaults";
import { KEYS, loadLibrary, makeBackup, mergeLibraries, parseBackup, saveLibrary, serializeBackup } from "../src/model/storage";

beforeEach(() => localStorage.clear());

describe("storage", () => {
  it("returns the starter library when nothing is saved, then round-trips", () => {
    const first = loadLibrary();
    expect(first.fresh).toBe(true);
    const lib = { ...first.library, neverAllow: ["Example Elementary"] };
    saveLibrary(lib);
    const again = loadLibrary();
    expect(again.fresh).toBe(false);
    expect(again.library).toEqual(lib);
  });

  it("keeps unreadable data aside instead of deleting it", () => {
    localStorage.setItem(KEYS.library, "{not json");
    const r = loadLibrary();
    expect(r.fresh).toBe(true);
    expect(localStorage.getItem(`${KEYS.library}.unreadable`)).toBe("{not json");
  });

  it("exports and re-imports a backup", () => {
    const lib = starterLibrary();
    const text = serializeBackup(makeBackup(lib, []));
    const parsed = parseBackup(text);
    expect(parsed.library).toEqual(lib);
    expect(() => parseBackup("nope")).toThrow(/valid JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/does not look like/);
  });

  it("merges by name without duplicating", () => {
    const current = starterLibrary();
    const incoming = starterLibrary();
    incoming.domains[0].tasks[0].sentences.push({ id: "s_new", text: "A brand new sentence.", sectionId: "sec_present", gradeBandIds: ["gb_k2"], tags: [], notes: "" });
    incoming.domains.push({ id: "d_x", name: "Visual Motor", tasks: [{ id: "t_x", name: "Copying", sentences: [] }] });
    incoming.sections.push({ id: "sec_extra", name: "Extra" });
    const merged = mergeLibraries(current, incoming);
    expect(merged.domains.length).toBe(current.domains.length + 1);
    const t0 = merged.domains[0].tasks[0];
    expect(t0.sentences.length).toBe(current.domains[0].tasks[0].sentences.length + 1);
    expect(t0.sentences.at(-1)?.text).toBe("A brand new sentence.");
    expect(merged.sections.map((s) => s.name)).toContain("Extra");
    // merging the same thing twice changes nothing
    expect(mergeLibraries(merged, incoming)).toEqual(merged);
  });
});
