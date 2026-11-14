# GapBoard — School Therapy Scheduler

A local-first scheduling app for school special-education teams (OT, Speech, PT…).
Replaces the multi-spreadsheet Excel workflow: every student's master-schedule
blocks and booked sessions live on one shared calendar, so the open **gaps** are
visible at a glance and booking a session blocks the time on the provider's
calendar **and** every selected student's calendar at once (two-sided blocking —
no double-booking, ever).

Privacy by design: students are referenced by ID number only. No names enter the
app; keep your ID-to-name key offline.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. On first launch, choose sample data (to explore)
or a blank school.

Data is stored in your browser's localStorage. One account can hold several
schools — switch or add them in the top bar; each school keeps fully separate
students, providers, and schedules under its own storage key. Use **Export
backup** in the top bar for a per-school JSON backup file, and **Import** to
restore it.

## Tests

```bash
npx vitest run
```

The scheduling core (interval algebra, week A/B parity, gap computation,
booking-conflict validation) is pure TypeScript in [src/domain](src/domain) with
full unit coverage.

## How it fits together

- **School Setup** — school-day window, Week-A anchor date, and per-grade master
  schedule templates (mark either blocked time or available time; students
  inherit their grade's template automatically).
- **Providers** — each team member's on-site availability, including
  every-week / week-A-only / week-B-only blocks for alternating schedules.
  "Import schedule" bulk-books a provider's whole week from Excel — paste
  the cells (shape auto-detected: Mon–Fri grid or same-every-day list) or
  upload the .xlsx itself, which additionally understands merged cells as
  session durations and flags colored cells that name no student. Student
  numbers as digits or Chinese numerals (十二號); names never import.
- **Students** — ID, grade, service-minute goals per provider, and per-student
  schedule adjustments (open up blocked time or add personal blocks).
- **Gap Board** (home) — multiple student calendars side by side; click any green
  gap to book a session (10/15/20/25/30 min, weekly or biweekly) with one or
  more students. Conflicts are listed live and block saving.
- **My Schedule** — a provider's own printable week.

Architecture notes: all schedule data is pattern-based (day-of-week + minutes on
a 5-minute grid); real dates only resolve week A/B parity. Persistence goes
through the `WorkspaceRepository` seam ([src/storage/repository.ts](src/storage/repository.ts)),
so a shared backend can replace localStorage later without touching the UI.
Phase 2 (AI schedule generation from service-minute goals) builds on the same
data model — goals, groups, and parity are already first-class.
