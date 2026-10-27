# OTsheet.ai

A client-side worksheet generator for pediatric occupational therapy. Parents and OTs pick a template, tweak it, and print a therapy-grade worksheet — no signup, no backend, no server round-trip.

**Live demo:** [otsheetai.vercel.app](https://otsheetai.vercel.app/)

## What it does

OTsheet.ai generates print-ready A4 worksheets across three OT domains:

- **Visual perception** — figure-ground search, pattern matching, odd-one-out, mirror image, visual closure, mazes, connect-the-dots, visual scanning, pixel art, and more
- **Fine motor** — tracing paths, scissor-cutting lines, dot-to-dot
- **Handwriting** — triline and grid-box letter/word practice with configurable stroke guides

The app ships two experiences on top of the same engine: a **Gallery** of 20+ curated templates (filterable by age band, therapy goal, language, and worksheet type) for anyone who wants a worksheet fast, and a full **Editor** for OTs who want to hand-tune every parameter — grid size, difficulty, shapes, emoji themes, fonts, answer keys, and more.

Everything renders to SVG in the browser and prints via `window.print()`, so there's no PDF service, no file upload, and no user data ever leaves the device.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 (SWC) |
| Routing | React Router 6 |
| UI | shadcn/ui (Radix primitives) + Tailwind CSS 3 |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Testing Library, jsdom |
| Rendering | Hand-rolled SVG generation (no canvas/PDF library) |

## Project structure

```
src/
├── pages/
│   ├── Gallery.tsx          # Browse/filter templates by age, goal, language, mode
│   └── Editor.tsx           # Full manual control over one worksheet
├── components/
│   ├── gallery/              # TemplateCard, AboutStrip, filters
│   ├── editor/                # EditorToolbar, CustomizeControls
│   ├── WorksheetPreview.tsx  # SVG renderer for all 17 modes
│   └── ui/                    # shadcn/ui primitives
├── lib/
│   ├── shapes.ts             # Generation engine: types + 17 mode generators
│   ├── seededGenerate.ts     # Deterministic wrapper (mulberry32 PRNG swap)
│   ├── defaultConfig.ts      # Shared default config + age-band presets
│   └── letterPaths.ts        # Stroke path data for handwriting mode
├── data/
│   └── templates.ts          # Gallery taxonomy: goal / age / language / clinical name
└── test/
    └── audit.test.tsx        # Control-reflection audit (33 assertions)
```

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # run the Vitest suite
npm run build    # type-check + production build
npm run lint
```

## Design notes

- Worksheets render at 595×842px (A4 portrait) with fixed margins; print styling hides everything but the SVG.
- Difficulty scales visual complexity (shape size, rotation, distractor count), not just puzzle count.
- Everything is client-side by design — no accounts, no server, no data persistence beyond the current session.
