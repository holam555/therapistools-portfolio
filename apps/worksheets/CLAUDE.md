# OTsheet.ai — CLAUDE.md

Client-side web app: parents and occupational therapists generate print-ready
A4 worksheets (SVG) for children 2–12. Three areas: handwriting, fine motor,
visual perception. No backend; everything runs in the browser.

Architecture decisions live in [ROADMAP.md](ROADMAP.md) and are final.
High-risk items a weaker model must not attempt: [DEFER_TO_FABLE.md](DEFER_TO_FABLE.md).

## Stack

React 18 + TypeScript 5, Vite 5 (SPA + build-time prerender via
`scripts/prerender.mjs`), React Router 6, shadcn/ui + Tailwind 3, Vitest.
Package manager: bun preferred, npm works.

## Commands (run inside `otsheetai/`)

```bash
npm run dev        # dev server — vite.config.ts says 8080, but see below
                   # ⚠ verify on 8090 (preview tool `otsheet-dev`), NOT 8080:
                   # a stale iCloud-copy vite server may be squatting on 8080
npm test           # vitest run — must stay green
npx tsc --noEmit   # type-check
npm run build      # client build + SSR build + prerender of all routes
npm run lint
```

## Map (verified 2026-07-07 — if a path 404s, re-verify with ls, then fix here)

Pages (`src/AppRoutes.tsx`): `/` Gallery, `/worksheets/:goalSlug` GoalPage,
`/edit/:templateId` Editor, `/privacy`, 404.

| File | Role |
|---|---|
| `src/lib/shapes.ts` | **The engine.** `WorksheetConfig`, `WorksheetData`, all 17 mode generators, `generateWorksheet()` switch, shape SVG paths |
| `src/components/WorksheetPreview.tsx` | Renders every mode to the A4 SVG; `variant="thumb"` for gallery cards |
| `src/components/editor/CustomizeControls.tsx` | All user-facing controls; per-mode core/advanced split; gating lists (`SHAPE_MODES`, `EXERCISE_SLIDER_MODES`, `GRID_MODES`, `ANSWER_KEY_MODES`, `GRIDLINE_MODES`) |
| `src/data/templates.ts` | 22 templates (as of 2026-07-07) mapping to the 17 modes; goal/age/language maps |
| `src/lib/grading.ts` + `defaultConfig.ts` | Age-band → difficulty grading presets |
| `src/lib/letterPaths.ts` | Stroke data. Uppercase: y∈[0,1]. Lowercase: y∈[0,1.4] (0=ascender, 0.4=x-height, 1=baseline, 1.4=descender) — keep both contracts |
| `src/lib/persistence.ts` | localStorage: per-template config + child profiles |
| `src/lib/seededGenerate.ts` | Deterministic generation for thumbnails |
| `src/test/audit.test.tsx` | Control-reflection + solvability regression suite |

Data flow: config change → `generateWorksheet(config)` → `WorksheetData` →
`WorksheetPreview` SVG (595×842) → `window.print()` (print CSS hides the rest).

## Adding a new exercise mode

1. Add the mode string to `WorksheetMode` in `shapes.ts`; add config fields to
   `WorksheetConfig` with defaults in `src/lib/defaultConfig.ts`.
2. Add `generateXxxMode(config)` in `shapes.ts` + case in `generateWorksheet()`.
3. Add `renderXxxMode()` in `WorksheetPreview.tsx` + case in its switch.
4. Add controls in `CustomizeControls.tsx` (decide core vs Advanced; add the
   mode to the gating lists that apply).
5. Add template(s) in `src/data/templates.ts` so it appears in the gallery.
6. Add audit tests: every control you expose must measurably change the data
   or rendered SVG (copy an existing pattern in `audit.test.tsx`), and the
   puzzle must be provably solvable.

## Invariants (do not regress — each one was a real shipped bug or a decision)

- **Every puzzle solvable, every answer key correct.** The audit suite guards
  this; extend it, never delete from it.
- **Print output is the product.** A4 = 595×842px, content box x∈[40,555]
  y∈[80,800]. After any renderer change: print QA — no ink outside the
  viewBox, nothing clipped, at easy AND hard.
- **Cosmetic edits must not re-roll the puzzle** (name/instruction/colors are
  stable; see seeded generation + Editor state handling).
- **User text is XML-escaped** before SVG injection.
- **Fonts are self-hosted** (`public/fonts/EduQLDBeginner.woff2`, SIL OFL).
  Do NOT reintroduce KG Primary fonts (personal-use license only) or a
  CDN-loaded worksheet-critical font. The dotted trace row is SVG paint, not
  a font — keep it font-independent.
- **Never gate single-sheet printing** behind accounts/payment (product
  thesis; monetization is ROADMAP Phase 4, usage-triggered).
- `showGridLines` is functional (4 renderers read it) — not dead code.
- **No em dash or en dash in user-visible copy** (swept 2026-07-15). See
  "Copy style" below.

## Copy style

**Never ship an em dash (—) or en dash (–) in user-visible copy.** That
covers: page text, `<title>`/meta descriptions, OG and Twitter tags, JSON-LD
in `index.html`, `aria-label`/`title`/`placeholder`, `public/llms.txt`, and
any string rendered into the worksheet SVG. Copy sources are mainly
`src/data/goalCopy.ts`, `src/data/guides.ts`, `src/data/templates.ts`,
`src/pages/*`, `src/entry-prerender.tsx`, `index.html`, `public/llms.txt`.

How to fix one:

- **Prose:** rewrite the sentence. Use a comma, a colon, parentheses, or a
  full stop. `too easy — nudge it` → `too easy. Nudge it`.
  **Never swap `—` for ` - `**; a spaced hyphen reads exactly as wrong.
- **Ranges and compounds:** plain hyphen. `Ages 3–4` → `Ages 3-4`,
  `Figure–Ground` → `Figure-Ground`, `aged 2–12` → `aged 2-12`.
- **Title separators:** colon, or the site's existing `·`.
  `OTsheet.ai — Free Printable…` → `OTsheet.ai: Free Printable…`.

**Exempt:** code comments, these .md docs, test names, build/console logs.
Readers never see them, and rewriting them is churn.

**The check** (authoritative, zero false positives). After `npm run build`:

```bash
grep -rlP '[\x{2014}\x{2013}]' dist    # must print nothing
```

The whole shipped artifact must be dash-free, and was as of 2026-07-15 (32
prerendered routes + `llms.txt` + the JS bundle, 0 hits). This is exact
because minification drops JS/TS comments, so every remaining dash is real
copy. Two things it depends on: `index.html`'s own HTML comments are NOT
minified away and ship into all 32 pages (keep them dash-free), and `public/`
is copied verbatim into `dist/`, which is what puts `llms.txt` in scope.

Faster dev-time grep, before a build — line-based, so it also prints code
comments (exempt). Skim the hits, don't just count them; anything inside a
*string* or JSX text is a real violation:

```bash
grep -rnP '[\x{2014}\x{2013}]' src index.html public/llms.txt \
  --include='*.tsx' --include='*.ts' --include='*.html' --include='*.txt' \
  | grep -vP '^[^:]+:\d+:\s*(//|\*|/\*|\{/\*)'
```

## Definition of done

`npx tsc --noEmit` clean, `npm test` green, lint clean on touched files; for
renderer/layout changes also the print QA above; for engine changes add a
regression test; **for any copy change, the dash check in §Copy style**. Then
record a dated entry in [NOTES.md](NOTES.md) (what/why/verification), and
update this file ONLY if a fact it states became false.
