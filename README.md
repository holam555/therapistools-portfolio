# Therapistools

**Free browser tools for school-based therapists, built by a practising
occupational therapist to fix her own workday.**
Live at [www.therapistools.com](https://www.therapistools.com).

No accounts, no backend, no analytics. Everything runs in the browser and
stays there. No student's name is ever stored.

## The problem

School therapists spend a large part of each week on paperwork that follows
the same shape every time: IEP reports with fixed district wording and a few
student-specific details, caseload schedules matched by hand across many
spreadsheets, and worksheets adapted one child at a time. General-purpose AI
chatbots don't fit this work well: the drafts don't sound like a clinician,
they invent scores, and most therapists are unsure what is safe to type into
them under district privacy rules.

Therapistools is one site with three tools that take that work apart.

## The tools

### IEP Writer, `/iep/`

Turns an IEP report into a **template**: the fixed clinical wording is
written in, the parts that change per student are yellow blanks. The writer
sets up the report (evaluation or annual review, concerns or none, grade,
pronouns, which assessments were done), fills blanks by clicking them, and
downloads a Word draft.

For the narrative parts, the tool writes **one AI prompt per section**. Each
prompt carries the section's frame, two or three sample sentences so the tone
matches, a short set of rules (fill blanks only from my notes, never invent
scores or dates, never add a name) and a place to paste rough notes. The
writer pastes it into whatever AI tool their district has approved. The tool
itself never calls an AI, never connects to the internet, and never sees a
student's name, so there is no privacy question to answer before using it.

The design choices that matter:

- **Prompt design as a product.** The frame, few-shot examples and guardrails
  live in the template, not in the writer's head. The AI does sentence-level
  writing; structure and clinical judgment stay with the therapist.
- **Everything is editable in plain words.** Wording, blanks, dropdown
  choices, sample sentences, section titles, when a section appears, and
  each rating table's items, levels and sentence patterns. A non-technical
  therapist can shape the AI's behaviour for their own district.
- **Build your own template without AI.** Other disciplines (speech,
  physical therapy, psychology, special education) upload their district's
  report form as a Word file, or paste it, and a rules-based reader turns
  headings into sections, score tables into lines with blanks, rating tables
  into checklists, highlighted choices into dropdowns and red instructions
  into hints, leaving identifying fields out. A review screen lets the writer
  correct the guesses before the template is used.
- **Privacy by design.** No name field anywhere; a privacy check warns when
  typed text looks like a name, date or phone number; the Word draft carries
  `[STUDENT]` for the therapist to replace in Word.

### Scheduler, `/scheduler/`

A visual gap board for a therapist's caseload: students' open times across
the week (as ID numbers only), where sessions can fit, and a draft schedule
for the whole team, replacing hand-matching across spreadsheets. Also tracks
IEP deadlines and logs sessions.

### Worksheets, `/worksheets/`

Printable OT worksheets generated from practice-based templates, adjusted to
a child's handwriting and visual-perception needs. A name typed for printing
lives only in memory and is stripped before anything is saved or shared.

## Repository layout

| Part | Path | Source |
|---|---|---|
| Home page and privacy policy | `/` | `apps/home` (static HTML) |
| IEP Writer | `/iep/` | `apps/iep` (React, Vite) |
| Scheduler | `/scheduler/` | `apps/scheduler` (React, Vite) |
| Worksheets | `/worksheets/` | `apps/worksheets` (React, Vite) |
| Shared look | | `shared/` (brand tokens, fonts, suite bar; no dependencies) |

Each app has its own README with the details of that tool. The agent guide
for working in this repository is [CLAUDE.md](CLAUDE.md); the state of the
work and the decisions behind it are in [docs/HANDOFF.md](docs/HANDOFF.md).

## Commands

```bash
npm run install:all   # install every app's dependencies
npm run build         # build all apps and assemble the site in dist/
npm run preview       # serve dist/ at http://localhost:4300 with production routing
npm test              # every app's test suite
npm run typecheck     # every app's TypeScript check
```

To work on one tool with live reload, run `npm run dev` inside its folder.

## How the pieces fit

- `scripts/build-site.mjs` builds each app and copies its output under its path.
- `scripts/site-routes.mjs` lists which paths fall back to an app shell. The
  preview server uses it; `infra/Caddyfile` repeats the same rules for
  production, and `npm test` checks the two match.
- Each app is told its path through `base` in its `vite.config.ts`.
- `shared/brand.css` holds the fonts and colour tokens (`--tt-*`);
  `shared/brand.js` the name, address and list of tools;
  `shared/suite-bar.js` the `<tt-suite-bar>` switcher at the top of every page.

## Privacy rules every tool follows

The full policy is the site's privacy page, `apps/home/privacy/index.html`.

- No accounts and no server-side storage.
- No child or student names are stored. Students are placeholders or ID numbers.
- The IEP Writer makes no network requests at all.
- No page has analytics.
- Every sample sentence and test fixture in this repository is fictional.
