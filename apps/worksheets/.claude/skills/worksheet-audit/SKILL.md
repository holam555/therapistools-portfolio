---
name: worksheet-audit
description: Audit OTsheet worksheet generators for therapeutic correctness — that every puzzle is solvable, has exactly one right answer, teaches correct letter formation, and matches the child's age. Use after adding or changing any generator in src/lib/shapes.ts, adding a new worksheet mode, editing src/lib/letterPaths.ts, or whenever asked to check that worksheets are "solvable", "correct", "not broken", or "clinically sound". A worksheet that renders without error can still be silently wrong — this catches that.
---

# Worksheet correctness audit

The OTsheet generators produce output that *looks* fine in the preview but can be
therapeutically wrong: an unsolvable puzzle, two correct answers, a letter stroked
the wrong way. Visual QA misses these. This skill exercises the real generator
across many seeds and checks for specific, known failure classes.

## How to run the audit

Exercise the actual engine, not screenshots. Either:

- **In the running app** (fastest): with the dev server up, use the preview
  browser's eval to `import('/src/lib/shapes.ts')` and loop `generateWorksheet(config)`
  (or `generateWorksheetSeeded`) across 40+ seeds per mode, tallying failures.
- **Or a scratch script** under the scratchpad dir importing from `src/lib`.

Then lock findings in with regression tests in `src/test/audit.test.tsx` (it already
has a `generateWorksheetSeeded` helper and solvability suites — copy their shape).

## Failure classes to check (each caught a real bug on 2026-07-05)

1. **Unsolvable odd-one-out (rotation invisibility).** In hard mode the odd item
   may differ only by a rotation that is *invisible* on that shape (a circle at any
   angle, a square at 90°, an oval/rectangle at 180°). Check each shape's odd item
   against `VISIBLE_ROTATIONS` in shapes.ts — if the delta isn't visible, the row is
   unsolvable. Same idea for any mode that distinguishes items by rotation.

2. **Duplicate / ambiguous multiple-choice options** (closure, sequence, pattern).
   With few selected shapes the A/B/C options could repeat, making the correct answer
   appear twice — or two options both "correct". Assert `new Set(options).size === options.length`
   and that exactly one option equals the answer.

3. **Answer-key correctness.** Where `showAnswerKey` draws an answer, verify it's
   actually right (the counted target count matches the grid; the marked index is the
   real odd one / next-in-sequence / mirror).

4. **Age-appropriateness.** Confirm the age band → difficulty mapping
   (`ageBandConfig`) and `getAvailableDifficulties` produce content a child that age
   can do (age ≤3 → easy only, ≤5 → no hard). New modes must respect the cap.

5. **Case mismatch** (visual scanning, odd-one-out letters). Distractors must match
   the target's case — an uppercase "B" hunt padded with lowercase d/p/q is trivial.

6. **Letter stroke order / direction** (`letterPaths.ts`, trace-name/handwriting).
   The FIRST point of each stroke is where the pen starts (drives the green start
   dot). Verticals must go top→bottom (y 0→1); the primary stroke comes first
   (e.g. `I`/`J` stem before serif). A wrong path teaches bad handwriting — high stakes.

7. **Empty / blank output.** A mode must render real content for its data shape
   (e.g. word-box handwriting needs words; a mode routed to the wrong renderer prints
   an empty body). Assert the rendered SVG contains the expected element type.

## What to produce

- A short report: which failure classes were found, with the failing config + counts
  (e.g. "oddOneOut hard: 96/200 rows unsolvable").
- The fixes in `src/lib/shapes.ts` / `letterPaths.ts` (do not change the render/print
  contract unless necessary).
- New regression tests in `audit.test.tsx` that fail before the fix and pass after,
  looped over enough seeds (≥40) to be reliable.
- Run `npx vitest run` and `npx tsc --noEmit`; both must be green.

## Judgment note

The hardest, highest-stakes items (authoring correct letterforms, designing new
per-difficulty artwork) are spatial-design tasks — if one is needed, flag it in
`DEFER_TO_FABLE.md` with a scoped prompt rather than guessing. See that file for the
existing deferrals (D1 lowercase letterforms, D2 pixel-art difficulty).
