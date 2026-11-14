import { WorksheetConfig, WorksheetMode, Difficulty, ChallengeLevel } from '@/lib/shapes';
import { AgeBand } from '@/lib/defaultConfig';

/**
 * Grading — the layer that makes Age and Challenge produce VISIBLY different
 * worksheets. (See .claude/skills/worksheet-grading for the decision process.)
 *
 * Three inputs resolve to one grade LEVEL (0 | 1 | 2):
 *
 *   level = clamp( ageBandIndex + challengeShift )
 *
 * where Challenge is the parent-facing nudge ("she's 5 but this is too easy"):
 * easier −1 · standard 0 · harder +1. The level then drives BOTH grading
 * layers:
 *
 *  1. SCOPE, at the config level (this file): search-field size, rows, line
 *     thickness, letter height. What a parent sees change at arm's length.
 *  2. SUBTLETY, via `difficulty` consumed inside the generators: target
 *     ratios, rotation, distractor similarity, gaps, maze shortcuts, artwork
 *     tier. The difficulty ladder is simply easy/medium/hard by level, capped
 *     for very young children (ages 3–4 never get 'hard').
 *
 * Config-level on purpose: the user's explicit controls (Grid Size, Rows, …)
 * keep working — Age/Challenge re-grade them, and the user can fine-tune
 * afterwards. Template `overrides` win over these presets (a curated template
 * is a deliberate choice).
 */

export type GradeLevel = 0 | 1 | 2;

const bandIndex = (band: AgeBand): GradeLevel => (band === '3-4' ? 0 : band === '5-6' ? 1 : 2);
const shiftOf = (c: ChallengeLevel): number => (c === 'easier' ? -1 : c === 'harder' ? 1 : 0);
const clampLevel = (n: number): GradeLevel => (n < 0 ? 0 : n > 2 ? 2 : n) as GradeLevel;

/** Scope preset for a grade level. Values are clinical judgment calls, tuned
 *  so each step is a real step (~+30–70% more cells/items per level). */
export function presetForLevel(mode: WorksheetMode, level: GradeLevel): Partial<WorksheetConfig> {
  const pick = <T,>(a: T, b: T, c: T): T => [a, b, c][level];

  switch (mode) {
    // Search field grows: 9 → 16 → 25 cells.
    case 'find':
      return { gridSize: pick(3, 4, 5) };
    // count = N reference shapes + N×N cells; 2 → 3 → 4 kinds to tally.
    case 'count':
      return { gridSize: pick(2, 3, 4) };
    // Visual-motor copying: grid grows, exercise count stays printable.
    case 'copy':
      return { gridSize: pick(2, 3, 4), exerciseCount: 3 };
    case 'mirror':
      return { gridSize: pick(2, 3, 4), exerciseCount: 3 };
    case 'pattern':
      return { gridSize: pick(2, 3, 4), exerciseCount: 3 };
    // Row-based puzzles: more rows (values must exist on the slider: 3|5|8).
    case 'sequence':
    case 'oddOneOut':
    case 'closure':
      return { exerciseCount: pick(3, 5, 8) };
    // Maze: physical size is the scope lever; difficulty adds/removes shortcuts.
    case 'maze':
      return { mazeSize: pick('small', 'medium', 'large') };
    // Pre-writing: more rows and thinner guide lines as control matures.
    case 'tracingPaths':
      return { tracingRows: pick(3, 4, 5), tracingThickness: pick('thick', 'medium', 'thin') };
    case 'scissorSkills':
      return { scissorLineCount: pick(4, 6, 8) };
    // Cancellation: denser grids and smaller characters.
    case 'visualScanning':
      return { visualScanDensity: pick('small', 'medium', 'large'), visualScanCharSize: pick('large', 'medium', 'small') };
    // Handwriting: letter height in mm shrinks as control matures.
    case 'handwriting':
      return { handwritingFontSizeMm: pick(20, 15, 12) };
    // These grade fully through difficulty (connectDots: dot count; pixelArt:
    // artwork tier; figureGround: shape count/size; traceName: letter height).
    case 'connectDots':
    case 'figureGround':
    case 'pixelArt':
    case 'traceName':
      return {};
  }
}

/** Back-compat wrapper: the standard (unshifted) preset for an age band. */
export function agePresetForMode(mode: WorksheetMode, band: AgeBand): Partial<WorksheetConfig> {
  return presetForLevel(mode, bandIndex(band));
}

/**
 * Resolve age band + parent Challenge into the full grade: difficulty
 * (subtlety, capped so ages 3–4 never get 'hard') + scope preset.
 * Apply with spread: `update({ challenge, ...applyGrading(mode, band, challenge) })`.
 */
export function applyGrading(mode: WorksheetMode, band: AgeBand, challenge: ChallengeLevel): Partial<WorksheetConfig> {
  const level = clampLevel(bandIndex(band) + shiftOf(challenge));
  const ladder: Difficulty[] = ['easy', 'medium', 'hard'];
  const maxDifficultyIdx = band === '3-4' ? 1 : 2; // age cap: 3–4 tops out at medium
  const difficulty = ladder[Math.min(level, maxDifficultyIdx)];
  return { difficulty, ...presetForLevel(mode, level) };
}
