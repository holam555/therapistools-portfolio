# Grading audit — full matrix sweep (2026-07-05)

Audit of whether Age and Challenge produce real, clinically sensible grading in
every mode. Method: for all **17 modes × 3 age bands × 3 challenge levels**,
generate seeded worksheets through the real `applyGrading()` path and extract
the *measurable task parameters* (grid dims, item counts, rotation counts,
palette sizes, contour gaps, wall counts, letter heights…), then spot-check the
actual buttons in the browser. Re-run the matrix with the snippet in
`.claude/skills/worksheet-grading` (verification recipe) after any grading
change.

## Verdict per mode (age-band steps at standard challenge)

| Mode | What changes 3-4 → 5-6 → 7-8 | Verdict |
|---|---|---|
| find | grid 3×3→4×4→5×5, rotated distractors 0→3→17, similar-shape pool at hard | **STRONG** |
| pattern | pattern dim 2→3→4, distractor subtlety (2-cell swap → similar 1-cell) | **STRONG** |
| count | 2 kinds/2×2 → 3/3×3 → 4/4×4, hard adds non-target distractors | **STRONG** |
| copy | dim 2→3→4, palette 2→3→4, rotation 0→2→12 cells | **STRONG** |
| sequence | rows 3→5→8; ≥1 period-3 row guaranteed at medium (F5) | **STRONG** |
| oddOneOut | rows 3→5→8; odd goes different-shape → similar-shape → rotation-only | **STRONG** |
| mirror | dim 2→3→4, filled cells 2→5→13 | **STRONG** |
| figureGround | shapes 6→8→10, size 62→46→35 r, + enforced overlap medium/hard (F1) | **STRONG** |
| closure | rows 3→5→8, contour present ~80%→62%→50% | **STRONG** |
| traceName | letter height 60→50→40px + reference/guide weight 4.5→3→2 (F2) | **STRONG** |
| handwriting | letter height 20→15→12 mm | **STRONG** |
| maze | 8×8→12×12→16×16 + shortcuts 25%→10%→0% | **STRONG** |
| connectDots | dots ~16→~31→~62 | **STRONG** |
| tracingPaths | rows 3→4→5, thickness thick→thin, row height ↓, curve segments ↑ | **STRONG** |
| scissorSkills | lines 4→6→8, curve amplitude/turns ↑ (path length 257→446→1265) | **STRONG** |
| visualScanning | grid 6×8→8×10→10×12, char large→small, targets 10→16→24 | **STRONG** |
| pixelArt | artwork 8×8→10×10→12×12, colors ↑ | **STRONG** |

Challenge (Easier/Just right/Harder) shifts the same ladder ±1 level in every
mode; ages 3–4 are capped at medium difficulty. Edge bands have one dead
direction by construction — the UI now disables that button (see fixes).

## Fixed in this pass

1. **Closure easy == medium contour gap.** The computed dash formula had a
   `max(3,…)` floor that collapsed 15% and 30% missing-contour to the same
   `8,3` pattern — the *core clinical lever* of closure didn't grade. Now
   explicit: `12,3` / `8,5` / `6,6` (~80/62/50% contour). Regression test.
2. **figureGround hard shared medium's size pool** (avg r 48 vs 49) — only the
   count changed. Now easy [50-70] / medium [38-55] / hard [28-42]. Test.
3. **Challenge dead buttons at edge bands.** At 3–4 "Easier" and at 7–8
   "Harder" silently did nothing (level clamp). Now disabled with an
   explanatory tooltip, and the selection snaps back to "Just right" when an
   age switch would strand it. Verified via real clicks.

## Follow-ups — status (2026-07-06, Opus pass)

- **F1 — figureGround overlap. DONE.** `generateFigureGroundMode` now builds
  overlapping CLUSTERS: cluster size 1/2/3 by difficulty, centres on a jittered
  grid, later shapes placed to cross the cluster anchor's contour. Measured
  over 30 seeds: overlap easy 0.2 / medium 1.0 / hard 0.9; bounding-box spread
  ≥0.38 at medium+ (a first naïve "anchor on nearest" version passed the 60%
  overlap check but collapsed all 10 shapes into one corner — the arm's-length
  screenshot caught it; hence the explicit cluster model + a spread assertion).
  Answer-key counts verified unchanged. Regression tests added.
- **F2 — traceName second lever. DONE.** Added graded support weight alongside
  letter height: reference-stroke width 4.5→3→2 and baseline width 1.6→1→0.7
  by difficulty (bold model + strong guides for the youngest, faint for the
  oldest). Smaller letters at 7–8 already fit more trace/write rows, so
  repetitions grade too. Files: `renderTraceNameMode` in `WorksheetPreview.tsx`.
  Regression test on reference stroke weight.
- **F3 — copy "memory" variant. DEFERRED (product decision, not a bug).**
  Blanking a model cell turns copy from *visual-motor copying* (the mode's
  stated skill) into a *visual-memory* task — a different clinical target.
  Left unimplemented pending an explicit product call; if wanted, gate it and
  state it clearly in the sheet's instructions.
- **F4 — scan target ratio. DONE.** `generateVisualScanningMode` base density
  now 25%/20%/15% by difficulty (+0.1 when the 'many' control is on), so older
  children scan more field per hit. Regression test.
- **F5 — sequence medium determinism. DONE.** Medium now forces the last row to
  period-3 if none was drawn, so a medium sheet is never all-period-2. Verified
  across 100 seeds. (Caveat: needs ≥3 shapes selected to realise period 3;
  default is 4.) Regression test.
- **F6 — template override hygiene. DONE.** Trimmed 7 override blocks: removed
  `exerciseCount` from the two `find` templates (the generator ignores it),
  dropped values that merely restated the age preset (`match-pattern`/
  `copy-pattern`/`count-shapes`/`odd-one-out`), and removed `letter-reversal-bd`'s
  off-slider `exerciseCount: 6` (rendered a lying slider; preset now gives 8).
  Kept genuine deviations (`match-pattern` 3×3, `mirror-image` 3×3+4, the
  `number-hunt`/`letter-hunt` density choices) and all content overrides
  (names, handwriting text/layout, shapes, themes). Note: a few templates still
  pin difficulty-scope fields (`pre-writing-strokes` thickness, `scissor-skills`
  count) that soften their age preset — kept because they change the sheet, but
  a future pass could align them to the preset if the curated intent is just
  "use the age default".

## Re-audit rule

Any change to `grading.ts`, `ageBandConfig`, or a generator's difficulty
branches → re-run the matrix sweep and the arm's-length screenshot test
(worksheet-grading skill), and re-run solvability checks at whatever
difficulty becomes a band default (worksheet-audit skill).
