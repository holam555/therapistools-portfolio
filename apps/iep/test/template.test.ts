import { describe, expect, it } from "vitest";
import { isReservedToken, parseTokens, renderSegments, renderText, slugifyVariableName, variableNames, variableSlots } from "../src/model/template";

describe("template tokens", () => {
  it("parses tokens and ignores reserved ones in variableNames", () => {
    const t = "{{Student}} cut a {{shape}} with {{accuracy}} accuracy; {{they}} used {{their}} {{shape}}.";
    expect(parseTokens(t).map((x) => x.name)).toEqual(["student", "shape", "accuracy", "they", "their", "shape"]);
    expect(variableNames(t)).toEqual(["shape", "accuracy"]);
    expect(isReservedToken("Their")).toBe(true);
    expect(isReservedToken("shape")).toBe(false);
  });

  it("renders pronouns for he and she, keeping capitalisation", () => {
    const t = "{{They}} stabilizes {{their}} paper {{themselves}}; cue {{them}}. It is {{theirs}}.";
    expect(renderText(t, { pronounSet: "he", values: {} }).text).toBe("He stabilizes his paper himself; cue him. It is his.");
    expect(renderText(t, { pronounSet: "she", values: {} }).text).toBe("She stabilizes her paper herself; cue her. It is hers.");
  });

  it("accepts he/him/his aliases inside braces", () => {
    expect(renderText("{{He}} lost {{his}} hat and {{him}}self", { pronounSet: "she", values: {} }).text).toBe("She lost her hat and herself");
  });

  it("substitutes the student placeholder and never a name", () => {
    expect(renderText("{{student}}'s results", { pronounSet: "he", values: {} }).text).toBe("[STUDENT]'s results");
  });

  it("reports missing variables and marks them in text", () => {
    const r = renderText("{{student}} cut with {{accuracy}} in {{trials}} trials ({{accuracy}}).", {
      pronounSet: "he",
      values: { trials: "4 out of 5" },
    });
    expect(r.text).toBe("[STUDENT] cut with [[accuracy]] in 4 out of 5 trials ([[accuracy]]).");
    expect(r.missing).toEqual(["accuracy"]);
    const segs = renderSegments("a {{x}} b", { pronounSet: "he", values: {} });
    expect(segs).toEqual([
      { kind: "text", text: "a " },
      { kind: "missing", name: "x", key: "x#0" },
      { kind: "text", text: " b" },
    ]);
  });

  it("gives each occurrence of a blank its own slot and value", () => {
    const t = "{{assistance_level}} for pants, while hygiene needs {{assistance_level}}.";
    expect(variableSlots(t).map((s) => s.key)).toEqual(["assistance_level#0", "assistance_level#1"]);
    const r = renderText(t, { pronounSet: "he", values: { "assistance_level#0": "moderate", "assistance_level#1": "maximum" } });
    expect(r.text).toBe("moderate for pants, while hygiene needs maximum.");
    const r2 = renderText(t, { pronounSet: "he", values: { assistance_level: "minimal" } });
    expect(r2.text).toBe("minimal for pants, while hygiene needs minimal.");
  });

  it("slugifies variable names", () => {
    expect(slugifyVariableName("Goal date!")).toBe("goal_date");
    expect(slugifyVariableName("2 out of 3")).toBe("v2_out_of_3");
    expect(slugifyVariableName("   ")).toBe("value");
  });
});
