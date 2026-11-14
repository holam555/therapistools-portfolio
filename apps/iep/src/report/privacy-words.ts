import type { Library } from "../model/types";
import { buildAllowList, scanText, type PrivacyWarning } from "../model/privacy";
import { OPTION_LISTS } from "./options";
import { premadeStrings } from "./premade";

/**
 * Capitalised words that belong to the ready-made report templates (test
 * names, scale names, sentence starts in the examples, dropdown choices). They
 * are ordinary report wording, not names, so the privacy check should not flag
 * them when a writer edits a template or fills a blank.
 */
let cache: Set<string> | null = null;

export function templateWords(): Set<string> {
  if (cache) return cache;
  const texts: string[] = [...premadeStrings()];
  for (const l of Object.values(OPTION_LISTS)) texts.push(...l.options);
  const words = new Set<string>();
  for (const t of texts) for (const w of t.match(/[A-Z][A-Za-z'’-]*/g) ?? []) words.add(w);
  cache = words;
  return words;
}

/** The privacy check for report text: the writer's never-allow list, their library's wording, and the templates' own words. */
export function scanReportText(text: string, lib: Library): PrivacyWarning[] {
  const allow = buildAllowList(lib);
  for (const w of templateWords()) allow.add(w);
  return scanText(text, { neverAllow: lib.neverAllow, allow });
}
