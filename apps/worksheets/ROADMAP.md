# OTsheet.ai — Product Roadmap & Architecture Decisions

_Written 2026-07-05 by a one-time deep strategy pass. This document is the
handoff for follow-up implementation sessions. **Every item states a decision
already made — do not re-litigate the decision, implement it.** Each phase has
acceptance criteria and the files it touches. Work the phases in order unless
the user says otherwise._

## Product thesis (context for all phases)

OTsheet.ai wins by being the fastest way for a parent or OT to get a
**clinically sound, personalized, always-fresh** worksheet. The three
differentiators to invest in, in order:

1. **Trustworthy therapeutic quality** — every puzzle solvable, every stroke
   cue correct, difficulty that actually progresses. (Largely done in the
   2026-07-05 commits; remaining items in Phase 1.)
2. **Per-child continuity** — the site remembers the child and produces
   varied-but-appropriate practice over time. This is what parents would pay
   for; single worksheets are free everywhere.
3. **Discoverability** — static, crawlable content pages so search engines and
   AI assistants can recommend the site.

What was already done on 2026-07-05 (see git log): engine correctness fixes
(solvability, stroke order, emoji instructions), stable-puzzle editing,
localStorage persistence + child-name profile, SEO metadata/sitemap/llms.txt,
trace-name page fill. Baseline: 38/38 tests, build green.

---

> **Phase 1 COMPLETE (2026-07-05):** 1.1 (all modes incl. pixelArt tiers),
> 1.2 (lowercase name tracing), 1.3, 1.4, and 1.5 (OFL font self-hosted +
> 22-template print QA, 0 overflow) are done — the D1/D2/D3 deferred items were
> executed in a Fable session (see NOTES.md). Only D4 (OG image) remains in
> [DEFER_TO_FABLE.md](DEFER_TO_FABLE.md).

## Phase 1 — Finish therapeutic quality (no architecture changes)

**1.1 Implement the "weak but works" difficulty semantics.**
Decision: implement, don't hide. These are real controls whose effect is too
subtle to matter clinically.
- `copy` difficulty: easy = no rotation + 2-shape palette; medium = current;
  hard = rotations + 1 empty-cell "remember and skip" variant. Files:
  `src/lib/shapes.ts` (`generateCopyMode`).
- `mirror` difficulty at gridSize 2: force shapeCount ≤ 3 so easy/medium/hard
  differ; or better, make difficulty drive gridSize default (easy 2×2, medium
  3×3, hard 4×4). Files: `shapes.ts` (`generateMirrorMode`),
  `CustomizeControls.tsx`.
- `maze` medium vs hard: hard should add false corridors — after carving,
  re-add 10% of walls along the solution path's neighbors. Files: `shapes.ts`
  (`generateMazeMode`).
- `scissorSkills`/`pixelArt` difficulty (currently hidden as dead): implement
  scissor difficulty = amplitude/segment count of curves; pixelArt difficulty
  = grid resolution (10×10 easy → 14×14 hard requires new patterns; instead
  use color count: easy patterns 2 colors, hard 5). Then un-hide the control
  (`DIFFICULTY_DEAD_MODES` in `CustomizeControls.tsx`).
- Acceptance: for each mode, generate at easy vs hard with the same seed and
  assert a measurable difference in the data (add to `audit.test.tsx`).

**1.2 Lowercase name tracing.**
`generateTraceNameMode` uppercases everything because `LETTER_PATHS` only has
A–Z. Real name practice is "Emma", not "EMMA" — first-letter-capital is the
clinically correct form. Add lowercase stroke paths (a–z) to
`letterPaths.ts` (same normalized format; lowercase letters occupy the lower
half of the x-height zone, descenders extend below baseline — extend the
coordinate range to y∈[0,1.4] and scale in the renderer). Render "Emma" as
capital + lowercase. Acceptance: trace-name with "Emma" shows mixed case with
correct stroke dots; all 26 lowercase letters have paths; visual check of
every letter at large size.

**1.3 Visual-scanning target case handling.**
Uppercase targets get lowercase distractors (trivially easy). In
`generateVisualScanningMode`, match distractor case to the target's case
(uppercase target → uppercase distractor map: B→[D,P,R,E], etc.). Files:
`shapes.ts`. Acceptance: target 'B' produces all-uppercase grids.

**1.4 Expose `showGridLines`** (functional field, no UI). Add a switch under
Advanced for the grid modes (`find`, `count`, `copy`, `pattern`). Files:
`CustomizeControls.tsx`. Acceptance: toggle changes the SVG (test exists
pattern in audit.test.tsx to copy).

**1.5 Print-quality check across modes.** Print each of the 22 templates to
PDF (browser print) and eyeball: nothing clipped, nothing overflowing the A4
box, dotted fonts load (KG Primary Dots is CDN-loaded — if cdnfonts is down
the trace row silently renders solid; self-host both KG fonts in
`public/fonts/` with `@font-face` in `index.css` — do this, it's a real
reliability fix). Acceptance: fonts load offline from own origin.

---

> **Phase 2 progress (2026-07-05):** items **2.1** (build-time prerendering —
> all 29 routes emit static HTML, verified) and **2.2** (6 goal content pages
> with FAQ/JSON-LD, internally linked) are DONE and committed. Item **2.3**
> (OG share image) is deferred — see [DEFER_TO_FABLE.md](DEFER_TO_FABLE.md) D4.

## Phase 2 — Prerendering & content SEO (the rendering decision)

**Decision: stay on Vite + React SPA; add build-time prerendering with a
custom script. Do NOT migrate frameworks** (Astro/Next would be a rewrite of
the editor for marginal gain; the editor itself doesn't need SEO — the
*content pages* do).

**2.1 Build-time prerender script.**
- Add `scripts/prerender.mjs`: after `vite build`, render static HTML for
  `/` and each `/edit/:templateId` route using `ReactDOMServer.renderToString`
  via a small server entry (`src/entry-prerender.tsx`) that wraps App in
  `StaticRouter`. Inject the rendered HTML into `dist/index.html`'s `#root`
  and write `dist/edit/<id>/index.html` with per-route title/description/
  canonical/JSON-LD baked in (reuse strings from `use-page-meta.ts` +
  `templates.ts`).
- `WorksheetPreview` uses `dangerouslySetInnerHTML` with generated SVG — it
  renders fine server-side, but seed it (`generateWorksheetSeeded`) so builds
  are deterministic. `localStorage` access must be guarded (persistence.ts
  already try/catches; verify `typeof window` guards where needed).
- Vercel serves static files before SPA fallback, so `/edit/trace-name` gets
  the prerendered file and hydrates. Add `vercel.json` rewrite fallback to
  `/index.html` for unknown routes.
- Acceptance: `curl` of `/edit/trace-name` on the deployed site returns HTML
  containing the template title and a worksheet `<svg>` without executing JS;
  Lighthouse SEO ≥ 95; hydrated page still fully interactive.

**2.2 Content pages for search intent.** Create one static page per *goal*
("letter reversal worksheets", "pre-writing strokes worksheets", "scissor
skills worksheets", "name tracing", "visual perception worksheets",
"handwriting practice") at `/worksheets/<goal-slug>` — a real HTML page with
300–500 words of practical guidance (what the skill is, when to practice,
how to grade difficulty) + live template cards filtered to that goal. These
match what parents actually search. Add to sitemap. Files: new
`src/pages/GoalPage.tsx`, route in `App.tsx`, copy in `src/data/goalCopy.ts`,
prerender them in 2.1's script. Acceptance: each page prerendered with unique
title/description/JSON-LD (`FAQPage` where copy has Q&A), internally linked
from the gallery footer.

**2.3 OG image.** Generate one real 1200×630 OG image (screenshot of a
worksheet grid) into `public/og.png` and reference it in index.html + per-route
meta. Acceptance: social-card validators show the image.

---

> **Phase 3 DONE (2026-07-05):** 3.1 multi-child profiles (context + header
> switcher + per-child config + age→difficulty + interests→emoji), 3.2 print
> history + "Print 5 varied" + progression nudge + recently-printed strip, and
> 3.3 shareable ?c= links (exact reproduction incl. seed) are all implemented,
> tested and committed. Stayed client-side (localStorage) as decided; the v2
> schema carries ids + timestamps so Phase 4 can sync it. 51 tests pass.

## Phase 3 — Per-child profiles & worksheet sets (personalization architecture)

**Decision: profiles stay client-side (localStorage) in this phase.** No
backend until money exists (Phase 4). The schema is designed to sync later:
all writes go through `src/lib/persistence.ts`, keyed and versioned.

**3.1 Multi-child profiles.**
Schema (extend persistence.ts, migrate `otsheet:profile:v1`):
```ts
interface ChildProfileV2 {
  id: string;            // crypto.randomUUID()
  name: string;
  ageBand: AgeBand;
  interests: EmojiTheme[];   // drives emoji theme defaults
  createdAt: string;         // ISO
}
// key: otsheet:profiles:v2 → ChildProfileV2[]; otsheet:activeProfile:v2 → id
```
UI: a compact profile switcher in `SiteHeader` (dropdown: child name + "Add
child"). Selecting a profile applies name + ageBand (→ difficulty via
`ageBandConfig`) + preferred emoji theme to every template opened. Files:
`persistence.ts`, `SiteHeader.tsx`, `Editor.tsx`, new
`src/components/ProfileSwitcher.tsx`. Acceptance: two profiles with different
ages open the same template with different difficulty defaults; switching
persists across refresh.

**3.2 Practice history + variation.**
On every print, append `{profileId, templateId, config, seed, printedAt}` to
`otsheet:history:v1` (cap 200 entries). Use it for:
- "Print 5 variations" button: generates 5 different seeds of the current
  config as sequential pages (render 5 `WorksheetPreview` pages, one print).
  This is the single most-requested OT workflow (a week of home practice in
  one click).
- "Recently printed" strip on the gallery for the active profile.
- Gentle progression: if the same template was printed ≥3 times at the same
  difficulty, show a non-blocking "Try medium?" chip in the editor.
Files: `persistence.ts`, `Editor.tsx`, `Gallery.tsx`, `use-print-count.ts`
(fold into history). Acceptance: print 3× → chip appears; batch print produces
a 5-page print dialog; history survives refresh.

**3.3 Shareable worksheet links.** Encode config in the URL
(`/edit/:id?c=<base64url(JSON diff vs template)>`) so a therapist can text a
parent an exact worksheet. Read on load (URL beats localStorage), write
debounced. Files: `Editor.tsx`. Acceptance: copying the URL reproduces the
exact worksheet (same seed included) in a private window.

---

## Phase 4 — Accounts + payment (decided, build only when usage justifies)

**Trigger to build this phase: ≥500 weekly active users or ≥3 unsolicited
"can I pay you" signals.** Until then, everything stays free (current
post-3-print Buy-Me-a-Coffee nudge stays).

**Decisions (made now so nothing in Phases 1–3 paints us into a corner):**
- **Model: freemium subscription.** Free forever: browse all templates,
  customize, print single sheets (the SEO/acquisition engine — never gate it).
  Paid "OTsheet Pro", ~US$6/mo or $48/yr, aimed at therapists + committed
  parents: multi-child profiles beyond 2, batch "print 5 variations", practice
  history/progression view, shareable client links, PDF download (jsPDF or
  print-to-PDF service), early access to new modes.
- **Stack: Supabase (auth + Postgres) + Stripe Checkout/Billing.** Rationale:
  no server to run (fits the current static hosting), generous free tier,
  row-level security fits per-family data, and Stripe Checkout avoids PCI
  scope. Vercel serverless functions handle the Stripe webhook →
  `entitlements` table.
- **Sync design:** persistence.ts becomes the local cache of a synced store —
  each profile/history record gets `updatedAt`; on sign-in, last-write-wins
  merge to Supabase. The v2 schema in Phase 3 already carries ids + timestamps
  for this reason.
- **Privacy note (differentiator, keep it):** child data stays on-device for
  free users; only signed-in Pro users sync, and the privacy page must say
  exactly what is stored (name, age band, worksheet history — never uploads,
  never third-party analytics on child data).
- Acceptance (when built): free path unchanged with no account; Pro gates
  return a friendly upsell, not a wall; Stripe test-mode E2E: subscribe →
  entitlement row → gates open; cancel → graceful downgrade (data kept,
  gates close).

---

## Phase 5 — LLM integration (recommendation: yes, narrow scope, after Phase 3)

**Judgment: an LLM is genuinely useful here in exactly two places; everything
else stays procedural.** The generators are deterministic and correct — LLM
"generation" of puzzles would add cost and hallucination risk for zero gain.
Do NOT use an LLM for puzzle/SVG generation, difficulty logic, or progress
inference (history rules in 3.2 do that better and free).

**5.1 Themed word/sentence lists for handwriting (the one clear win).**
A parent wants "5 short words about dinosaurs for a 5-year-old who reverses
b/d". That's a language task procedural code can't do and a cheap LLM does
perfectly.
- Architecture: a single Vercel serverless function `/api/wordlist` calling
  Anthropic `claude-haiku-4-5-20251001` (~$0.0005/request at these token
  counts), with a strict JSON schema response (list of ≤8 words, target
  letters, reading level), rate-limited by IP (e.g. 20/day), results cached in
  the client and localStorage. No child name or profile data in the prompt —
  only theme + age band + target letters. API key stays server-side (env var);
  never ship it to the client.
- UI: in handwriting/word-box editor, "Suggest words" button with theme +
  target-letter pickers, output editable before printing.
- Fallback: 30 curated static word lists (per theme × age band) shipped in the
  bundle so the feature degrades gracefully offline / over quota.
- Acceptance: suggestion round-trip < 2s; malformed LLM output never reaches
  the sheet (schema-validate, fall back to static lists); zero PII in request
  logs.

**5.2 (Later, Pro-only) Home-practice note generator.** Turn a profile's
recent history into a short parent-friendly note ("This week Emma practiced…
next week try…"). Same serverless pattern; only with explicit user action;
input is aggregate history, not free text about the child. Build only after
5.1 proves the pipeline.

---

> **Phase 6 progress (2026-07-05):** DONE — prerendered `/privacy` page (honest
> on-device data policy) linked from the footer + sitemap; worksheet SVG now has
> a descriptive `role="img"` aria-label; gallery chips have focus-visible rings;
> `prefers-reduced-motion` disables the paper animation; mobile print hint shows
> "Save as PDF" guidance. NOT done (need owner input, see summary): real contact
> email + Buy-Me-a-Coffee link; analytics left OFF pending explicit opt-in.
> Correction: `next-themes` is NOT removable — the shadcn Sonner toaster imports
> it (`ui/sonner.tsx`); `@tanstack/react-query` is provider-only and kept as the
> intended data layer for the Phase 5 LLM calls.

> **New strategy docs (2026-07-06, Fable):** [DESIGN_STRATEGY.md](DESIGN_STRATEGY.md)
> — decided visual direction ("warm paper studio") for the website (Part A) and
> the printed worksheets (Part B), phased for Opus. SEO/content:
> `.claude/skills/seo-content` — full strategy + the /guides content space (G0)
> + per-article production recipe + 20-topic backlog. Navigation scroll-reset
> bug fixed (cards opened past the toolbar).

## Phase 6 — Trust & polish backlog (fold into any phase)

- Replace footer placeholders: real contact email, real Buy-Me-a-Coffee link,
  a short privacy page stating the on-device data policy (`/privacy`, static,
  prerendered — pairs with Phase 2).
- Mobile print: detect iOS/Android and show a "Save as PDF" hint instead of
  the desktop-only note.
- Accessibility: `aria-label` on the worksheet SVG ("Worksheet: find the
  circle, 3 by 3 grid"), keyboard focus states on gallery chips (mostly there
  via shadcn), `prefers-reduced-motion` respected (no animations currently —
  fine).
- Analytics decision: **Vercel Analytics only** (privacy-friendly, no cookies,
  no consent banner needed, zero child data). No Google Analytics.
- `next-themes` and `@tanstack/react-query` are installed but unused — remove
  next-themes; KEEP react-query only if Phase 4/5 lands soon (it's the right
  data layer for API calls), otherwise remove both.

## Known constraints (do not regress)

- Never gate single-sheet printing (free acquisition path + the product's
  soul).
- Worksheet generation stays deterministic-per-seed; thumbnails use
  `seededGenerate.ts`.
- Print output = the preview SVG via `window.print()`; any PDF feature is
  additive, not a replacement.
- No child-identifying data ever leaves the device without explicit sign-in
  (Phase 4) — including LLM prompts (Phase 5 sends theme/age only).
