# Therapistools: agent guide

**New session or new account? Read [docs/HANDOFF.md](docs/HANDOFF.md) first.**
It holds the owner's preferences, the decisions already made, and the next steps.

One static site, four parts: `apps/home`, `apps/worksheets`, `apps/scheduler`,
`apps/iep`. What each is and the commands: [README.md](README.md). Each app
also has its own docs; read them before changing that app.

## Rules (do not weaken)

1. **No child or student names stored, anywhere.** A name typed for printing a
   worksheet lives only in memory: `withoutChildName` in the worksheet app's
   `src/lib/persistence.ts` strips it from settings, history and share links,
   profiles use nicknames, and tests in `src/test/persistence.test.ts` prove it.
   The site privacy page (`apps/home/privacy/`) is the single privacy policy.
2. **IEP Writer talks to one place at most, and has no analytics.** The only
   network code is `apps/iep/src/account/` (optional sign-in; stores the
   writer's report template and nothing else, docs/ACCOUNTS.md). The website
   page's CSP allows exactly the Supabase origin named in `apps/iep/.env`;
   the downloadable offline file keeps `connect-src 'none'` and bundles no
   account code. Tests and `infra/publish.sh` enforce both. Drafts, filled
   values, ratings, recipes and the sentence library never leave the browser.
   **Analytics policy:** no page has analytics (owner decision 2026-10-26, at
   the move off Vercel). Cloudflare must not inject its beacon either: every
   response carries `Cache-Control: no-transform` (docs/INFRA.md), and
   `npm test` checks the Caddyfile keeps it. Never send anything a person
   typed. Any change here must also update `apps/home/privacy/index.html`.
3. **No personal details of the author** in code, docs, fixtures or commits.
4. **Fictional data only** in tests and demos.
5. **Each app keeps its own dependencies.** Do not hoist into npm workspaces
   until the apps share React and Vite major versions.
6. **Shared look lives in `shared/`.** Change colors and fonts in
   `shared/brand.css`, the name and address in `shared/brand.js`. Apps map
   their own variables onto the `--tt-*` tokens; don't hard-code brand colors
   in an app. No third-party fonts or scripts outside the worksheet app.
   The first-visit guided tour is shared too (`shared/tour.js`, `tour.css`,
   `tour.d.ts`): framework-free, anchored on `data-tour` attributes; each app
   lists its own steps and keeps its own "seen" flag.
7. **Keep stored data compatible.** The IEP Writer still saves under
   `easyiep.*` keys and tags backups `app: "easyiep"`; the worksheet app uses
   `otsheet:*`. These are internal names; don't rename them without a migration.
   The IEP Writer keeps one bank per discipline (`src/model/disciplines.ts`):
   OT uses the original keys, others add a suffix such as `easyiep.library.slp`
   (`keyFor` in `src/model/storage.ts`). Only OT ships a starter library.
   Report-template packs save under `easyiep.pack.<discipline>` and travel as
   `pack` in the backup file.
8. **Mount paths live in one place per app:** `base` in its `vite.config.ts`
   (the worksheet app also has `src/lib/site.ts`). Routing fallbacks live in
   `scripts/site-routes.mjs` and must match `infra/Caddyfile`
   (`scripts/check-caddy-routes.mjs` in `npm test` enforces it).
9. **Hosting:** self-hosted on a homelab server behind a Cloudflare Tunnel;
   a push to `main` deploys (`.github/workflows/deploy.yml`). The canonical
   address is `https://www.therapistools.com`. Box, deploys, rollback and
   rebuild: [docs/INFRA.md](docs/INFRA.md). Before changing anything about
   serving or deploying, read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
   (decisions, runbooks, lessons). The Caddyfile, publish script and deploy
   gate are applied to the box by hand; a deploy does not update them.

## IEP Writer report builder

The Report tab (`apps/iep/src/report/`) is the main IEP flow: setup, a Word
draft with fixed wording, openers and yellow [[blanks]], and one AI prompt per
section. Every discipline's template is a **template pack** (`report/pack.ts`):
the report as plain data (assessments with optional rating grids, sections and
paragraphs with `when` conditions on report type, concerns, areas of concern
(motor, sensory: `setup.concernIn`, ticked under Result, so one can be a
concern while the other is not), grade, service
type, teacher areas, standards and assessments done; paragraphs can be tick
boxes (`optional`, ticks in `setup.screenItems`), repeat per objective, and
carry `{count}` and `{summary:<grid>}` slots), saved under
`easyiep.pack.<discipline>`. A writer starts one from the pre-made sample
(`report/premade/`, one per discipline, OT included since 2026-11-03), blank,
or from their own document, and owns it: edits change the pack directly and
travel in the backup file and the account. There is no built-in template in
the code any more: the OT code template, its overrides layer, freeze and
adoption retired on 2026-11-03 (git history has them); the owner's own
wording lives only in their browser, backup file and account, so never paste
real report text into the code, and every sample sentence and test fixture is
fictional (rule 4). The pre-made OT pack keeps the usual section headings but
its content is its own; the owner asked that it not mirror their district
form. Use {{student}} once per section then pronoun tokens, never a real name.
Blanks can name a dropdown list as `[[label::list]]` (shared lists in
`options.ts`, copied into each pack); others offer sample sentences from the
block's or section's examples (`samples.ts`). Ratings use one model, the
rating grid (`grids.ts`: groups of items × levels, a sentence pattern per level
with `{items}`, `{Items}`, `{was}`), and ratings are stored as "group.row".
The owner took the self-care checklist out of the OT template on 2026-10-27,
so the OT sample has none; since 2026-11-03 it is a **ready-made assessment**
(`report/premade/assessments.ts`, with every assessment of the discipline's
sample) that Edit template → Add an assessment copies into a writer's own
pack with fresh ids (`withFreshIds`). Filled values are keyed "section/block/n", so every block
has a permanent `id`. Lines marked `generated` are written from setup choices:
those with a `grid` open that grid's editor, those with a `pattern` are edited
as the pattern. `ui/ReportBuilder.tsx` is the builder, `ui/ReportOutput.tsx`
the preview, prompts and Word download. "Build from my document" is plain
rules, no AI: `report/docx-read.ts` reads a .docx in the browser (jszip +
DOMParser) or pasted text; `report/import-doc.ts` drafts sections,
assessments, grids, blanks, dropdowns and hints, and leaves identifying lines
out; `ui/ImportDocument.tsx` is the review screen. The old Library, Import,
Builder and Output tabs retired on 2026-11-09 (git history has them); the
sentence library is still loaded and saved (`model/storage.ts`) because the
privacy allow-list and backup files use it. Edit mode shows every paragraph of
the template, with the ones the setup leaves out greyed and the reason named
(`packSections(pack, setup, { showHidden: true })`), and each paragraph's
`when` condition and tick-box flag are editable (`ConditionEditor`). The blank
picker reads the paragraph's wording as a pattern over the examples and lifts
out what sits in that blank's spot (`samples.ts`: `liftFills`), then ranks
sentences by shared words (`relevantSentences`); "show all" keeps every sentence.

## Definition of done

`npm test`, `npm run typecheck` and `npm run build` all pass at the root, and
the changed tool works in `npm run preview`. Pushing to `main` publishes it.

## Open work

- Worksheets still load fonts from Google Fonts (disclosed on the privacy page).
  Moving them to `shared/fonts` needs print QA of every template first.
- IEP Writer: the owner's own template (in their account) still carries
  wording from the old template that the 2026-11-09 feedback asked to change
  (hand dominance merged into the grasp line, the accommodations line shown
  whichever teacher areas are ticked, a Beery "overall" line, an indirect
  service example); the code's sample has them, the owner edits their own in
  Edit template. The daily living checklist's form order is unconfirmed: ask
  the owner for the form.
- IEP Writer accounts went live on 2026-11-03 (docs/ACCOUNTS.md). The
  owner's own wording is in their account; the code holds a generic sample.
- Cloudflare Web Analytics is still switched on in the Cloudflare dashboard
  (the server blocks it with `no-transform`); the Cloudflare account owner
  turns it off (docs/INFRA.md).
