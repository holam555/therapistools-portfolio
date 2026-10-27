import { useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ConfirmModal } from './ConfirmModal';
import { FloatingLinks } from './FloatingLinks';
import { GuideRail } from './GuideRail';
import { InlineAdd } from './InlineAdd';
import type { Workspace } from '../domain/types';
import {
  buildFullBackup,
  collectAllSchools,
  downloadFullBackup,
  parseBackup,
  type SchoolSnapshot,
} from '../storage/backupAll';
import { exportWorkspace, importWorkspace } from '../storage/exportImport';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { PRIVACY_PATH } from '../../../../shared/brand.js';

export function AppShell() {
  const ws = useWorkspaceStore((s) => s.ws);
  const replaceWorkspace = useWorkspaceStore((s) => s.replaceWorkspace);
  const schools = useWorkspaceStore((s) => s.schools);
  const activeSchoolId = useWorkspaceStore((s) => s.activeSchoolId);
  const switchSchool = useWorkspaceStore((s) => s.switchSchool);
  const addSchool = useWorkspaceStore((s) => s.addSchool);
  const restoreAllSchools = useWorkspaceStore((s) => s.restoreAllSchools);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [addingSchool, setAddingSchool] = useState(false);
  const [pendingImport, setPendingImport] = useState<Workspace | null>(null);
  const [pendingFull, setPendingFull] = useState<SchoolSnapshot[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleImportFile(file: File) {
    try {
      const parsed = parseBackup(await file.text(), importWorkspace);
      if (parsed.kind === 'single') setPendingImport(parsed.workspace);
      else setPendingFull(parsed.schools);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="shell">
      <tt-suite-bar current="scheduler" />
      <header className="topbar">
        <NavLink to="/board" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Scheduler
        </NavLink>
        <select
          value={activeSchoolId}
          onChange={(e) => {
            if (e.target.value === '__add') {
              setAddingSchool(true);
              return;
            }
            void switchSchool(e.target.value);
          }}
          title="Switch school - each school keeps its own students, providers, and schedules"
          style={{ fontWeight: 700, maxWidth: 150 }}
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value="__add">+ Add school…</option>
        </select>
        {addingSchool && (
          <InlineAdd
            placeholder='e.g. "School 1"'
            buttonLabel="school"
            startOpen
            onDone={() => setAddingSchool(false)}
            onAdd={(name) => {
              if (schools.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
                return `"${name}" already exists.`;
              }
              void addSchool(name);
              return undefined;
            }}
          />
        )}
        <nav>
          <NavLink to="/home">Guide</NavLink>
          <NavLink to="/board">Gap Board</NavLink>
          <NavLink to="/plan">Auto-Plan</NavLink>
          <NavLink to="/my-schedule">My Schedule</NavLink>
          <NavLink to="/tracker">Tracker</NavLink>
          <NavLink to="/students">Students</NavLink>
          <NavLink to="/providers">Providers</NavLink>
          <NavLink to="/setup">School Setup</NavLink>
        </nav>
        <div className="topbar-actions">
          <details className="menu" ref={menuRef}>
            <summary className="btn ghost small">Backup</summary>
            <div className="menu-list">
              <button
                onClick={() => {
                  exportWorkspace(ws, schools.find((s) => s.id === activeSchoolId)?.name);
                  menuRef.current?.removeAttribute('open');
                }}
              >
                Export this school
              </button>
              <button
                title="One file with every school plus the work-day log"
                onClick={() => {
                  downloadFullBackup(buildFullBackup(collectAllSchools(schools, activeSchoolId, ws)));
                  menuRef.current?.removeAttribute('open');
                }}
              >
                Export all schools
              </button>
              <button
                onClick={() => {
                  fileRef.current?.click();
                  menuRef.current?.removeAttribute('open');
                }}
              >
                Import backup
              </button>
            </div>
          </details>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>
      <div className="body">
        <GuideRail />
        <main className="main">
          <Outlet />
          <footer className="app-foot">
            <span>Therapistools Scheduler. Your data stays in this browser.</span>
            <span>
              <NavLink to="/terms">Terms</NavLink>
              <a href={`${PRIVACY_PATH}#scheduler`}>Privacy</a>
              <NavLink to="/home">Guide</NavLink>
            </span>
          </footer>
        </main>
      </div>

      <FloatingLinks />

      {pendingFull && (
        <ConfirmModal
          title="Restore ALL schools from this backup?"
          message={`This replaces every school in the app (${pendingFull
            .map((s) => s.name)
            .join(', ')}) with the backup's contents. Anything not in the backup is gone. Export all schools first if unsure.`}
          confirmLabel="Replace everything"
          onConfirm={() => {
            void restoreAllSchools(pendingFull);
          }}
          onClose={() => setPendingFull(null)}
        />
      )}
      {pendingImport && (
        <ConfirmModal
          title="Import this backup?"
          message="It will replace everything currently in the app - providers, students, grades, and booked sessions."
          confirmLabel="Replace and import"
          onConfirm={() => replaceWorkspace(pendingImport)}
          onClose={() => setPendingImport(null)}
        />
      )}
      {importError && (
        <ConfirmModal
          title="Import failed"
          message={importError}
          onClose={() => setImportError(null)}
        />
      )}
    </div>
  );
}
