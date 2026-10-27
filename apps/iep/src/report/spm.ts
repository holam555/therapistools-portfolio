import { gridItemLabels, gridSummaryPhrase, ratingKey, type GridDef, type GridRatings } from "./grids";

/**
 * SPM-2 School form as a rating grid: the scales and the three result ranges
 * used in the author's reports. Results are written one line per range.
 */

export type SpmResult = "typical" | "moderate" | "severe";

const SCALES = ["Social Participation", "Vision", "Hearing", "Touch", "Taste and Smell", "Body Awareness", "Balance and Motion", "Planning and Ideas", "Sensory Total"];

export const SPM_GRID: GridDef = {
  id: "spm2",
  title: "Choose results by scale",
  layout: "byLevel",
  blank: "[[scales at this level, or none]]",
  none: "None",
  allClear: "within the typical range across all areas",
  levels: [
    { value: "typical", label: "Typical Processing", sentence: "{items}" },
    { value: "moderate", label: "Moderate Difficulties", sentence: "{items}", concern: true },
    { value: "severe", label: "Severe Difficulties", sentence: "{items}", concern: true },
  ],
  groups: [{ id: "scales", label: "Scales", rows: SCALES.map((s) => ({ id: s, label: s, ...(s === "Sensory Total" ? { composite: true } : {}) })) }],
};

export const SPM_RESULTS = SPM_GRID.levels;
export const SPM_SCALES = SCALES;
export type SpmResults = GridRatings;

/** Ratings as stored: keyed "scales.<scale>". */
export const spmKey = (scale: string) => ratingKey("scales", scale);

/** The scales named in the intro sentence (every scale but the composite). */
export const spmScaleList = (def: GridDef = SPM_GRID) => gridItemLabels(def).join(", ");

/** A phrase for the summary, e.g. "affected with Severe Difficulties for Vision and Touch". */
export function spmSummaryPhrase(results: SpmResults, def: GridDef = SPM_GRID): string | null {
  return gridSummaryPhrase(def, results);
}
