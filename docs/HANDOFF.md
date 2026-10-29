# Handoff: start here

You are picking up Therapistools from an earlier Claude session in a
different account. That session's memory does not carry over, so everything
you need that isn't in the code is in this file. Read it, then
[CLAUDE.md](../CLAUDE.md) (rules) and [README.md](../README.md) (commands).
State as of 2026-10-26.

## What this is

Therapistools is a free website for K-12 educators and school therapists:
special education teachers, school psychologists, and OT, speech and PT
therapists. It is one static site with three tools, in this order everywhere
(plan, write, print):

1. **Scheduler** (`apps/scheduler`, served at `/scheduler/`): finds students'
   open time and books sessions. Students are ID numbers only.
2. **IEP Writer** (`apps/iep`, `/iep/`): builds IEP report drafts. Works fully
   offline and makes no network requests.
3. **Worksheets** (`apps/worksheets`, `/worksheets/`): printable OT worksheets
   for children.

Plus a home page and one site-wide privacy page (`apps/home`), and shared
brand files (`shared/`). No accounts, no backend; data lives in the user's
browser.

The owner is a school-based occupational therapist who uses the IEP Writer for
real work, one or two reports a day. They also want the site as a portfolio
piece for a learning engineering job at an AI company, on a real domain.

**Hosting (since 2026-10-26):** live at https://www.therapistools.com (www is
canonical), self-hosted on a homelab server behind a Cloudflare Tunnel, not
Vercel. A push to `main` deploys it (GitHub's cloud runners, through the
tunnel). The box: [INFRA.md](INFRA.md). How deploys work, runbooks and
lessons: [DEPLOYMENT.md](DEPLOYMENT.md). It was never deployed
to Vercel, so there are no old addresses to redirect.

## Working with the owner

- They are not a developer. Explain in plain words, give exact steps to test,
  and keep messages short.
- They write in English or Cantonese; reply in the language they used.
- Never put personal details anywhere: no names, usernames, emails or home
  folder paths in code, docs, fixtures, test data or commit messages. Don't
  address the owner by a name you infer from paths or accounts.
- Commit with the identity already set in this repository's git config (name
  "Therapistools"). Never use the machine's global git identity; a fresh
  clone has no local identity, so set it first. The repository is on GitHub
  and a push to `main` publishes the live site, so push only finished work.
- Ask before large redesigns; small fixes and agreed next steps can go ahead.
- Verify in the browser after UI changes (`npm run preview`, port 4300) and
  say plainly what you could not check.

## Decisions already made (don't re-ask)

- **Name and look:** "Therapistools", one word. The worksheet site's style is
  the design reference: warm paper, teal and orange, Fredoka headings, DM Sans
  body, pill buttons. All in `shared/brand.css`.
- **Privacy:** no tool stores a child's or student's name. The IEP Writer
  stays fully offline (no AI API calls). No page has analytics (decided
  2026-10-26 with the move off Vercel). The single
  privacy policy is `apps/home/privacy/index.html`; update it with any change.
- **AI use in the IEP Writer:** the tool never calls an AI. It builds one
  prompt per report section; the owner pastes it into Gemini and adds their
  notes there. The AI may fill blanks and match tone, never invent scores or
  add names.
- **IEP report builder** (the Report tab, `apps/iep/src/report/`):
  - Two report types. Evaluation: chosen assessments plus a summary.
    Annual review: "Reported by", a placeholder to paste last year's record
    review, the assessments as present levels, then a no-concerns ending.
    Both add next steps, impact, service delivery and the motor goal when
    concerns are found or the student qualifies (owner's request, 2026-10-28).
  - The teacher rating checklist is ticked per area (fine motor, gross
    motor, sensory) and writes one paragraph per area; none ticked gives
    the no-concerns paragraph. Services are direct or indirect; the indirect
    statement follows the owner's district wording, with a fictional sample.
  - Only the informal fine motor screen depends on grade: K–1, 2–5, 6–8.
    9–12 has no template yet and borrows 6–8.
  - Word draft: fixed wording and sentence openers written in, he or she
    filled in, [STUDENT] once at the start of each section, blanks highlighted
    yellow. The owner's full examples go only into AI prompts.
  - Blanks are clickable: dropdowns, sample sentences from the owner's own
    examples, or free text. SPM-2 text is generated from ratings.
  - The owner can edit the template inside the tool (Edit template mode),
    including every assessment's items, levels and sentences (rating grids)
    and section titles. The owner asked for this because a template read
    from a document by AI may be wrong, so everything must be correctable.
  - The built-in OT template is in the code, so every visitor gets it; edits
    and own templates stay in that person's browser and backup file only.
    The owner knows and is fine with this.
- **Disciplines:** the IEP Writer asks for one, and the picker says only OT
  has a pre-made template. OT uses the built-in template. Every other
  discipline builds its own template pack on the Report tab: from their own
  document, or blank. The owner decided other disciplines must **not** copy
  the OT template (a greyed "pre-made template, coming next" stands in).
  The older Library, Import, Builder and Output tabs still exist and are due
  to retire.
- **The template's fixed wording** follows the owner's own reports in
  `IEP template.docx` at the repository root. That file is git-ignored on
  purpose; never commit it. The repository is public, so every sample
  sentence, starter-library sentence and test fixture in the code is
  fictional, written on 2026-10-26 to replace the owner's real examples.
  Keep it that way: never put the owner's report text into the code.

## Next steps, in the owner's likely order

1. **Report templates for other disciplines** (plan agreed with the owner on
   2026-10-26). A new user chooses one of three starts: blank, a pre-made
   template (OT), or their own document. Steps, each shipped on its own:
   - Done: the pack model (`apps/iep/src/report/pack.ts`), saved per
     discipline, in the backup file, with "start blank" and "copy OT", and an
     editor for assessments, sections, paragraphs, grids and conditions.
   - Done: "build from my document" (`report/import-doc.ts`, plain rules, no
     AI, no network): Word upload or pasted text; headings → sections; score
     tables → a labelled line per row with a blank per column; rating tables
     (Functional / Inconsistent / Concern) → grids; red, italic or
     parenthesised instructions → hints; highlighted "a / b" → dropdowns;
     "(Blank)" → [STUDENT]; his/her → pronouns; identifying lines left out;
     a review screen to set each section's role. A finished report (tick
     box) keeps sentences as samples and blanks their scores, ages and dates;
     the student's name can be typed to be swapped out, used once, never
     saved. PDFs are not read: save as Word or paste text.
   - Not yet tried on the owner's real district form (a 47-page PDF outside
     the repository): ask them to save it as Word and run it through, then
     tune the rules on what comes out wrong.
   - Pre-made templates for other disciplines: not started (`packFromOt` is
     the model for one).
   - Then retire the old Library, Import, Builder and Output tabs.
2. **9–12 fine motor screen,** when the owner sends one.
3. **Open questions to raise with the owner:** whether the dropdown choices
   (minutes, disability categories, grasp types) fit their district. The
   owner has checked the Word draft and is happy with it. The self-care
   checklist was removed from the OT template on 2026-10-27 at the owner's
   request; don't add it back.
4. **Worksheets fonts:** the worksheet pages still load Google Fonts
   (disclosed on the privacy page). Moving them to `shared/fonts` needs a print
   check of every worksheet template first.
5. **Cloudflare Web Analytics** is still on in the Cloudflare dashboard;
   the server already blocks it (docs/INFRA.md). The Cloudflare account
   owner switches it off.

## How to check your work

From the repository root:

```bash
npm run install:all
npm test
npm run typecheck
npm run build
npm run preview
```

All tests, typechecks and the build pass as of the date above. The build
fails if a local file path leaks into the output.

## Things that tripped up the last session

- **npm cache permissions:** `npm install` hit a permission error in the
  machine's global npm cache. Pointing `npm_config_cache` at a scratch folder
  fixed it.
- **No LibreOffice:** the `soffice` command on this machine points to an app
  that isn't installed, so Word files can't be rendered to images. macOS
  `textutil -convert html file.docx` reads them well enough to check text and
  bold.
- **Preview server stops:** the browser preview server sometimes stops when
  the app restarts; start it again before testing. Scripted clicks that
  scroll the page can close the blank picker; use real clicks.
- **Original projects:** the worksheet and scheduler apps were copied in from
  their own projects, which live outside this folder. Don't modify those
  originals. An older standalone copy of the IEP Writer ("easyiep") also exists
  elsewhere; all IEP work happens in `apps/iep` now.
