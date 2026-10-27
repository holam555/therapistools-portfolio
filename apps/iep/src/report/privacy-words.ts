import type { Library } from "../model/types";
import { buildAllowList, scanText, type PrivacyWarning } from "../model/privacy";
import { otReportSections } from "./ot-pack";
import { SCREEN_ITEMS } from "./ot-screen";
import { OPTION_LISTS } from "./options";
import { BUILT_IN_GRIDS } from "./overrides";
import { defaultSetup } from "./setup";
import { GRADE_GROUPS } from "./types";

/**
 * Capitalised words that belong to the built-in report template (test names,
 * scale names, sentence starts in the examples, dropdown choices). They are
 * ordinary report wording, not names, so the privacy check should not flag
 * them when a writer edits the template or fills a blank.
 */
let cache: Set<string> | null = null;

export function templateWords(): Set<string> {
  if (cache) return cache;
  const texts: string[] = [];
  for (const g of GRADE_GROUPS)
    for (const reportType of ["evaluation", "annual"] as const)
      for (const concerns of [true, false])
        for (const s of otReportSections({ ...defaultSetup(g.id), reportType, concerns })) {
          texts.push(s.title, ...s.examples);
          for (const b of s.blocks) texts.push(b.text, ("label" in b && b.label) || "", ...(b.examples ?? []));
        }
  for (const items of Object.values(SCREEN_ITEMS)) for (const i of items) texts.push(i.label, i.opener, ...i.examples);
  for (const l of Object.values(OPTION_LISTS)) texts.push(...l.options);
  for (const g of Object.values(BUILT_IN_GRIDS)) {
    texts.push(g.title, g.blank, g.none ?? "", g.allClear ?? "");
    for (const l of g.levels) texts.push(l.label, l.sentence);
    for (const group of g.groups) texts.push(group.label, ...group.rows.map((r) => r.label));
  }
  const words = new Set<string>();
  for (const t of texts) for (const w of t.match(/[A-Z][A-Za-z'’-]*/g) ?? []) words.add(w);
  cache = words;
  return words;
}

/** The privacy check for report text: the writer's never-allow list, their library's wording, and the template's own words. */
export function scanReportText(text: string, lib: Library): PrivacyWarning[] {
  const allow = buildAllowList(lib);
  for (const w of templateWords()) allow.add(w);
  return scanText(text, { neverAllow: lib.neverAllow, allow });
}
