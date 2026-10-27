/*
 * The whole-app backup: every school's workspace plus the shared work-day
 * log in one file. The per-school export remains for handing one school's
 * data around; this one is the "my laptop died" file.
 */

import { migrateWorkspace } from '../domain/migrate';
import type { Workspace } from '../domain/types';
import type { SchoolEntry } from './schools';

export interface FullBackup {
  format: 'therapist-scheduler-full';
  formatVersion: 1;
  exportedAt: string; // ISO date
  schools: Array<{ name: string; workspace: Workspace }>;
}

export interface SchoolSnapshot {
  name: string;
  workspace: Workspace;
}

/** Gathers every school - the active one from live state, the rest from storage. */
export function collectAllSchools(
  schools: SchoolEntry[],
  activeSchoolId: string,
  activeWs: Workspace,
  storage: Pick<Storage, 'getItem'> = localStorage,
): SchoolSnapshot[] {
  return schools.flatMap((school) => {
    if (school.id === activeSchoolId) return [{ name: school.name, workspace: activeWs }];
    const raw = storage.getItem(school.storageKey);
    if (!raw) return [];
    try {
      return [{ name: school.name, workspace: migrateWorkspace(JSON.parse(raw)) }];
    } catch {
      // A corrupt school is skipped rather than poisoning the whole file.
      return [];
    }
  });
}

export function buildFullBackup(snapshots: SchoolSnapshot[]): FullBackup {
  return {
    format: 'therapist-scheduler-full',
    formatVersion: 1,
    exportedAt: new Date().toISOString().slice(0, 10),
    schools: snapshots.map((s) => ({ name: s.name, workspace: s.workspace })),
  };
}

export type ParsedBackup =
  | { kind: 'single'; workspace: Workspace }
  | { kind: 'full'; schools: SchoolSnapshot[] };

/**
 * Reads either backup flavour. A single-school file (any schema version) is
 * recognised by its top-level schemaVersion; the full file by its format tag.
 */
export function parseBackup(json: string, importSingle: (json: string) => Workspace): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const tagged = data as Partial<FullBackup>;
  if (tagged.format !== 'therapist-scheduler-full') {
    return { kind: 'single', workspace: importSingle(json) };
  }
  if (tagged.formatVersion !== 1) {
    throw new Error(`Unsupported full-backup version (${String(tagged.formatVersion)}).`);
  }
  if (!Array.isArray(tagged.schools) || tagged.schools.length === 0) {
    throw new Error('Full backup contains no schools.');
  }
  const schools = tagged.schools.map((s, i) => {
    if (typeof s?.name !== 'string' || !s.name.trim()) {
      throw new Error(`School ${i + 1} in the backup has no name.`);
    }
    return { name: s.name, workspace: migrateWorkspace(s.workspace) };
  });
  // Older full backups carried a work log; the field is simply ignored now.
  return { kind: 'full', schools };
}

export function downloadFullBackup(backup: FullBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `therapist-scheduler-full-backup-${backup.exportedAt}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
