# OTsheet redesign — handoff notes

_Last updated: 2026-07-15. **Start with [ROADMAP.md](ROADMAP.md)** — it contains the current phased backlog with decisions already made. This file is the historical session log. The app lives in `otsheetai/`._

## 2026-07-15 — Em/en dash sweep of all user-visible copy (Opus)
User asked that the website never use an em dash (—) or en dash (–), that
existing ones be fixed, and that the rule go in CLAUDE.md. Scope confirmed
with the user: user-visible copy only. Code comments (~93 occurrences) were
deliberately left alone; readers never see them and rewriting them is churn
with regression risk. Docs (.md) and test names are exempt too.
- **Rewrote, did not substitute.** Em dashes in prose were re-written per
  sentence (comma / colon / parentheses / full stop). A blind `—` → ` - `
  swap was rejected: a spaced hyphen reads exactly as wrong. En dashes were
  mechanical (ranges and compounds → plain hyphen): `Ages 3–4` → `Ages 3-4`,
  `Figure–Ground` → `Figure-Ground`, `aged 2–12` → `aged 2-12`.
- **Titles** now use a colon: `OTsheet.ai: Free Printable OT Worksheets…`,
  keeping the site's existing `·` site-name separator.
- Touched: `index.html` (title/meta/OG/Twitter/JSON-LD), `entry-prerender.tsx`,
  `use-page-meta.ts`, `goalCopy.ts`, `guides.ts`, `templates.ts`,
  `defaultConfig.ts`, `Gallery/GuidesIndex/GuidePage/PrivacyPage/Editor/
  NotFound`, `SiteFooter`, `TemplateCard` (aria-label), `CustomizeControls`
  (incl. a `placeholder="—"` → `"?"`), `WorksheetPreview` (the
  `Chinese — Grid Box (方格紙)` label printed into the SVG), `public/llms.txt`.
- **Also fixed one HTML comment** in `index.html` (font note). It is exempt by
  the rule, but it is not minified away and shipped into all 32 prerendered
  pages, and it was the single last dash in `dist/`. Removing it makes the
  build check exact (see below) instead of "zero except one known hit".
- **Rule + check written to [CLAUDE.md](CLAUDE.md) §Copy style**, wired into
  Definition of done, and mirrored into `.claude/skills/seo-content/SKILL.md`
  (that skill drafts the prose most likely to reintroduce dashes). Fixed a
  stale UI quote in that skill while there ("Try it now — print one of these").
- Verified: tsc clean; 80/80 tests; build + 32-route prerender green;
  `grep -rlP '[—–]' dist` returns nothing (whole shipped artifact, incl.
  llms.txt and the JS bundle, is dash-free; minification drops the exempt code
  comments, which is why the check is exact). Live DOM sweep on :8090 across
  gallery/guides/goal/privacy/editor/404 found 0 dashes in text nodes and in
  aria-label/title/placeholder/alt. Print QA for the renderer change: the
  `Chinese Grid Box (方格紙)` label only renders on the mixed CJK+Latin
  non-gridbox path (no shipped template hits it; reachable by typing Chinese
  into a tri-line handwriting sheet), exercised via the real editor input:
  label correct, bbox sweep 0 overflows.

## 2026-07-10 — Website redesign pass: A3 + A4 remainder + polish (Fable)
User asked for a site redesign guided by external skills (nutlope/hallmark,
Anthropic frontend-design, garrytan/gstack design review, coreyhaines
copywriting). Audited first (gstack-style), concluded the shipped A0–A2 system
is strong; executed the missing DESIGN_STRATEGY.md pieces inside the locked
"warm paper studio" system rather than rotating to a new theme (hallmark's
multi-page rule: consistency over variety). Site-layer only — renderer,
engine, print CSS untouched.
- **A3 goal pages** (`GoalPage.tsx`): category-tinted header band (washi tape,
  skill-family icon, eyebrow, lead paragraph, live "N free worksheets" + age
  chips from real templates); FAQ restyled as note cards with dotted dividers;
  related guides as chip-labelled note cards. SEO copy/JSON-LD unchanged.
- **A3 footer** (`SiteFooter.tsx`): dotted-divider top, brand block with logo +
  thesis line ("Free to print, always — no accounts, no paywalls") + Caveat
  "made with care ✎", 3 link groups. Contact/BMAC TODOs preserved.
- **A4 remainder**: one-time `pulse-once` on Print after first Regenerate
  (`Editor.tsx` ref + `EditorToolbar` prop); global button `:active` scale
  0.98. Both inside `prefers-reduced-motion` guards.
- **Slop-tell cleanup**: ⭐ emoji headings → shared `SectionHeading.tsx`
  (crayon-star SVG); AboutStrip emoji-in-circle → taped note card with dotted
  divider; guide-card uppercase eyebrow → chip; gallery grid got a heading
  with live count; hero fan sheets got category-tinted tape + desk shadow;
  404 rebuilt as a taped note card.
- **Contrast fix (real bug)**: category greens/ambers (#22C55E/#F59E0B) were
  used as ≤11px text on tints at ~2.3:1. Added `textColor` (blue-700/
  green-700/violet-700/amber-800) to `categoryColors.ts`; all text usages
  (card skill tag, age stickers, editor chip, goal-page labels) now ≥4.5:1.
  Mid accents remain for decorative surfaces (tape/borders) only.
- Mobile: goal-page header link no longer wraps ("Gallery" label < sm).
- Verified: tsc clean, 80/80 tests, build + 32-route prerender green,
  desktop/mobile screenshots on :8090. Note: the in-app browser pane can't
  screenshot this site when scrolled (huge SVG layer tree) — DOM/read_page
  verification works; not a site bug.

## 2026-07-07 — Design B2/B3/B4 decoration pass (Fable)
Executed the deferred decoration layer from DESIGN_STRATEGY.md "Progress &
Fable hand-off". All renderer-only (`WorksheetPreview.tsx`) + config plumbing.
- **B2 instruction icons:** hand-drawn 14px line set — eye (find/count/
  figureGround/visualScanning/oddOneOut), puzzle (pattern/sequence/closure),
  pencil (write/trace/draw modes), scissors, crayon (pixelArt). Icon + text
  centred as one unit via canvas TextMetrics (estimate fallback under
  SSR/jsdom). Long instructions now shrink-to-fit instead of overflowing the
  margins; 7 wordy default instruction strings tightened (copy-only edits).
- **B3 corner doodles:** `cornerDoodles` config (default ON; `ageBandConfig`
  turns it OFF for 7–8; Advanced toggle; in Editor COSMETIC_FIELDS so it never
  re-rolls). Set pruned to star/heart/sun/rocket after eyeballing — butterfly/
  flower outlines are mush at 42px. Safe placement per mode: row modes
  (handwriting/traceName/tracingPaths/scissorSkills) reserve a 52px bottom
  strip; maze uses measured layout gaps (skips if gap < 46px); connectDots one
  doodle in a corner all 10 shape paths provably avoid + contrast rule (no
  doodle rhyming with the puzzle shape). BANNED on all perception/matching
  modes — enforced by `CORNER_DOODLE_MODES` + audit tests.
- **B4 polish:** maze END → outline star (less ink, matches line language);
  find/connect-dots reference boxes → magnifier cards; pixel-art legend
  swatches rounded.
- **Verification:** 80/80 tests (74→80: icon-family, toggle-reflection,
  banned-modes, maze-no-star-echo, band-default), tsc clean, build +
  32-route prerender green, lint: 0 new issues (17 pre-existing `any`s
  untouched). Print-QA bbox sweep via live app on :8090: 22 templates ×
  Ages 3–4/7–8 (44 pages) **0 overflows**, plus hard+doodles-forced-ON on the
  4 worst row modes — 0 overflows. Eyeballed: pre-writing, trace-name,
  scissors, connect-dots, handwriting-en/zh, maze @3–4 & @7–8, match-pattern,
  pixel-art, find, gallery/hero.
- Doc fix in passing: templates.ts holds **22** templates (CLAUDE.md said 24).
- Still open from the hand-off: A3/A4 remainder (goal-page band, footer
  restyle, Print pulse), D4 OG image.

## 2026-07-06 (later) — Design execution (Opus): A0–A2 + B1
Ran DESIGN_STRATEGY.md 'warm paper studio'. Shipped + verified (74/74 tests,
build + 30-route prerender green, desktop+mobile):
- A0 tokens (Fredoka, categoryColors.ts, print-safe paper grain, utils)
- A1 gallery/hero (taped-worksheet cards, HeroFan of 3 real sheets, crayon
  underline, sticker chips, "⭐ {name}'s desk")
- A2 editor (sticky action bar, .worksheet-desk backdrop w/ print reset,
  category chip on title)
- B1 worksheet header/footer (TITLE on every sheet, tri-line Name write-on,
  "I did it!" reward row via showReward, age/level filing chip, "Print your
  own" growth URL) — print-QA 0 overflow across 22×easy/hard.
Deferred to Fable (art-taste + cross-mode safety layer): B2 instruction icons,
B3 corner doodles, B4 per-mode polish, A3/A4 remainder — see DESIGN_STRATEGY.md
"Progress & Fable hand-off".

## 2026-07-06 — Strategy pass 2 (Fable): design + SEO + scroll fix
- **Bug fixed:** SPA navigation kept the gallery scroll offset — opening a
  worksheet landed past the Print/Customize toolbar. `ScrollToTop` on route
  change in App.tsx; verified (scrollY 4221 → 0, toolbar visible).
- **DESIGN_STRATEGY.md:** decided direction "warm paper studio" — site tokens
  (Fredoka display, category palette, taped-paper thumbnails, dotted-path
  motifs) + worksheet redesign (title header, age/level chip, "I did it!"
  reward row, instruction icons, opt-in corner doodles, print-your-own footer
  URL), phased A0–A4 / B1–B4 with acceptance criteria and ink/solvability
  constraints for Opus.
- **seo-content skill:** three intent clusters mapped to page types; /guides
  architecture (G0) speced on the GoalPage pattern; per-article recipe with
  E-E-A-T writing standards for a kids'-health-adjacent site; 20-topic seed
  backlog; llms.txt/JSON-LD rules; one-guide-per-session cadence.

## 2026-07-05 (later) — Fable deferred-items session (D1–D3)

### D3 font licensing decision + print QA
**Licensing:** KG Primary Penmanship 2 / KG Primary Dots (Kimberly Geswein) are
free for *personal use only* — self-hosting (redistribution) and commercial use
require a paid license, and ROADMAP Phase 4 plans monetization. Decision:
replaced with **Edu QLD Beginner** (SIL OFL 1.1, self-hosted at
`public/fonts/EduQLDBeginner.woff2` + license file), an Australian school
beginner-handwriting font. If KG is ever wanted back, buy her commercial/web
license first.

**Dotted trace row is now font-independent:** drawn with SVG paint
(`fill:none` + `stroke-dasharray`) instead of a dotted font. The old failure
mode — CDN down → trace row silently rendered SOLID — is impossible now, and
the cursive option gets a dotted trace row too. Cap-height ratio measured via
canvas TextMetrics: Edu QLD Beginner = 0.772 (was hardcoded 0.72 for KG;
capitals now touch the top line exactly).

**Print QA (all 22 templates × easy + hard, seed 12345):** automated ink-bbox
check of every rendered page against the 595×842 A4 viewBox (tolerance 3px)
via the live app — **0 clipping/overflow issues across all pages**, plus
eyeball checks of tri-line handwriting (caps/baseline alignment, dashed trace),
Chinese grid-box (CJK model chars fall back to a system font — Edu QLD has no
CJK; same behavior as before, acceptable), word-box, trace-name (mixed case,
descenders), pixel-art (8/10/12 grids + legends). Known cosmetic notes, not
defects: dotted row is a dashed-outline style (hollow letters), and UI fonts
(Nunito/Inter) still load from Google Fonts CDN — worksheet-critical fonts are
the self-hosted ones.

### D1 lowercase name tracing
26 manuscript lowercase letterforms authored in `LOWERCASE_PATHS`
(y∈[0,1.4]: 0=ascender line, 0.4=x-height, 1=baseline, 1.4=descender depth),
teaching-correct stroke order/direction. Trace-name preserves mixed case,
normalizes all-one-case to Capitalized form, renders descender-aware rows with
a true x-height guideline. Verified letter-by-letter at high magnification.

### D2 pixel-art difficulty
Easy 8×8 (2–3 colors) and hard 12×12 (4–7 colors) artwork authored for all 10
themes (medium = original 10×10); difficulty wired into generatePixelArtMode
and the control un-hidden. All 20 variants eyeballed as recognizable (easy
rocket reworked with a porthole after failing the first look).

Remaining deferred item: **D4 (OG image)** — see DEFER_TO_FABLE.md.

## 2026-07-05 — Deep strategy pass (Fable session)
- **Engine correctness** (commit `f200934`): closure/sequence duplicate-option bugs fixed (closure printed the correct answer twice in 49% of 2-shape sheets); oddOneOut hard no longer produces unsolvable rotation rows (was 48%); emoji sheets no longer name invisible shapes; M/N/I/J stroke order corrected; trace-name fills the page with numbered per-stroke start dots; 4 solvability regression tests added.
- **Editor stability + persistence**: cosmetic edits (name, instruction, colors) no longer re-roll the puzzle; per-template config + child-name profile persist in localStorage (`src/lib/persistence.ts`); Reset button added; user text XML-escaped before SVG injection.
- **SEO**: accurate metadata + JSON-LD, sitemap.xml (22 routes), llms.txt, per-route titles, honest About copy. Prerendering decided + specced in ROADMAP Phase 2.
- **Decisions recorded in ROADMAP.md**: stay Vite SPA + build-time prerender (no framework migration); profiles client-side until money; freemium via Supabase + Stripe when triggered; LLM = yes but only themed word lists (Haiku via serverless) + later progress notes; no LLM puzzle generation.
- Repo now has git history + a GitHub remote — earlier "no git" notes below are stale.

## TL;DR
Redesigned OTsheet from an "engineer's control panel" into a **gallery-first homepage + preview-first editor**, like Canva. All 17 worksheet modes stay functional; the worksheet generation engine and print output were **not** changed. **34/34 automated tests pass.**

## 2026-06-11 — Visual QA + function-wise control audit (this session)
- **Bug fixed: Trace My Name rendered an empty body.** `traceName` mode was routed to `renderHandwritingMode` (which returns `''` when `handwritingData` is absent — the generator produces `traceNameData`). Re-routed to the existing `renderTraceNameMode` in `WorksheetPreview.tsx`. Added 2 regression tests (data + render-level) in `audit.test.tsx`.
- **Function-wise audit of every control × every mode** (executed against the real generator/renderer, not just code-read). Found ~12 controls that were *shown in the editor but had zero effect for that mode*. **Fix chosen: hide the dead controls** (no engine/output changes) by gating them in `CustomizeControls.tsx`:
  - Removed: find→Exercises slider; sequence/oddOneOut→Grid Size; scissorSkills/pixelArt→Difficulty; Colour switch on maze/connectDots/tracingPaths/scissorSkills/pixelArt/visualScanning; Answer key on copy + the 5 motor/path modes.
  - Gating now uses explicit lists: `SHAPE_MODES` (Colour), `ANSWER_KEY_MODES`, `DIFFICULTY_DEAD_MODES`, trimmed `EXERCISE_SLIDER_MODES`/`GRID_MODES`.
  - Wordbox handwriting layouts no longer render a blank sheet with no words — they show an "Add words…" placeholder (`renderWordBoxesMode`).
- **Dead-code cleanup:** removed `pixelArtGridSize` field/type/default (zero consumers), the unreachable `paperStyle === 'both'` render branch (+ narrowed `HandwritingPaperStyle`), and a duplicated unused `rows[]` build in `generateTracingPathsMode`. tsc + build + 34/34 tests green.
- **Left as-is (intentional):** `showGridLines` is a *functional* field read by 4 renderers but has no UI control (not dead — don't delete). Minor "weak but works" semantics untouched: copy difficulty only rotates; mirror difficulty collapses at 2×2; maze medium≈hard carving; pixelArt B&W only restyles the legend; borderStyle is a no-op on tri-line/4-line handwriting.

## How to run
```bash
npm --prefix otsheetai run dev      # dev server on http://localhost:8080
npm --prefix otsheetai test         # vitest — includes the control-reflection audit
npm --prefix otsheetai run build    # production build (verified passing)
```
`.claude/launch.json` defines two servers: `otsheet-dev` (8080) and `otsheet-preview` (4173).
This copy lives at a normal path (no iCloud/spaces), so the preview MCP screenshot/inspect tools work here — use them for visual QA.

## What was built (Phases 1–5, cores done)
- **Phase 1 – Gallery home** (`src/pages/Gallery.tsx`, `src/components/gallery/`): responsive card grid; each card is a REAL rendered worksheet preview via the existing engine (`TemplateCard` + `WorksheetPreview variant="thumb"`), with stable seeded generation (`src/lib/seededGenerate.ts`). Friendly title + age badge + skill tag. Click → `/edit/:templateId`.
- **Phase 2 – Editor** (`src/pages/Editor.tsx`, `src/components/editor/`): large centered live preview; **Print** + **Regenerate** primary buttons; **Customize** collapsed by default → **Age first** (drives difficulty) → mode essentials → **Advanced** accordion. Core/advanced split per mode lives in `CustomizeControls.tsx`.
- **Phase 3 – Browse**: filter by age / goal (parent-friendly) / language, plus an "All worksheet types" clinical filter. Maps in `src/data/templates.ts`.
- **Phase 4 – Trust**: About strip (placeholder OT copy), footer (About / Contact / Buy Me a Coffee placeholders), **no login wall** — gentle post-3-print nudge via `src/hooks/use-print-count.ts`.
- **Phase 5 – Mobile**: 2-col gallery, Customize as a bottom sheet (vaul Drawer), "print from desktop" note.

## Key files
- `src/data/templates.ts` — 22 templates covering all 17 modes; goal/age/language maps; `templateConfig()`.
- `src/lib/defaultConfig.ts` — shared default config + age-band → difficulty mapping (extracted from old Index.tsx).
- `src/lib/seededGenerate.ts` — deterministic thumbnails (swaps Math.random around one call; engine untouched).
- `src/components/editor/CustomizeControls.tsx` — the core-vs-advanced control classification, per mode.
- `src/test/audit.test.tsx` — proves every control reflects in the worksheet (data-level + render-level).

## Audit result
As of 2026-06-11 (see session note above): every **visible** control now changes the worksheet. The controls that were shown-but-inert have been hidden, and the dead `pixelArtGridSize` field was deleted. Answer keys verified semantically correct for find/count/oddOneOut/closure/mirror/sequence/pattern/figureGround/visualScanning.

## Cleanup done
- Deleted superseded `src/pages/Index.tsx` and `src/components/WorksheetControls.tsx` (replaced by Gallery/Editor + CustomizeControls). Build + tests still green.

## Pending / next steps
1. ~~Visual QA + polish pass~~ — done 2026-06-11 (gallery + editor + mobile bottom sheet + answer-key correctness checked; see session note).
2. ~~Decide pixelArtGridSize~~ — done (field deleted).
3. Replace placeholders: About copy, Contact email, Buy Me a Coffee link.
4. Optional (deferred — would change worksheet output, so left for product call): instead of *hiding* the inert controls, *implement* them — e.g. find generates multiple grids for "exercises per sheet", scissorSkills/pixelArt difficulty changes complexity, Colour affects motor modes. Also consider exposing a `showGridLines` control (functional field, currently no UI).
5. Nothing is committed to git (repo has no `.git`); consider `git init` + first commit.

## Constraints honored (do not regress)
- Don't break worksheet generation logic (`src/lib/shapes.ts`) — UI/IA redesign only.
- Reuse the existing rendering engine for thumbnails.
- Keep print output untouched (`window.print()` + `.no-print` CSS; preview SVG prints as-is).
- Friendly rounded style, generous whitespace, clean enough for clinical professionals.
