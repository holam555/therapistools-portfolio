---
name: worksheet-grading
description: Make age bands and difficulty produce genuinely different OTsheet worksheets. Use when adding a new worksheet mode or template, when tuning what Ages 3-4/5-6/7-8 or easy/medium/hard means for a mode, or when anyone reports that changing age or difficulty "does nothing" / "looks the same" on a worksheet. Explains the two-layer grading architecture (age = scope presets in grading.ts, difficulty = subtlety in the generators) and the decision process for choosing grading levers.
---

# Worksheet grading (age & difficulty)

The core promise of OTsheet is a worksheet matched to *this* child. That promise
dies quietly when an age button or difficulty setting changes nothing visible —
which happens whenever the grading levers aren't connected to the parameters
that actually make that task harder. This skill records the architecture, the
decision process, and the traps, so future grading work stays coherent.

## The control model (parent-facing)

Parents get exactly TWO grading controls, both in the core panel:
- **Age** (3–4 / 5–6 / 7–8) — who the child is.
- **Challenge** (Easier / Just right / Harder) — a nudge relative to the age
  ("she's 5 but this is too easy"). There is deliberately NO separate
  Easy/Medium/Hard override anymore — it competed with Age and parents didn't
  know which to trust. Both resolve through ONE function:
  `applyGrading(mode, band, challenge)` in `grading.ts`:

      level = clamp( ageBandIndex + challengeShift )   // 0 | 1 | 2

  The level drives the scope preset (`presetForLevel`) AND the difficulty
  ladder easy/medium/hard (capped: ages 3–4 never get 'hard'). The age ladder
  is complete on purpose — 3–4→easy, 5–6→medium, 7–8→hard — because when two
  bands shared a difficulty, the difficulty-only modes produced identical
  sheets for them.

`challenge` is a WorksheetConfig field, but only as UI provenance (which
button is lit): its EFFECTS are applied eagerly to the other fields at click
time, same pattern as `handwritingLayout`. It's listed in the Editor's
COSMETIC_FIELDS so the field alone never re-rolls a puzzle.

## The two-layer architecture (do not collapse it)

**Layer 1 — AGE = task SCOPE, at the config level** (`src/lib/grading.ts`,
`agePresetForMode(mode, band)`): how big the search field is, how many rows,
how thick the lines, how large the letters. Applied by all three entry points:

- Age buttons in `CustomizeControls.tsx`
- Child profiles in `Editor.tsx` (`profileBase`)
- Templates in `templates.ts` (`templateConfig`) — **template `overrides`
  intentionally win** over the preset; a curated template is a deliberate
  choice.

Age also maps to a default difficulty via `ageBandConfig()` in
`defaultConfig.ts` (3-4→easy, 5-6→medium, 7-8→hard; `applyGrading` caps the
ladder so ages 3–4 never receive 'hard').

**Layer 2 — DIFFICULTY = task SUBTLETY, inside the generators** (`shapes.ts`):
target-to-distractor ratio, rotation, distractor similarity
(`SIMILAR_SHAPES`/`VISIBLE_ROTATIONS`), closure gap size, maze shortcut
density, scissor curve amplitude, pixel-art artwork tier.

Why config-level for scope: the user's explicit controls (Grid Size, Rows…)
keep working — an age click re-grades them, and the user can still fine-tune
afterwards. If a generator silently overrode `config.gridSize` from
`difficulty`, the Grid Size control would become a lie (that exact class of
bug — visible control, no effect — is what the `worksheet-audit` skill exists
to catch).

## Decision process for grading a mode (new or under-graded)

1. **Name what makes THIS task harder for a child.** Be concrete per skill
   domain: search tasks → field size + distractor count/similarity; motor
   tasks → line length/amplitude/thickness; memory/copy tasks → grid size +
   palette size; handwriting → letter size + guide visibility. If you can't
   name the lever, don't fake it with a no-op setting — grade something real
   (a Challenge click must always change the sheet).
2. **Split the levers:** the *visible-at-arm's-length* lever (a parent holding
   two sheets should instantly see which is for the older kid) goes in the AGE
   preset; the *look-closer* levers (rotation, similarity, ratios) go in the
   generator's difficulty branches.
3. **Each age step must be a real step** — roughly +30–70% more cells/items,
   or a clear physical change (thick→thin, 20mm→12mm). If two bands would get
   the same values, you haven't found the right lever yet.
4. **Respect the frames:** everything must still fit A4 (595×842). Check the
   layout math caps (`PATTERN_MAX_EXERCISES`, per-row min heights) and use
   only slider-representable values where a slider exists (exercise slider
   snaps to 3|5|8|10 — presets like 6 render a lying slider position).
5. **Wire all three entry points** (or confirm the preset flows through
   `templateConfig` to them). A preset that only works from the Age button but
   not from a child profile is a half-fix.

## Verification recipe (all three, every time)

1. **Data-level test** in `src/test/audit.test.tsx` (see `age-band grading
   presets` + `challenge grading` describe blocks): preset values differ
   across bands AND challenge levels, the 3–4 hard-cap holds, keys are real
   `WorksheetConfig` fields, template overrides still win.
2. **Live button-path check:** in the preview browser, click Ages 3–4 → 5–6 →
   7–8 on a real template and confirm the rendered SVG changes structurally
   (e.g. count internal grid lines), not just re-rolls.
3. **The arm's-length screenshot test:** screenshot the youngest and oldest
   band. If you can't tell at a glance which sheet is for the older child,
   the grading isn't done — go back to step 1 of the decision process.

## Current preset table (tune here, don't re-derive)

`grading.ts` is the single source of truth. As of 2026-07-05: find 3→4→5 grid;
count 2→3→4; copy/mirror/pattern 2→3→4 grid @3 exercises; sequence/oddOneOut/
closure 3→5→8 rows; maze small→medium→large; tracingPaths 3→4→5 rows,
thick→medium→thin; scissorSkills 4→6→8 lines; visualScanning density
small→medium→large + char large→medium→small; handwriting 20→15→12 mm.
connectDots / figureGround / pixelArt / traceName grade via difficulty alone
(dot count, shape count/size, artwork tier, letter height) — that's deliberate;
their generators already respond strongly.

## Traps hit before (don't repeat)

- A fixed count that saturates: mirror once used 3/5/7 shapes — on a 2×2 grid
  all difficulties filled every cell identically. Scale by capacity
  (fraction of grid), not absolute counts.
- Min/max floors that collapse levels: closure's computed dash gap had a
  `max(3,…)` floor that made easy and medium produce the SAME contour gap —
  the mode's core clinical lever didn't grade. Prefer explicit per-level
  values over formulas with clamps; assert all three outputs are distinct.
- Clamped edge levels: at ages 3–4 "Easier" and at 7–8 "Harder" have nowhere
  to go — those buttons are disabled with a tooltip (and the selection snaps
  to "Just right" on age switch). Keep that honest-UI behavior if levels are
  ever added or removed. Full audit + follow-ups: see GRADING_AUDIT.md.
- Difficulty levers that are invisible at the actual render size (±15%
  shapeScale on a 170px cell reads as "the same"). If a lever can't be seen,
  it isn't grading.
- A metric can pass while the layout is wrong. figureGround's overlap check
  read 94% while every shape had collapsed into one corner clump (each new
  shape anchored on the nearest already-placed one → snowball). The
  arm's-length screenshot caught what the number hid. Fix was an explicit
  cluster model (distributed centres + local overlap) AND a second assertion on
  spatial spread (bounding-box coverage). Lesson: when a fix moves geometry,
  assert BOTH the intended property and that you didn't wreck distribution —
  and always look at it (verification step 3 is not optional).
- Rotation as the "hard" discriminator on rotation-symmetric shapes — see
  `VISIBLE_ROTATIONS` and the worksheet-audit skill.
- Setting preset fields the mode's generator never reads (check the generator
  actually consumes the field before presetting it).
- Forgetting the age→difficulty caps: never preset `difficulty: 'hard'` for a
  band whose `childAge` disallows it (`applyGrading` clamps this — go through
  it, don't set difficulty directly from UI code).
- Raising a band's default difficulty can SURFACE latent generator bugs at
  that difficulty. When 7–8 moved to default-hard, odd-one-out "letters, hard"
  exposed near-identical case pairs (c/C, o/O, s/S…) that made rows
  unsolvable — hardBase is now restricted to visually distinct pairs. If you
  change a default, re-run the worksheet-audit checks at the newly-default
  difficulty.
