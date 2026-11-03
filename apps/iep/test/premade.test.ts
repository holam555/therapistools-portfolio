import { describe, expect, it } from "vitest";
import { checkTemplate } from "../src/account/sync";
import { starterLibrary } from "../src/model/defaults";
import type { DisciplineId } from "../src/model/disciplines";
import { parseBlank } from "../src/report/options";
import { normalizePack, packGrids, packSections, type PackSection, type TemplatePack } from "../src/report/pack";
import { PREMADE_DISCIPLINES, premadePack, premadeStrings } from "../src/report/premade";
import { sectionText } from "../src/report/render";
import { defaultSetup } from "../src/report/setup";
import { GRADE_GROUPS, type ReportSetup } from "../src/report/types";

// The ready-made packs are template wording only: no student, no names, no
// dates, and every mark the renderer expects where it expects it.

const PRONOUN = /\b(he|him|his|she|her|hers|himself|herself)\b/i;

function allSetups(): ReportSetup[] {
  const out: ReportSetup[] = [];
  for (const g of GRADE_GROUPS)
    for (const reportType of ["evaluation", "annual"] as const)
      for (const concerns of [true, false])
        for (const pronoun of ["he", "she"] as const) out.push({ ...defaultSetup(g.id), reportType, concerns, pronoun });
  return out;
}

function allPackSections(pack: TemplatePack): PackSection[] {
  return [...pack.sections, ...pack.assessments.flatMap((a) => a.sections)];
}

function strings(data: unknown, out: string[] = []): string[] {
  if (typeof data === "string") out.push(data);
  else if (Array.isArray(data)) for (const v of data) strings(v, out);
  else if (data && typeof data === "object") for (const v of Object.values(data as Record<string, unknown>)) strings(v, out);
  return out;
}

describe.each(PREMADE_DISCIPLINES.map((d) => [d] as [DisciplineId]))("ready-made %s pack", (d) => {
  const pack = premadePack(d)!;

  it("exists and survives storage unchanged", () => {
    expect(pack).not.toBeNull();
    expect(pack.version).toBe(1);
    expect(normalizePack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
  });

  it("renders every section with no leftover marks for every grade, report type, result and pronoun", () => {
    for (const setup of allSetups())
      for (const s of packSections(pack, setup)) {
        const text = sectionText(s, setup.pronoun);
        const where = `${d} ${s.id} (${setup.grade} ${setup.reportType} ${setup.concerns} ${setup.pronoun})`;
        expect(text, where).not.toMatch(/\{\{|\}\}/);
        expect(text, where).not.toMatch(/::/);
        expect(text, where).not.toMatch(/\bXX+\b/);
        for (const e of s.examples) expect(e, where).not.toMatch(/\bXX+\b|\{\{|\}\}|::/);
      }
  });

  it("writes [STUDENT] once, before any pronoun, in each section", () => {
    for (const setup of allSetups())
      for (const s of packSections(pack, setup)) {
        const text = sectionText(s, setup.pronoun).replace(/^[^\n]*\n/, "");
        const count = (text.match(/\[STUDENT\]/g) ?? []).length;
        expect(count, `${d} ${s.id} uses [STUDENT] ${count} times`).toBeLessThanOrEqual(1);
        const pronounAt = text.search(PRONOUN);
        if (pronounAt >= 0) {
          expect(text.indexOf("[STUDENT]"), `${d} ${s.id}: pronoun before [STUDENT]`).toBeGreaterThanOrEqual(0);
          expect(text.indexOf("[STUDENT]"), `${d} ${s.id}: pronoun before [STUDENT]`).toBeLessThan(pronounAt);
        }
      }
    for (const s of allPackSections(pack)) {
      const mentions = s.blocks.filter((b) => b.kind !== "grid" && /\{\{\s*student\s*\}\}/i.test(b.text)).length;
      expect(mentions, `${d} ${s.id} mentions {{student}} ${mentions} times`).toBeLessThanOrEqual(1);
    }
  });

  it("builds a full evaluation and an annual review with the goal and a present-levels header", () => {
    for (const g of GRADE_GROUPS) {
      const base = defaultSetup(g.id);
      const evaluation = packSections(pack, { ...base, reportType: "evaluation", concerns: true }).map((s) => s.id);
      expect(evaluation.length, `${d} ${g.id}`).toBeGreaterThanOrEqual(5);
      const annual = packSections(pack, { ...base, reportType: "annual", concerns: true }).map((s) => s.id);
      expect(annual[0], `${d} ${g.id}`).toBe("present-levels");
      expect(annual, `${d} ${g.id}`).toContain("goal");
      expect(packSections(pack, { ...base, reportType: "annual", concerns: false }).map((s) => s.id), `${d} ${g.id}`).toContain("ending");
      const noConcerns = packSections(pack, { ...base, reportType: "evaluation", concerns: false }).map((s) => s.id);
      expect(noConcerns, `${d} ${g.id}`).not.toContain("goal");
      expect(noConcerns, `${d} ${g.id}`).not.toContain("service");
    }
  });

  it("changes at least one assessment with grade, covering every grade group", () => {
    const byGrade = pack.assessments.filter((a) => a.sections.some((s) => s.when?.grades));
    expect(byGrade.length, d).toBeGreaterThanOrEqual(1);
    for (const a of byGrade) {
      const covered = new Set(a.sections.flatMap((s) => s.when?.grades ?? []));
      for (const g of GRADE_GROUPS) expect(covered.has(g.id), `${d} ${a.id} has no section for ${g.id}`).toBe(true);
    }
  });

  it("names only lists and grids the pack has, and keeps ids unique", () => {
    const grids = packGrids(pack);
    const sectionIds = new Set<string>();
    for (const s of allPackSections(pack)) {
      expect(sectionIds.has(s.id), `${d} duplicate section ${s.id}`).toBe(false);
      sectionIds.add(s.id);
      expect(s.blocks.length, `${d} ${s.id} has no blocks`).toBeGreaterThan(0);
      const blockIds = new Set<string>();
      for (const b of s.blocks) {
        const id = b.id ?? "";
        expect(id, `${d} ${s.id} block without id`).toBeTruthy();
        expect(blockIds.has(id), `${d} ${s.id} duplicate block ${id}`).toBe(false);
        blockIds.add(id);
        if (b.kind === "grid") expect(grids[b.grid], `${d} ${s.id} names unknown grid ${b.grid}`).toBeDefined();
      }
      const hasBlanks = s.blocks.some((b) => b.kind === "grid" || b.text.includes("[["));
      if (hasBlanks) expect(s.examples.length, `${d} ${s.id} has no examples`).toBeGreaterThan(0);
      for (const e of s.examples) expect(e, `${d} ${s.id} example`).toMatch(/\[STUDENT\]/);
    }
    for (const text of strings(pack))
      for (const m of text.matchAll(/\[\[(.+?)\]\]/g)) {
        const { list } = parseBlank(m[1]);
        if (list) expect(pack.lists[list], `${d}: blank "${m[0]}" names a list the pack does not have`).toBeDefined();
      }
    for (const [name, list] of Object.entries(pack.lists)) expect(list.options.length, `${d} list ${name} is empty`).toBeGreaterThan(0);
    const assessmentIds = pack.assessments.map((a) => a.id);
    expect(new Set(assessmentIds).size).toBe(assessmentIds.length);
  });

  it("holds nothing the privacy gate would block", () => {
    const check = checkTemplate(pack, starterLibrary());
    expect(check.blocking).toEqual([]);
    for (const text of strings(pack)) expect(text).not.toMatch(/https?:\/\/|@/);
  });
});

describe("premade packs", () => {
  it("builds a fresh copy on every call", () => {
    const a = premadePack("slp");
    const b = premadePack("slp");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a!.assessments[0].grid).not.toBe(b!.assessments[0].grid);
    expect(a!.lists.minutes).not.toBe(b!.lists.minutes);
  });

  it("lists every discipline and every string of every pack", () => {
    expect(PREMADE_DISCIPLINES).toEqual(["ot", "slp", "pt", "psych", "sped", "other"]);
    const all = premadeStrings();
    expect(all).toContain("Occupational Therapy Evaluation Report");
    expect(all).toContain("Informal Fine Motor Screen");
    expect(all).toContain("Speech-Language Evaluation Report");
    expect(all).toContain("Gross Motor Screen");
    expect(all).toContain("Functional Communication");
    expect(all).toContain("Classroom Performance Checklist");
    expect(all).toContain("typical for every item on the checklist");
    for (const d of PREMADE_DISCIPLINES) for (const s of strings(premadePack(d))) expect(all).toContain(s);
  });

  it("keeps the shared dropdown lists", () => {
    for (const d of PREMADE_DISCIPLINES) {
      const lists = premadePack(d)!.lists;
      for (const name of ["disability", "minutes", "location", "month", "year", "percent", "dataDates", "objectivesMet"]) expect(lists[name], `${d} ${name}`).toBeDefined();
    }
    expect(premadePack("ot")!.lists.grasp.options).toContain("tripod");
    expect(premadePack("slp")!.lists.articulationErrors.options).toContain("/r/");
    expect(premadePack("pt")!.lists.mobility.options).toContain("walks with a walker");
    expect(premadePack("psych")!.lists.cognitiveDescriptor.options).toContain("Average");
    expect(premadePack("sped")!.lists.readingSkills.options).toContain("decoding");
  });
});
