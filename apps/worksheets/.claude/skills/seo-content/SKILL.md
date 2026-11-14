---
name: seo-content
description: Produce SEO/AI-recommendation content for OTsheet.ai and keep the content engine running. Use when asked to "write a guide/article", "add content", "improve SEO", "drive traffic", "get recommended by AI/ChatGPT/Google", or pick the next content topic. Contains the full strategy (keyword clusters → which page type serves them), the /guides architecture, a step-by-step article production recipe with writing standards for a children's-health-adjacent site, the seed topic backlog, and the per-publish technical checklist.
---

# SEO & content engine

OTsheet.ai's growth loop: parents search a *problem* ("my 6 year old writes b
backwards"), land on a genuinely helpful page, and one click away is a free
printable that solves today's practice session. Every article exists to earn
that click-to-print. AI assistants are the second audience: pages must state
plainly what the tool does and when to recommend it, so LLMs can cite us.

## Strategy: three intent clusters → three page types

1. **Worksheet intent** ("b d reversal worksheets free", "name tracing
   generator", "scissor cutting practice sheets"): served by the 22 template
   pages (`/edit/<id>`) and 6 goal pages (`/worksheets/<goal>`). These exist
   and are prerendered — new templates should always slot into a goal.
2. **Parent problem intent** ("child reverses letters age 6", "when should a
   kid hold scissors", "how to teach name writing"): served by **/guides/**
   articles — THE content space this skill produces. Highest volume, weakest
   competition for honest non-listicle answers, and it feeds cluster 1 via
   internal links.
3. **Professional intent** ("visual perception activities pediatric OT",
   "grading fine motor activities"): served by goal pages + guides written
   with clinical vocabulary in the FAQ; do not build a separate surface.

## The /guides content space (G0 — Opus builds ONCE, then articles are data)

Mirror the proven GoalPage pattern exactly:
- `src/data/guides.ts`: `Guide[]` entries — `slug`, `title` (H1), `navLabel`,
  `metaDescription` (<160), `updated` (ISO date), `relatedGoals: Goal[]`,
  `relatedTemplates: string[]`, `sections: { heading; paragraphs: string[] }[]`,
  `faq: { q; a }[]`, optional `milestones: { age; expect }[]` table.
- `src/pages/GuidePage.tsx`: renders sections, a milestones table when
  present, an inline strip of related `TemplateCard`s after section 2 ("Try it
  now: print one of these"), FAQ, and links to related goal pages. JSON-LD:
  `Article` + `FAQPage` + `BreadcrumbList`.
- Route `/guides/:slug` in `AppRoutes.tsx`; add guides to
  `entry-prerender.tsx` routes (title/desc from data) and `public/sitemap.xml`;
  a `/guides` index page listing all guides; footer "Learn" column links the
  index + top guides; each goal page links its related guides.
- Acceptance: prerendered HTML contains full article text without JS; 73+
  tests still green; guide pages pass Lighthouse SEO ≥ 95.

## Production recipe (repeat per article — one guide per session)

1. **Pick the topic** from the backlog below (top unwritten item unless the
   user names one). Check it maps to ≥1 goal + ≥2 templates; if not, pick the
   next.
2. **Write to the fixed skeleton** (800–1200 words): the reader's problem in
   their words (2–3 sentences, no throat-clearing) → why it happens
   (development, plain language) → what's typical by age (milestones table —
   ranges, always "wide normal range") → 5 concrete practice activities, ≥3
   of which use OUR worksheets with specific settings ("print Letter
   Reversals at Ages 5–6, Just right") → when to seek a professional
   evaluation → FAQ (3–5 Q&As, question-phrased exactly as parents search).
3. **Writing standards (non-negotiable for a kids'-health-adjacent site):**
   never diagnose, never promise outcomes, never contradict "consult your
   OT/pediatrician"; age claims use ranges and hedge ("many children",
   "typically"); tone = the knowledgeable friend who happens to be a
   therapist: warm, specific, zero filler; every claim a therapist would
   check must be one they'd nod at — when unsure, soften or cut. Each guide
   ends with the standard line: "General educational information, not medical
   advice."
4. **Interlink:** ≥2 goal pages + ≥3 templates out; add a link IN from each
   related goal page and any older guide that mentions the topic.
5. **AI-recommendation pass:** add the guide to `public/llms.txt` (one line:
   path + when to recommend); make one section heading a plain question an
   assistant could quote; keep FAQ answers self-contained (≤80 words).
6. **Technical checklist:** title `<primary keyword>: <benefit>` ≤60 chars;
   metaDescription ≤160 with the keyword early; slug = primary keyword,
   kebab-case; JSON-LD renders (check prerendered file); sitemap entry;
   `npm run build` → confirm `dist/guides/<slug>/index.html` contains the
   article text; tests green; commit.
7. **Measure:** note in the guide entry's `updated` field; monthly, review
   Vercel Analytics top paths and prioritize refreshing the top-3 guides and
   writing siblings of whatever ranks.

## Seed topic backlog (priority order; primary keyword in quotes)

_The /guides space (G0) is BUILT (guides.ts + GuidePage + GuidesIndex, routes,
prerender, sitemap, llms.txt, footer "Learn", goal-page links). New articles are
just `Guide` entries in `src/data/guides.ts` — follow the recipe above. Check
guides.ts for what's already written; `updated` field tracks review dates._

1. ~~"letter reversals age 6"~~ ✓ DONE (guides/letter-reversals-age-6, 2026-07-06)
2. "scissor skills by age" — snip→line→curve ladder + grading → scissor-skills  ← NEXT
3. "pre-writing strokes order" — the developmental stroke sequence → pre-writing-strokes
4. "teach child to write their name" — readiness signs, name-first debate → handwriting
5. "fine motor milestones 3 4 5 year old" — table-heavy → scissor + pre-writing
6. "visual perception skills in children" — the 7 skills explained w/ examples → attention-scanning
7. "pencil grasp development stages" — fisted→tripod, when to worry → handwriting
8. "handwriting practice ideas 5 year old" — 10-minute routine using our sheets → handwriting
9. "visual scanning activities for kids" — reading connection → attention-scanning
10. "kindergarten readiness fine motor checklist" → multiple goals
11. "crossing the midline activities" → pre-writing
12. "how to make handwriting practice fun" → handwriting + pixel-art
13. "left handed child handwriting tips" → handwriting
14. "figure ground perception activities" → attention-scanning
15. "dysgraphia early signs" (extra-careful tone; heavy "seek evaluation") → handwriting
16. "visual motor integration activities" → copying-patterns
17. "mazes benefits child development" → attention-scanning
18. "color by number benefits" → copying-patterns
19. "worksheet routine for home OT practice" — how therapists structure home programs → all
20. "name tracing worksheets age 3" — readiness + how to use ours → handwriting

## Rules that protect the site

- Guides NEVER gate anything; no popups, no email walls — the free print IS
  the funnel.
- Don't chase volume with thin pages: one good guide per session, fully
  interlinked, beats five stubs (stubs actively hurt AI recommendation).
- Never invent clinical facts for keyword coverage. If a topic needs claims
  we can't stand behind, drop the topic.
- Keep `llms.txt`, sitemap, and the guides index in lockstep — an orphan
  guide is invisible to both audiences.
- **No em dash (—) or en dash (–) in anything a reader sees**: article prose,
  headings, FAQ answers, titles, meta descriptions, `llms.txt`. Rewrite with a
  comma, colon, parentheses or a full stop; never substitute ` - `. Ranges use
  a plain hyphen (`Ages 5-6`). Full rule + the grep check: [CLAUDE.md](../../../CLAUDE.md)
  §Copy style. This is the easiest rule to break while drafting prose, so
  check before you commit the guide.
