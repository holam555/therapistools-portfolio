# Backend handoff

For whoever builds the shared backend: the app was architected local-first
with a deliberate seam so the server can replace browser storage without
touching the UI or the scheduling logic. This file maps that seam.

## What exists today (as of 2026-08-16)

- React + Vite + TypeScript SPA; all state in one zustand store
  ([src/store/useWorkspaceStore.ts](src/store/useWorkspaceStore.ts)).
- All persistence goes through **one interface**:
  [src/storage/repository.ts](src/storage/repository.ts) —
  `load(): Promise<Workspace | null>` / `save(ws: Workspace): Promise<void>`.
  The only implementation is
  [localStorageRepository.ts](src/storage/localStorageRepository.ts).
  **Implement this interface over HTTP and the app is online.**
- Multi-school: a registry of named schools, each with its own workspace
  ([src/storage/schools.ts](src/storage/schools.ts)). The backend equivalent
  is a school list per account plus one workspace document per school.
- The workspace is a single JSON document — schema in
  [src/domain/types.ts](src/domain/types.ts) (`Workspace`, `schemaVersion: 2`).
  Version migrations live in [src/domain/migrate.ts](src/domain/migrate.ts)
  and run on load; the server should store documents as-is and let the client
  migrate, or reuse the same logic server-side.
- Export/import files (the user's backups, in `data/` locally and via the
  in-app Export button) are byte-compatible with the stored document — good
  seed data for development. `data/full-account-snapshot-2026-08-16.json`
  shows the registry + both schools shape.

## Semantics the server must keep

- **Whole-document saves.** The client saves the entire workspace, debounced
  ~300 ms after each change. No per-entity endpoints are required for parity;
  they can come later.
- **Per-school isolation.** Switching schools flushes pending saves first;
  documents must never bleed into each other.
- **Privacy invariant (non-negotiable).** Students are numeric display IDs
  only. No field for student names exists and none should be added; the
  server should never log or require personal student data. This is the
  product's FERPA posture.
- **Conflict policy** (from the PRD): concurrent edits are resolved by
  "first booking wins" — provider priority is handled socially, not in
  software. Last-write-wins per document is acceptable for v1; the PRD
  explicitly excludes per-user auth, roles, and edit attribution.
- Client-only state that should NOT move to the server: Auto-Plan rules
  (`localStorage: gapboard-plan-rules`) are the therapist's personal
  preferences and travel with the person, not the school.

## What not to rebuild

The domain layer ([src/domain/](src/domain/)) — gap computation, conflict
validation, week A/B parity, the Auto-Plan engine — is pure TypeScript with
the bulk of the test suite (`npx vitest run`). It runs entirely client-side
and needs nothing from the server. Don't fork this logic into another
language; if server-side validation is ever wanted, reuse these modules in a
Node service.

## Suggested v1 API surface

```
GET    /schools                     -> [{ id, name }]
POST   /schools { name }            -> { id }
PATCH  /schools/:id { name }
DELETE /schools/:id
GET    /schools/:id/workspace       -> Workspace JSON (or 404)
PUT    /schools/:id/workspace       <- Workspace JSON
```

One shared credential per school team is consistent with the PRD's
"one account per school, no per-user auth" principle; the account here is
the therapist's, holding multiple schools.
