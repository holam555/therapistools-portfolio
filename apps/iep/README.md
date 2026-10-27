# IEP Writer (Therapistools)

A private, offline tool for writing IEP sections from your own sentence
templates. Everything runs inside your web browser on this computer. There is
no account, no server, and the app never connects to the internet.

Students are always written as `[STUDENT]`. The app has no fields for a name,
birth date, school, or ID number, on purpose.

## Report builder

The Report tab is the main way to write. Choose evaluation or annual review,
whether there are concerns or the student qualifies, the grade, he or she, and
what you did. You get a Word draft with every fixed sentence and sentence
opener written in and the blanks highlighted, plus one AI prompt per section to
finish it with your own notes in Gemini.

Occupational therapy comes with a built-in template. Every other discipline
builds its own on the Report tab: **build from your own document** (a Word
file or pasted text of your district's form or a finished report; headings
become sections, rating tables become checklists, highlighted or bracketed
text becomes blanks, red or italic instructions become hints, and names,
dates of birth and other identifying lines are left out, then you check the
result before using it) or **start blank**. Turn on **Edit template** to add
assessments (with or without a rating table), sections and paragraphs, change
any wording, and set when a section appears (evaluation or annual review, with
or without concerns, which grades). The template is saved in this browser and
in Settings → Backup. Nothing is sent anywhere; there is no AI in this step.

## Disciplines

On first use you pick a discipline: occupational therapy, speech-language
pathology, physical therapy, school psychology, special education teaching, or
another K-12 role. Each keeps its own sentence bank, recipes and draft, and
you can switch any time from the header or Settings. Occupational therapy
starts with a starter library; the others start empty, and Import can turn an
old report into sentences.

## Open the app (everyday use)

1. Open the `easyiep` folder, then the `dist` folder inside it.
2. Double-click `easyiep.html`. It opens in your browser (use Chrome).

That's it. Your library is saved inside Chrome on this computer automatically.

> **Back up regularly.** Settings → Backup → **Export JSON** saves your whole
> library to a file. If Chrome's site data is ever cleared, the library in the
> browser is gone, and the backup file is how you get it back (Settings →
> Backup → **Import JSON**).

## What each tab does

- **Library** — your sentences, organised by domain → task. Edit, duplicate,
  reorder, search and filter. Highlighted words: blue is filled in for you
  (student, he/she), yellow is a blank you fill in later, pink is a blank with
  no preset choices yet.
- **Import** — paste a chunk of an old report or template; it is split into
  sentences you tag with a domain, task and section. `XX` becomes the student
  token and he/she can be swapped for pronoun tokens in one click.
- **Builder** — pick pronouns, grade band, domains and tasks; tick sentences;
  fill the blanks from your preset lists or type your own. The preview updates
  live and the draft is saved as you go. Save a selection as a **recipe** to
  reuse it.
- **Output** — copy each section, copy everything, download a Word file, or
  build a prompt for an AI chatbot that fills the remaining blanks from your
  notes without changing your wording. A **privacy check** warns about anything
  that looks like a name, date, phone number, email, or a word on your
  never-allow list. It warns only; nothing is blocked.
- **Settings** — IEP sections, grade bands, blanks and their presets, the AI
  prompt wording, the never-allow list, and backup (export/import JSON).

Undo any change with the Undo button or Cmd+Z.

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

This refreshes `dist/easyiep.html`. To work on the app with live reload instead:

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

runs the automated tests, including one that fails if any code tries to reach
the network.

## Where things live

- `src/model/` — the data model and all the text logic (templates, splitter,
  storage). No UI code.
- `src/ui/` — the screens.
- `test/` — automated tests and the fictional sample report used to tune the
  import helper.
- `dist/easyiep.html` — the single built file you open every day.
