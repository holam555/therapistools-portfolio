import type { DisciplineId } from "../model/disciplines";

/** Which saved template a row in the account holds. Rows of the retired kind "overrides" (OT edits before 2026-11-03) are left alone. */
export type TemplateKind = "pack";

/**
 * Fired on window whenever a template pack is saved in this browser. The account sync listens for it.
 * Drafts, filled values, ratings, recipes and the sentence library never
 * fire it: they stay in the browser.
 */
export const TEMPLATE_CHANGED = "easyiep:template-changed";

export interface TemplateChangedDetail {
  discipline: DisciplineId;
  kind: TemplateKind;
}

export function announceTemplateChange(detail: TemplateChangedDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<TemplateChangedDetail>(TEMPLATE_CHANGED, { detail }));
  } catch {
    /* not in a browser */
  }
}
