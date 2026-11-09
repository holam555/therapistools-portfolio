# IEP Writer (Therapistools)

A private tool for drafting IEP reports from a template you own.
Everything runs inside your web browser on this computer. Signing in is
optional: an account stores your report template and nothing else, so it
follows you to another computer (docs/ACCOUNTS.md at the repository root).
Without signing in the app never connects to the internet, and the
downloadable offline file cannot connect at all.

Students are always written as `[STUDENT]`. The app has no fields for a name,
birth date, school, or ID number, on purpose.

## Report builder

The Report tab is the main way to write. Choose evaluation or annual review,
whether there are concerns or the student qualifies, the grade, he or she, and
what you did. You get a Word draft with every fixed sentence and sentence
opener written in and the blanks highlighted, plus one AI prompt per section to
finish it with your own notes in Gemini.

Every discipline comes with a pre-made generic template, offered on the
Report tab the first time you open it. You can
also **build from your own document** (a Word
file or pasted text of your district's form or a finished report; headings
become sections, rating tables become checklists, highlighted or bracketed
text becomes blanks, red or italic instructions become hints, and names,
dates of birth and other identifying lines are left out, then you check the
result before using it) or **start blank**. Turn on **Edit template** to add
assessments (with or without a rating table), sections and paragraphs, change
any wording, and set when a section or paragraph appears (evaluation or annual
review, with or without concerns, which grades, direct or indirect services,
which teacher checklist areas are ticked, which assessments were done). In edit
mode every paragraph of the template is shown; the ones this report leaves out
are greyed with the reason, so they can still be edited. The template is saved
in this browser and in Settings → Backup. Nothing is sent anywhere; there is
no AI in this step.

Clicking a yellow blank opens a picker. For a blank with a dropdown it lists
the choices. Otherwise it reads the paragraph's own wording as a pattern over
the sample sentences and offers what they put in that very spot ("82",
"left-handed", "too hard"), then sentences that share words with the blank,
with every sentence one click away.

The AI prompts are written by the app from each section's own wording and
blanks; no AI is called. A template built from your own document gets a
prompt for every section that has blanks: the document's own instructions
("Describe the setting") become the notes hint, and otherwise the blanks'
labels do.

## Disciplines

On first use you pick a discipline: occupational therapy, speech-language
pathology, physical therapy, school psychology, special education teaching, or
another K-12 role. Each keeps its own template, filled blanks and setup, and
you can switch any time from the header or Settings.

## Open the app (everyday use)

1. Open the `easyiep` folder, then the `dist` folder inside it.
2. Double-click `easyiep.html`. It opens in your browser (use Chrome).

That's it. Your template is saved inside Chrome on this computer
automatically, and in your account if you sign in.

> **Back up regularly.** Settings → Backup → **Export backup file** saves
> your template to a file. If Chrome's site data is ever cleared, the
> template in the browser is gone, and the backup file (or your account) is
> how you get it back (Settings → Backup → **Restore from a file**).

## What each tab does

- **Report** — set up the report, tick what you did, rate checklists, fill
  the blanks, download the Word draft, copy one AI prompt per section, and
  edit the template. "Change template…" goes back to the start choices
  (it deletes the current template, here and in the account, after a
  warning and an offer to export a backup). A short guided tour runs the
  first time a template is on screen; "Show me around" in the header
  replays it (`src/ui/Tour.tsx`, anchored on `data-tour` attributes).
- **Settings** — privacy, the optional account, the discipline, backup and
  restore of the template, the never-allow list for the privacy check, and
  start over. The **privacy check** warns when text typed into a blank or the
  template looks like a name, date, phone number, email, or a word on your
  never-allow list. It warns only; nothing is blocked, except that a template
  with a date, phone number or email is held back from the account.

The older Library, Import, Builder and Output tabs (a sentence bank assembled
into sections) retired on 2026-11-09. A sentence library saved by an earlier
version stays in the browser and in backup files; nothing shows it any more.

## Rebuild the app after a code change (developer step)

You only need this when the app's code has changed. It needs Node.js, which is
already installed on this computer.

Open the Terminal app, go to the `easyiep` folder, and run:

```bash
npm install
```

(once, or whenever `package.json` changes), then:

```bash
npm run build
```

This refreshes `dist/easyiep.html` (the website page) and
`dist/easyiep-offline.html` (the downloadable file with no sign-in). To work on the app with live reload instead:

```bash
npm start
```

which opens the app at a local address in your browser. Stop it with Ctrl+C.

Or double-click `start.command` in the `easyiep` folder: it runs the two steps
above for you and opens the app.

## Checks

```bash
npm test
```

runs the automated tests, including one that fails if any code outside the
account module (`src/account/`) tries to reach the network, or if the offline
build bundles any network code.

## Where things live

- `src/model/` — shared text logic (pronoun tokens, splitter, privacy check,
  storage, disciplines) and the retired sentence library's types. No UI code.
- `src/report/` — the report builder: template packs, the sample templates,
  rating grids, rendering, the Word draft, section prompts and the blank
  picker's suggestions.
- `src/account/` — the only network code: sign-in and keeping the report
  template in the writer's account. `supabase/migrations/` is the database
  table and its row-level security.
- `src/ui/` — the screens.
- `test/` — automated tests and the fictional sample report used to tune the
  import helper.
- `dist/easyiep.html` — the single built file you open every day.
