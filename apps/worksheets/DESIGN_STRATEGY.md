# Design strategy — website & worksheets

_Written 2026-07-06 (Fable). This is a DECIDED direction, not a menu — implement
it as specified; escalate only if something proves technically impossible.
Split into Part A (website) and Part B (the printed worksheet itself), each
with phased tasks + acceptance criteria for Opus. Read
`.claude/skills/worksheet-grading` constraints first: nothing here may touch
the generation engine, and the print output must stay ink-light and pure._

## The creative direction (one idea, both surfaces)

**"Warm paper studio."** The product IS paper — lean into it. The site should
feel like a tidy therapist's craft desk: warm paper textures, real worksheet
thumbnails pinned slightly askew with tape, dotted tracing paths as decorative
motifs, handwritten annotations. Child-adjacent but parent-credible: playful
materials, disciplined layout. This is distinctive against both generic-SaaS
(what we have now) and babyish clipart sites (what competitors are).

Why this wins: every signature element derives from the worksheets themselves
(dotted paths, tri-lines, shape stickers, tape), so the brand gets more
coherent as the catalog grows, and the gallery thumbnails — our best asset,
real generated sheets — become the hero instead of decoration.

---

# Part A — Website

## A0. Design tokens (implement first; everything else consumes these)

- **Typography:** Display: **Fredoka** (600/700) for H1/H2/logo wordmark —
  rounded, friendly, still adult. UI/body: keep **Nunito** (600–800) + Inter.
  Accent: **Caveat** (already loaded) strictly for "handwritten" annotations
  (e.g. "made for Emma", arrows, tips) — never for UI controls.
- **Color:** keep primary teal `#0D9488` (equity). Background stays warm paper
  `#FAF6F0`. Promote the existing secondary orange to the single CTA-accent.
  Add a **category palette** (used on cards, goal pages, editor header chip):
  visual-perception `#3B82F6`, fine-motor/scissors `#22C55E`, handwriting
  `#8B5CF6`, pre-writing `#F59E0B`. Pastel tints of each (10–15% alpha) for
  backgrounds. Map lives in one file (`src/lib/categoryColors.ts`) keyed by
  Goal.
- **Texture & shape language:** subtle paper-grain on the page background
  (CSS noise via tiny repeating SVG, ≤2% opacity — must be invisible in
  print); dotted-path SVG dividers (literally the tracing-path motif) between
  page sections; 12–16px radii everywhere (already close); soft double
  shadows for "paper on desk".
- **Signature element — the taped worksheet:** gallery/goal thumbnails render
  as paper sheets with (a) a deterministic tiny rotation per card
  (hash(template.id) → −1.5°…+1.5°), (b) a semi-transparent "washi tape" strip
  across the top corner (CSS gradient, category-tinted), (c) hover: rotate to
  0° + lift. This one treatment does most of the personality work.

## A1. Gallery / home (highest traffic, do after A0)

- Hero: left = headline in Fredoka ("Print a worksheet made for *your* kid",
  with a crayon-style SVG underline on "your"), one primary CTA (scroll to
  gallery) + one secondary (browse by goal); right = a fanned stack of 3 real
  worksheet previews (reuse `TemplateCard` thumb rendering, rotated −6/0/+6°).
  When a child profile is active, add a Caveat annotation "for {name} ✎".
- Filter chips: sticker-style (thicker border, slight shadow, category tint
  when a goal chip is active). Keep all current behavior.
- Cards: taped-paper treatment (A0), category color on the tape + skill tag,
  age badge as a small sticker. Title stays Nunito 700.
- About strip: keep copy, restyle as a "note card" with one dotted divider.
- Recently-printed strip: prepend a small "⭐ {name}'s desk" heading treatment.

## A2. Editor (the conversion surface)

- **Sticky action bar:** Print / Print 5 / Regenerate / Share / Customize
  pinned to top on scroll (complements the scroll-to-top fix). Print stays the
  single filled-primary button; everything else outline.
- Preview sits on a subtle "desk" backdrop (slightly darker warm tone +
  paper-grain) so the white sheet pops; keep `.worksheet-paper` shadow.
- Customize panel: group controls with tiny section headers and 16px icons
  (Age 👶→ use lucide `Baby`, Challenge `Gauge`, content `Shapes`, Advanced
  `Settings2`); category-tinted panel header per mode. No control-behavior
  changes — restyle only.
- Template title row: add the category chip + a one-line "what this trains"
  (from `clinicalName`/`skillTag`) in muted text.

## A3. Goal pages + privacy + footer

- Goal pages get a category-tinted header band with the goal's icon and the
  same taped-thumbnail grid; FAQ restyled as note cards. Footer: add the
  dotted divider, tighten link groups (Browse / Learn / About), keep TODO
  placeholders for contact/BMAC visible.

## A4. Micro-motion (last, small)

- Card hover lift/straighten (150ms ease-out); button press scale 0.98; a
  one-time gentle pulse on Print after the first Regenerate (discoverability).
  All inside the existing `prefers-reduced-motion` guard.

## Part A hard constraints & acceptance

- **Never** style inside the worksheet SVG from Part A work (that's Part B);
  `.no-print`/print CSS untouched; paper-grain must not print.
- Per phase: screenshot desktop+mobile before/after; Lighthouse a11y ≥ 95;
  contrast ≥ 4.5:1 for text (pastel tints are backgrounds only); 73/73 tests +
  build + 30-route prerender green; the arm's-length test — a stranger should
  describe the site as "warm / crafty / for kids-but-professional", not
  "generic app".

---

# Part B — The worksheet itself

Design goal: a sheet a child WANTS to pick up and a therapist is proud to hand
out — while staying ink-light (home printers, often grayscale) and clinically
uncluttered (visual noise fights the perceptual tasks; this is a feature, not
a bug — competitors' clipart-stuffed sheets are actively worse for figure-
ground work). Every element below is renderer-only (`WorksheetPreview.tsx`),
config-gated, and must pass the existing print-QA bbox sweep.

## B1. Header & footer system (do first — every sheet benefits)

- Header: replace the plain wordmark line with a compact lockup: small logo
  mark + "OTsheet.ai" (10px, corner), then the sheet's TITLE (template title,
  Fredoka-style weight) — right now sheets don't show their friendly name.
  Name/date line styled as a proper tri-line write-on segment (practice from
  the first second). Keep total header ≤ 90px.
- Footer: left = skill label (keep) + **age/level chip** ("Ages 5–6 · Just
  right") so parents/therapists can file sheets; right = "Print your own:
  otsheetai.vercel.app" (growth loop — sheets travel to other families);
  center = **"I did it!" self-monitoring row**: 3 outline stars + a tiny
  checkbox, config `showReward: boolean` default ON (self-rating is genuinely
  OT-relevant, and it's the kid-magnet). All line-art, near-zero ink.

## B2. Instruction icons (pre-reader comprehension)

- A 14px line-icon before the instruction text, one per skill family (eye =
  find/scan, pencil = write/trace, scissors = cut, puzzle = match/sequence,
  crayon = color). Single tiny SVG set in one file, same dotted-line style as
  the tracing paths. Alt text already covered by the container aria-label.

## B3. Theme corners (the "attractive" lever, opt-in)

- New config `cornerDoodles: boolean` (default ON for ages 3–6, OFF for 7–8):
  one small OUTLINE doodle in two opposite corners, matching the emoji theme
  when set (dino/rocket/fish…) else neutral (star/heart). Outline-only =
  colorable = built-in reward activity, and ~zero ink. Must never enter the
  content area (respect the 40px margin box; add to the print-QA sweep).
- Reference-box polish for find/count: dashed box becomes a "magnifier card"
  (existing dashed style + a tiny magnifier icon), same geometry.

## B4. Per-mode passes (order: handwriting → trace-name → find/count →
## mazes/motor → the rest)

- Small alignment/spacing audits per mode against B1–B3, plus mode-specifics:
  maze START/END get flag/star icons (exists: keep, restyle to match icon
  set); connect-dots preview box label restyle; pixel-art legend chips
  rounded. Nothing structural.

## Part B hard constraints & acceptance

- Generation engine untouched; only `WorksheetPreview.tsx` + config fields
  (+ `CustomizeControls` toggles under Advanced: "Reward row", "Corner
  doodles").
- Grayscale test: print-preview every changed mode in B&W — everything must
  read perfectly without color. Ink budget: no filled areas > 12px square
  added by decoration.
- Re-run the print-QA bbox sweep (all 22 templates × easy/hard) after each
  phase; 0 overflows. Solvability tests stay green (decoration must never be
  confusable with task content — no shapes from `ALL_SHAPES` as doodles on
  perception sheets; use the doodle set: rocket, flower, butterfly, sun
  outlines only, and NONE on figure-ground/find/count sheets when shapes mode
  is active — emoji themes only there, or neutral stars on handwriting/motor
  sheets).
- The pick-up test: print easy/5-6/hard of one template; a child should point
  at the sheet and want it; a therapist shouldn't find anything to delete.

---

## Progress & Fable hand-off (2026-07-06, Opus pass)

**DONE and shipped** (the "make it attractive" core — verified desktop+mobile,
74/74 tests, build + 30-route prerender green each phase):
- **A0 tokens** — Fredoka display, `categoryColors.ts` (4 skill-family
  accents+tints keyed by goal/mode), print-safe paper grain, `shadow-paper` +
  `dotted-divider` + `font-hand` utilities.
- **A1 gallery/hero** — taped-worksheet cards (deterministic tilt + washi tape +
  category age sticker + category skill tag, straighten/lift on hover); hero
  with Fredoka headline + crayon underline + `HeroFan` (3 real worksheets
  fanned) + CTAs; sticker-style filter chips; "⭐ {name}'s desk" recent heading.
- **A2 editor** — sticky action bar (Print/Customize reachable while scrolling),
  `.worksheet-desk` backdrop (print-reset), category chip on the title row.
- **B1 worksheet header/footer** — sheets now show their TITLE; tri-line Name
  write-on; "How did I do? ⭐⭐⭐ I did it!" reward row (config `showReward`);
  age/level filing chip; "Print your own · otsheetai.vercel.app" growth line.
  Print-QA: 0 overflow across 22 templates × easy/hard.

**DONE by Fable (2026-07-07 pass) — B2 + B3 + B4:**
- **B2 instruction icons** — hand-drawn 14px line set (eye/pencil/scissors/
  puzzle/crayon), one per skill FAMILY, wired for all 17 modes in
  `WorksheetPreview` (`INSTR_ICON_BY_MODE`). Icon + instruction stay centred
  as one unit via canvas TextMetrics (per-char estimate under SSR/jsdom).
  Bonus fix: long (custom) instructions now shrink-to-fit instead of spilling
  into the margins, and 7 wordy default instructions were tightened.
- **B3 corner doodles** — `cornerDoodles: boolean` (ON by default; 7–8 band
  turns it OFF via `ageBandConfig`; Advanced toggle, cosmetic field). Doodle
  set pruned to star/heart/sun/rocket — butterfly/flower outlines turn to mush
  at 42px. Placement is provably safe per mode: full-width row modes
  (handwriting/traceName/tracingPaths/scissorSkills) RESERVE a 52px bottom
  strip; maze uses its measured layout gaps; connectDots gets one doodle in a
  corner all shape paths avoid, with a contrast rule (never a doodle that
  rhymes with the puzzle shape). Banned everywhere else — enforced by tests
  (`decoration:` block in audit.test.tsx).
- **B4 polish** — maze END is now an outline star (ink ↓, matches the line-art
  language); find + connect-dots reference boxes are "magnifier cards";
  pixel-art legend swatches rounded.

**DONE by Fable (2026-07-10 pass) — A3 + A4 remainder (see NOTES.md entry):**
- **A3** goal-page category band + FAQ note cards + footer brand/dotted-divider
  restyle. **A4** button press scale + one-time Print pulse after first
  Regenerate. Plus: SectionHeading (crayon star) replaces emoji headings, and
  category `textColor` added for WCAG AA text contrast (mid accents were
  ~2.3:1 as small text — decorative surfaces only now).

**STILL OPEN (lower value):**
- **D4 OG image** (see DEFER_TO_FABLE.md).

## Sequencing for Opus (both parts)

1. A0 tokens → B1 header/footer (biggest visible wins, lowest risk)
2. A1 gallery/hero → B2 icons
3. A2 editor → B3 corners
4. A3/A4 polish → B4 per-mode passes

One phase per session, commit per phase, verification recipe above per phase.
ROADMAP.md Phase 6 note and NOTES.md should be updated as phases land.
