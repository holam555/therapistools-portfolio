import { describe, expect, it } from "vitest";
import { starterLibrary } from "../src/model/defaults";
import { buildAllowList, scanForLibrary, scanText } from "../src/model/privacy";

const lib = { ...starterLibrary(), neverAllow: ["Example Elementary", "Room 12"] };
const allow = buildAllowList(lib);
const scan = (t: string) => scanText(t, { neverAllow: lib.neverAllow, allow });

describe("privacy scan", () => {
  it("flags never-allow phrases regardless of case", () => {
    const w = scan("[STUDENT] attends example elementary in room 12.");
    expect(w.map((x) => x.kind)).toEqual(["never-allow", "never-allow"]);
    expect(w[0].text).toBe("example elementary");
  });

  it("flags full dates, phones and emails but not month-year goal dates", () => {
    const w = scan("Born 3/14/2018, call 555-123-4567 or mom@example.com. By October of 2027, [STUDENT] will cut. Review on March 3, 2026.").filter((x) => x.kind !== "name");
    expect(w.map((x) => x.kind).sort()).toEqual(["date", "date", "email", "phone"]);
    expect(w.find((x) => x.kind === "date")?.text).toBe("3/14/2018");
    expect(scan("By October 2027 he will improve.").length).toBe(0);
  });

  it("flags capitalised words that are not library wording, but not template words or sentence starts", () => {
    const w = scan("During cutting tasks, Jordan Lee demonstrated functional bilateral coordination. However, his writing was small. Marisol cut a heart.");
    expect(w.map((x) => x.text)).toEqual(["Jordan Lee", "Marisol"]);
  });

  it("treats K-12 as a grade range but still catches hyphenated names", () => {
    expect(scan("[STUDENT] attends a K-12 school.").length).toBe(0);
    expect(scan("[STUDENT] worked with Mary-Kate today.").map((x) => x.text)).toEqual(["Mary-Kate"]);
  });

  it("ignores [STUDENT], [[blanks]] and single capital letters", () => {
    expect(scan("[STUDENT] reversed B, D and Z. [[line_type]] within 1/8 inch.").length).toBe(0);
  });

  it("catches a name typed into a blank, but not the library's own wording", () => {
    const w = scanForLibrary("During cutting tasks, he cut a heart for Ms. Rivera without deviation.", lib);
    expect(w.some((x) => x.kind === "name" && x.text.includes("Rivera"))).toBe(true);
    expect(scanForLibrary("During cutting tasks, he cut a heart without deviation.", lib)).toEqual([]);
  });
});
