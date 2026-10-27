import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertPlaceholders, convertPronouns, splitIntoRows, splitSentences } from "../src/model/splitter";

const sample = readFileSync(new URL("./fixtures/sample-report.txt", import.meta.url), "utf8");

describe("splitSentences", () => {
  it("splits on . ? ! followed by a capital", () => {
    expect(splitSentences("One here. Two here! Three here? four not")).toEqual(["One here.", "Two here!", "Three here? four not"]);
  });
  it("does not split inside parentheses or quotes", () => {
    expect(splitSentences('She wrote "the." Then (i.e. triangle, X. R) stopped. Done.')).toEqual([
      'She wrote "the."',
      "Then (i.e. triangle, X. R) stopped.",
      "Done.",
    ]);
  });
  it("keeps abbreviations and code-like tokens together", () => {
    expect(splitSentences("Use e.g. Scissors. WLP.1.1. Independently print letters.")).toEqual([
      "Use e.g. Scissors.",
      "WLP.1.1. Independently print letters.",
    ]);
  });
  it("collapses a double period", () => {
    expect(splitSentences("after a verbal cue.. She then colored.")).toEqual(["after a verbal cue.", "She then colored."]);
  });
});

describe("convertPlaceholders", () => {
  it("turns XX into the student token", () => {
    expect(convertPlaceholders("XX and xx and XX’s and XX's").text).toBe("{{student}} and {{student}} and {{student}}'s and {{student}}'s");
  });
  it("turns bracket blanks into variables and XX minutes into {{minutes}}", () => {
    const r = convertPlaceholders("XX [XX disability]] needs XX minutes. [STUDENT] too.");
    expect(r.text).toBe("{{student}} {{disability}} needs {{minutes}} minutes. {{student}} too.");
    expect(r.variables).toEqual(["minutes", "disability"]);
  });
  it("leaves number ranges alone", () => {
    expect(convertPlaceholders("delays 80–100% of the time").text).toBe("delays 80–100% of the time");
  });
});

describe("convertPronouns", () => {
  it("maps pronouns to tokens and guesses her", () => {
    const r = convertPronouns("She stabilized her paper after the teacher cued her. His work was his. He did it himself.");
    expect(r.text).toBe(
      "{{They}} stabilized {{their}} paper after the teacher cued {{them}}. {{Their}} work was {{their}}. {{They}} did it {{themselves}}.",
    );
    expect(r.ambiguous).toBe(2);
  });
});

describe("splitIntoRows on the sample report", () => {
  const rows = splitIntoRows(sample, ["Fine Motor", "Sensory", "Self Care"]);
  const sentences = rows.filter((r) => r.kind === "sentence");

  it("finds the headings and cascades them", () => {
    const fm = rows.find((r) => r.text === "Fine motor");
    expect(fm?.kind).toBe("heading");
    expect(fm?.headingLevel).toBe("domain");
    const cutting = sentences.find((r) => r.text.startsWith("During cutting tasks"));
    expect(cutting?.domainName).toBe("Fine motor");
    expect(cutting?.taskName).toBe("Cutting");
    expect(cutting?.labelTask).toBe("Cutting");
  });

  it("never splits inside i.e., codes, or parentheses", () => {
    const texts = sentences.map((r) => r.text);
    expect(texts.some((t) => t.includes("(i.e. triangle, X, R, K, Q, Y, y)."))).toBe(true);
    expect(texts.some((t) => t.startsWith("WLP.1.1. Independently"))).toBe(true);
    expect(texts.some((t) => t.includes('("jmup" for "jump").'))).toBe(true);
    expect(texts.every((t) => !t.endsWith(".."))).toBe(true);
  });

  it("converts placeholders and suggests variables", () => {
    const impact = sentences.find((r) => r.text.includes("{{disability}}"));
    expect(impact?.text.startsWith("{{student}} {{disability}} impacts")).toBe(true);
    expect(impact?.suggestedVariables).toEqual(["disability"]);
    expect(sentences.some((r) => r.text.startsWith("{{minutes}} minutes of occupational therapy"))).toBe(true);
    expect(sentences.every((r) => !/\bxx\b/i.test(r.text))).toBe(true);
  });

  it("keeps bare list items as items", () => {
    expect(rows.filter((r) => r.kind === "item").map((r) => r.text)).toContain("Taste and Smell");
  });

  it("produces a stable number of sentence rows", () => {
    expect(sentences.length).toBe(43);
  });
});
