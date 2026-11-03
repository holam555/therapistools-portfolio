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
section. Content lives in `ot-pack.ts` and `ot-screen.ts` (the fine motor
screen is the only part that changes with grade: K–1, 2–5, 6–8; 9–12 borrows
6–8). Its wording is a generic sample (rewritten 2026-11-03); the owner's own
wording lives only in their template edits, backup file and account, so never
paste real report text into the code, and every sample sentence and test
fixture is fictional (rule 4). `report/freeze.ts` runs once per browser: a
browser that used the tool before the rewrite keeps its wording as its own
edits. Keep the structure and block ids, use {{student}} once per section
then pronoun tokens, and never add a real name. Blanks can name a dropdown list as
`[[label::list]]` (lists in `options.ts`); others offer sample sentences from
the block's examples (`samples.ts`). Ratings use one model, the rating grid
(`grids.ts`: groups of items × levels, a sentence pattern per level with
`{items}`, `{Items}`, `{was}`); SPM-2 (`spm.ts`, one line per level) is the
built-in grid, and ratings are stored as "group.row". The owner removed the
self-care checklist from the OT template on 2026-10-27; don't add it back. Filled values are keyed
"section/block/n", so every block has a permanent `id`. Writers can edit the
template in the tool (Edit template): wording, labels, sample sentences,
dropdown lists, hidden paragraphs, section titles, their own screen items, and
each grid's items, levels and sentences. Edits live in `easyiep.template`
(`report/overrides.ts`), are laid over the built-in pack, travel in the backup
file, and never change the code. Lines marked `generated` are written from
setup choices: those with a `grid` open that grid's editor, the goal frame
isn't editable.

Other disciplines use a **template pack** (`report/pack.ts`): the same report
as plain data (assessments with optional grids, sections and paragraphs with
`when` conditions on report type, concerns, grade, service type, teacher
areas, standards and assessments done; paragraphs can be tick boxes
(`optional`, ticks in `setup.screenItems`), repeat per objective, and carry
`{count}` and `{summary:<grid>}` slots), started blank, from a pre-made
sample, or built from the writer's own document. `packFromOt(label, edits)`
turns the OT template with a writer's edits into such a pack that reads
identically (parity test over every setup); `report/adopt.ts` does that once
per browser that has OT edits, after which OT uses the pack builder too. The writer owns the pack, so edits
change it directly, with no overrides layer. `ui/ReportOutput.tsx` is the
preview, prompts and Word download shared by both builders. "Build from my
document" is plain rules, no AI: `report/docx-read.ts` reads a .docx in the
browser (jszip + DOMParser) or pasted text; `report/import-doc.ts` drafts
sections, assessments, grids, blanks, dropdowns and hints, and leaves
identifying lines out; `ui/ImportDocument.tsx` is the review screen. Every
other discipline also offers a pre-made generic pack (`report/premade/`),
written fresh rather than copied from OT, as the owner decided; `packFromOt`
stays for a parity test. Library, Import, Builder and Output still exist and
are due to retire.

## Definition of done

`npm test`, `npm run typecheck` and `npm run build` all pass at the root, and
the changed tool works in `npm run preview`. Pushing to `main` publishes it.

## Open work

- Worksheets still load fonts from Google Fonts (disclosed on the privacy page).
  Moving them to `shared/fonts` needs print QA of every template first.
- IEP Writer: let other disciplines build a report template from scratch or
  from a copy of OT's; then retire Library, Import, Builder and Output.
- IEP Writer accounts went live on 2026-11-03 (docs/ACCOUNTS.md). The
  owner's own wording is in their account; the code holds a generic sample.
- Cloudflare Web Analytics is still switched on in the Cloudflare dashboard
  (the server blocks it with `no-transform`); the Cloudflare account owner
  turns it off (docs/INFRA.md).
