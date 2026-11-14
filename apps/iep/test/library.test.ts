import { describe, expect, it } from "vitest";
import {
  addDomain, addSentence, addTask, allSentences, deleteSection, duplicateTask, emptySentence, ensureTask, moveItem, moveSentence,
  renameDomain, upsertVariable,
} from "../src/model/library";
import { starterLibrary } from "../src/model/defaults";

describe("library helpers are pure and keep order", () => {
  it("moveItem clamps at the ends", () => {
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });

  it("adds, renames and duplicates without touching the input", () => {
    const lib = starterLibrary();
    const before = JSON.stringify(lib);
    const { lib: l1, id } = addDomain(lib, "Visual Motor");
    const l2 = renameDomain(l1, id, "Visual-Motor");
    expect(l2.domains.at(-1)?.name).toBe("Visual-Motor");
    expect(JSON.stringify(lib)).toBe(before);
    const task = lib.domains[0].tasks[0];
    const { lib: l3, id: copyId } = duplicateTask(lib, task.id);
    const d = l3.domains[0];
    expect(d.tasks[1].id).toBe(copyId);
    expect(d.tasks[1].name).toBe(`${task.name} (copy)`);
    expect(d.tasks[1].sentences.map((s) => s.text)).toEqual(task.sentences.map((s) => s.text));
    expect(d.tasks[1].sentences[0].id).not.toBe(task.sentences[0].id);
  });

  it("moves sentences and finds/creates tasks by name", () => {
    const lib = starterLibrary();
    const t = lib.domains[0].tasks[1];
    const first = t.sentences[0].id;
    const moved = moveSentence(lib, first, 1);
    expect(moved.domains[0].tasks[1].sentences[1].id).toBe(first);
    const r = ensureTask(lib, "fine motor", "Cutting");
    expect(r.taskId).toBe("t_fm_cutting");
    expect(r.lib).toBe(lib);
    const r2 = ensureTask(lib, "New Domain", "New Task");
    expect(r2.lib.domains.at(-1)?.name).toBe("New Domain");
    const { lib: l3, id: taskId } = addTask(lib, lib.domains[0].id, "Extra");
    const l4 = addSentence(l3, taskId, { ...emptySentence("sec_present"), text: "Hello {{student}}" });
    expect(allSentences(l4).length).toBe(allSentences(lib).length + 1);
  });

  it("deleting a section clears it from sentences", () => {
    const lib = deleteSection(starterLibrary(), "sec_present");
    expect(lib.sections.some((s) => s.id === "sec_present")).toBe(false);
    expect(allSentences(lib).every((r) => r.sentence.sectionId !== "sec_present")).toBe(true);
  });

  it("upserts variables by lower-cased name", () => {
    const lib = upsertVariable(starterLibrary(), { name: "Accuracy", label: "Acc", presets: [" 50% ", ""], allowFreeText: false });
    const v = lib.variables.find((x) => x.name === "accuracy");
    expect(v).toEqual({ name: "accuracy", label: "Acc", presets: ["50%"], allowFreeText: false });
    expect(lib.variables.filter((x) => x.name === "accuracy").length).toBe(1);
  });
});

describe("starter library hygiene", () => {
  it("has no identifiers or XX placeholders left", () => {
    const text = JSON.stringify(starterLibrary());
    expect(text).not.toMatch(/\bxx\b/i);
    expect(text).not.toMatch(/\/Users\//);
    expect(text).not.toMatch(/\b(he|she|him|his|her|hers)\b/);
  });
});
