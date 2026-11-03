import { OPTION_LISTS } from "./options";
import { otReportSections } from "./ot-pack";
import { emptyOverrides, loadOverrides, saveOverrides, type BlockOverride, type TemplateOverrides } from "./overrides";
import { blockKeyOf } from "./render";
import { defaultSetup, withGrade } from "./setup";
import { GRADE_GROUPS, type ReportSetup } from "./types";

/**
 * One-time move, 2026-11-03: the built-in OT wording is about to be rewritten
 * as a generic sample. A browser that has used the IEP Writer before keeps
 * the wording it has by copying every built-in paragraph, label, sample
 * sentence, section title and dropdown list into the writer's own template
 * edits. Their own edits stay on top. After that, the rewrite changes nothing
 * for them, and "Reset to original" gives the generic sample.
 */

/** Every combination of choices that changes which paragraphs exist. */
export function wordingSetups(): ReportSetup[] {
  const out: ReportSetup[] = [];
  const areas = [
    { fine: true, gross: true, sensory: true },
    { fine: false, gross: false, sensory: false },
    { fine: false, gross: true, sensory: false },
    { fine: true, gross: false, sensory: true },
  ];
  for (const g of GRADE_GROUPS)
    for (const reportType of ["evaluation", "annual"] as const)
      for (const concerns of [true, false])
        for (const teacherAreas of areas)
          for (const serviceType of ["direct", "indirect"] as const)
            out.push({ ...withGrade(defaultSetup(), g.id), reportType, concerns, teacherAreas, serviceType, objectives: 3, goalAreas: ["writing", "cutting", "selfcare"] });
  return out;
}

/** The whole built-in template as edits, with the writer's own edits laid on top. */
export function fullOverrides(existing: TemplateOverrides = emptyOverrides()): TemplateOverrides {
  const o = emptyOverrides();
  for (const setup of wordingSetups())
    for (const s of otReportSections(setup)) {
      if (!o.titles[s.id]) o.titles[s.id] = s.title;
      // Samples a section borrows from its paragraphs are frozen with those paragraphs below, so each version of the
      // section keeps its own; only a section's own samples are frozen here.
      const borrowed = JSON.stringify(s.blocks.flatMap((b) => b.examples ?? [])) === JSON.stringify(s.examples);
      if (s.examples.length && !borrowed && !o.sectionExamples[s.id]) o.sectionExamples[s.id] = [...s.examples];
      s.blocks.forEach((b, i) => {
        // Lines written from setup choices (ratings, objective count) are not wording.
        if (b.generated) return;
        const k = `${s.id}/${blockKeyOf(b, i)}`;
        if (o.blocks[k]) return;
        const ov: BlockOverride = { text: b.text };
        if ("label" in b && b.label !== undefined) ov.label = b.label;
        if (b.examples) ov.examples = [...b.examples];
        o.blocks[k] = ov;
      });
    }
  // Dropdown choices are wording too; the year list is just the calendar.
  for (const [name, list] of Object.entries(OPTION_LISTS)) if (name !== "year") o.lists[name] = [...list.options];

  for (const [k, v] of Object.entries(existing.blocks)) o.blocks[k] = { ...(o.blocks[k] ?? {}), ...v };
  return {
    ...o,
    sectionExamples: { ...o.sectionExamples, ...existing.sectionExamples },
    lists: { ...o.lists, ...existing.lists },
    screen: existing.screen,
    grids: existing.grids,
    titles: { ...o.titles, ...existing.titles },
  };
}

const FLAG = "easyiep.template.frozen";
/** The OT sentence bank is saved on the first visit, so its presence means this browser has used the tool before. */
const USED_KEY = "easyiep.library";

/**
 * Run once at start-up. A browser that used the tool before the rewrite keeps
 * its wording; a new browser gets the generic sample and nothing is written.
 */
export function freezeTemplateOnce(storage: Storage = localStorage): boolean {
  try {
    if (storage.getItem(FLAG)) return false;
    const used = storage.getItem(USED_KEY) !== null;
    if (used) saveOverrides("ot", fullOverrides(loadOverrides("ot")));
    storage.setItem(FLAG, "1");
    return used;
  } catch {
    return false;
  }
}
