# Deferred to Fable (stronger-model) sessions

Items encountered while implementing [ROADMAP.md](ROADMAP.md) that a weaker
execution model should NOT attempt, because they need strong spatial reasoning,
content/pedagogical design, or high-stakes judgment where a plausible-but-wrong
answer is actively harmful. Each entry says **why deferred**, **exact scope**,
and a **ready-to-paste prompt** for a Fable session.

Run these with the model set to `claude-fable-5`. Do one at a time; each is
self-contained.

---

## Phase 4 & 5 — execution risk map (READ before letting a cheaper model start)

Most of Phase 4 (accounts + Stripe) and Phase 5 (LLM word lists) is fine for a
capable executor (Opus) — but three classes of work inside them must NOT be
"just implemented" by a weaker model, because a plausible-but-wrong version is
silent and catastrophic. Split the work like this:

**A. Fine for Opus (mechanical, well-specified, reviewable):**
- Supabase project scaffolding; email/OAuth sign-in UI; the serverless function
  skeleton; the Stripe Checkout redirect + customer-portal wiring; client-side
  entitlement-gating UI; the free-trial feature-flag structure; the 30 static
  fallback word lists; caching + IP rate-limit plumbing for /api/wordlist.

**B. Reserve for Fable (or, at minimum, gate behind `/security-review` + real
multi-account testing) — high blast radius, easy to get subtly wrong:**
- **Supabase Row-Level Security policies.** One gap leaks another family's
  child names/history across accounts. Every table, every policy, no holes —
  this is the single most error-prone part. Verify by logging in as two
  accounts and trying to read each other's rows.
- **Stripe webhook handling:** signature verification + idempotency + granting
  entitlements ONLY from verified webhook events. Get this wrong and either
  anyone forges "paid" and unlocks Pro free, or double-charges/retries corrupt
  state.
- **Server-side entitlement enforcement.** Gating in React is cosmetic; Pro
  features must be enforced on the server/DB. Deciding what is truly gated vs.
  cosmetic is architectural, not mechanical.
- **The server schema + localStorage→server merge/migration.** Expensive to
  change once real users exist; the conflict logic (same child, two devices) is
  where silent data-loss hides.
- **LLM output content-safety (Phase 5).** Themed words go straight onto a sheet
  a child sees. A naive impl will eventually emit an inappropriate word. Needs
  constrained prompting + an allow/deny output filter, not just JSON-schema
  validation. This is a genuine kids'-product judgment call.
- **API-key isolation.** The Anthropic key stays in the serverless env only;
  make sure no client-imported module ever references it.

**C. NOT a model decision at all — surface to the human FIRST (may change the
architecture):**
- **COPPA / GDPR-K compliance.** The moment accounts store a child's *name* on
  a server, this is a children's product holding kids' PII → regulated. Decide
  BEFORE building: is a real child name stored server-side at all, or do Pro
  accounts sync only a nickname / keep names client-only? This can change the
  Phase 4 schema, so it must be settled up front — not discovered later.
- **Pricing, Terms of Service, refund policy.** Business/legal.
- **Whether ANY data (even theme + age, no name) may be sent to an external LLM
  from a children's app.** A privacy-posture call the owner signs off on; the
  app currently sends zero data anywhere.

Bottom line for a "should Opus do Phase 4/5?" decision: **yes for bucket A, no
for buckets B and C.** Have the human resolve C, have Fable (or a reviewed pass)
do B, and let Opus do A around them.

---

## D1 — Lowercase letterforms for name tracing (ROADMAP 1.2)

**Status: DONE (2026-07-05).** Implemented as scoped; see NOTES.md D1 entry.

**Why deferred:** authoring 26 lowercase letters as normalized stroke-point
arrays (`[x,y]` in a shared coordinate space, correct stroke *order* and
*direction*, correct ascender/descender/x-height proportions) is a spatial-
design task where a weaker model reliably produces letters that are subtly
malformed or stroked in the wrong direction. This is a handwriting-teaching
tool for children — a wrong letterform teaches a motor habit that a therapist
then has to un-teach. Highest-stakes, lowest-tolerance-for-error item in the
phase.

**Exact scope:**
- File: `src/lib/letterPaths.ts`. Existing uppercase format is the contract:
  `LetterStrokes = Stroke[]`, `Stroke = [x,y][]`, coordinates normalized to the
  cap-height box `x∈[0,1], y∈[0,1]` where `y=0` is the top line and `y=1` the
  baseline. First point of each stroke is where the pen starts (drives the
  green numbered start dot in the renderer).
- Add lowercase `a`–`z`. They need a TALLER coordinate range: x-height letters
  occupy `y∈[0.4,1]` (x-height ≈ 60% down), ascenders (b,d,f,h,k,l,t) rise to
  `y≈0`, descenders (g,j,p,q,y) drop to `y≈1.4`. So the lowercase coordinate
  space is `y∈[0,1.4]`. Document this clearly at the top of the lowercase block.
- Stroke ORDER and DIRECTION must follow standard manuscript ("ball and stick"
  / Zaner-Bloser-style) formation: e.g. `a` = ⟲ around-circle first then the
  down-stroke; `b` = long down-stroke first then the bowl; `t` = down-stroke
  then the cross; `i`/`j` = stem/hook first then the dot; etc.
- Renderer changes in `src/components/WorksheetPreview.tsx`
  (`renderTraceNameMode`): the three guideline rows currently assume cap-height
  letters in `y∈[0,1]`. Extend the letter-drawing to (a) render mixed case
  (capitalize first letter, lowercase the rest — "Emma"), (b) scale the taller
  `y∈[0,1.4]` range so descenders sit below the baseline guideline, (c) add a
  proper x-height guideline (dashed midline already exists — align x-height to
  it). Do NOT regress the existing uppercase rendering (Trace-name with an
  all-caps name and the visual-perception letter modes still use A–Z).
- `generateTraceNameMode` in `src/lib/shapes.ts`: stop force-uppercasing; keep
  only `[A-Za-z]`, preserve the child's actual capitalization, default to
  Capitalized-first-letter if the input is all one case.
- Tests (`src/test/audit.test.tsx`): assert all 26 lowercase letters have a
  non-empty path; assert "Emma" renders mixed-case (contains lowercase stroke
  data distinct from "EMMA"); visual spot-check every letter at large size.

**Ready-to-paste prompt:**
> Set model to claude-fable-5. In otsheetai/, implement ROADMAP item 1.2
> (lowercase name tracing) exactly as scoped in DEFER_TO_FABLE.md section D1.
> Author correct manuscript-style lowercase a–z stroke paths (right stroke
> order/direction, proper ascender/x-height/descender proportions in a
> y∈[0,1.4] space), extend renderTraceNameMode to draw mixed-case names with a
> descender-aware guideline, and stop force-uppercasing in generateTraceNameMode.
> Run the dev server and visually verify every letter a–z and the names "Emma",
> "bpqgy", "Wolfgang" trace cleanly with start dots on the correct stroke.
> Add regression tests. Do not regress uppercase trace-name or the A–Z visual
> perception modes. tsc + vitest must stay green; commit when verified.

---

## D2 — Pixel-art difficulty levels (ROADMAP 1.1, pixelArt portion)

**Status: DONE (2026-07-05).** Implemented (8×8/10×10/12×12 tiers, control un-hidden); see NOTES.md D2 entry.

**Why deferred:** the pictures are a fixed hand-designed set
(`PIXEL_ART_PATTERNS` in `src/lib/shapes.ts`), each with a baked-in color count
and 10×10 grid. The ROADMAP's suggestion (easy 2 colors / hard 5) can't be
applied to an existing picture without either merging color regions (which
mangles the image) or leaving it cosmetic. Doing this *right* means designing
NEW artwork per difficulty tier — a content-authoring + visual-design task, not
a mechanical one. A weaker model would either break the existing pictures or
ship a fake "difficulty" that changes nothing meaningful.

**Exact scope (decision for Fable to make, then implement):**
- Decide the difficulty model. Recommended: difficulty = grid resolution +
  color count together — easy: simple 8×8, 2–3 colors, large regions; medium:
  current 10×10, 3–4 colors; hard: 12×12 or 14×14, 4–5 colors, finer detail.
- That requires authoring easy and hard variants of each theme (or a smaller
  curated set per tier). Keep the `PixelArtData` shape and renderer contract;
  only the pattern source grows a per-difficulty dimension.
- Then un-hide: remove `'pixelArt'` from `DIFFICULTY_DEAD_MODES`.
- Acceptance: same theme at easy vs hard produces visibly different grids with
  different color counts; every pattern still forms a recognizable picture when
  colored; no off-by-one in the color key.

**Ready-to-paste prompt:**
> Set model to claude-fable-5. In otsheetai/, implement pixel-art difficulty
> per DEFER_TO_FABLE.md section D2: design easy/medium/hard artwork variants for
> each pixelArt theme (grid resolution + color count), wire difficulty into
> generatePixelArtMode, un-hide the control, and add tests. Every variant must
> still render a recognizable picture — verify each in the browser before
> committing.

---

## D3 — Self-host fonts + full print QA across all 22 templates (ROADMAP 1.5)

**Status: DONE (2026-07-05).** KG fonts replaced with self-hosted OFL Edu QLD Beginner; dotted trace row is now paint-based (font-independent); 22-template × easy/hard QA passed with 0 overflow. See NOTES.md D3 entry.

**Why deferred:** two reasons. (1) **Licensing judgment** — these are
third-party fonts; self-hosting requires confirming the license permits it
(and possibly choosing a differently-licensed equivalent). That's a
human/strong-model judgment call, not a mechanical edit. (2) **Print QA is a
visual-judgment task across 22 templates × difficulty levels** — deciding
whether a sheet is "clipped", "too cramped", or "well-proportioned for a
6-year-old" is exactly the perceptual judgment a weaker model does poorly from
screenshots. Pairs naturally with a strong model that can eyeball each PDF.

**Exact scope:**
- Confirm licensing for KG Primary Penmanship 2 + KG Primary Dots for
  self-hosting; if unclear, pick licensed equivalents (or a self-drawn dotted
  variant). Add `.woff2` files to `public/fonts/` with `@font-face` in
  `src/index.css`; remove the cdnfonts `<link>`s from `index.html`. Add a
  visible-fallback check so a missing dotted font is obvious, not silent.
- Print each of the 22 templates (browser print → PDF) at easy AND hard where
  applicable. Log per-template: anything clipped, overflowing the A4 content
  box, or mis-proportioned. Fix layout math in `WorksheetPreview.tsx`
  (many magic numbers for margins/row heights).
- Acceptance: dotted trace font loads from own origin with network throttled;
  no template clips or overflows at any difficulty; a short QA table recorded
  in NOTES.md.

**Ready-to-paste prompt:**
> Set model to claude-fable-5. In otsheetai/, do ROADMAP item 1.5 per
> DEFER_TO_FABLE.md section D3: resolve the KG font licensing question and
> self-host the handwriting fonts (with a visible fallback), then print-QA all
> 22 templates at easy and hard, fixing any clipping/overflow/proportion issues
> in WorksheetPreview.tsx. Record a QA table in NOTES.md and commit.

---

## D4 — Social share image (OG image, ROADMAP 2.3)

**Status: DONE (2026-07-05).** 1200×630 `public/og.png` designed (brand mark +
tagline + three worksheet motifs: find-the-shape grid, color-by-grid heart,
tri-line handwriting with dashed trace row) and wired into index.html
(og:image + width/height/alt, twitter:card=summary_large_image). All 30
prerendered pages inherit it. Validate on the live deploy with the social-card
debuggers after the next Vercel deployment.

**Why deferred:** producing a real 1200×630 raster PNG is a design/asset task —
it needs an actual image file (a nicely composed screenshot of a colorful
worksheet grid + logo + tagline), not code. A weaker model can't rasterize one
reliably, and an SVG `og:image` isn't rendered by Twitter/Facebook, so a
half-measure would look broken in shares.

**Exact scope:**
- Create `public/og.png` at 1200×630: OTsheet.ai logo + tagline ("Free
  printable OT worksheets for kids") over a tidy arrangement of 2–3 real
  worksheet thumbnails (find-the-shape grid, handwriting lines, a maze). On-
  brand teal/warm palette.
- Reference it in `index.html`: `<meta property="og:image" content="https://otsheetai.vercel.app/og.png">`
  + `twitter:image` + switch `twitter:card` to `summary_large_image`.
- Optionally per-route OG images later (nice-to-have, not required).
- Acceptance: Facebook Sharing Debugger and Twitter Card Validator both render
  the image.

**Ready-to-paste prompt:**
> Set model to claude-fable-5. In otsheetai/, do ROADMAP 2.3 per
> DEFER_TO_FABLE.md D4: design a 1200×630 public/og.png (logo + tagline + real
> worksheet thumbnails, on-brand), wire og:image/twitter:image into index.html,
> and switch twitter:card to summary_large_image. Verify it renders in a social
> card validator.

---

## How the executing (weaker) model should hand back

When you finish the mechanical parts of a phase and hit one of these, don't
guess — leave the item here (or add a new Dn entry), keep the rest of the phase
green (tsc + tests), and tell the user which Dn items are ready for a Fable run.
