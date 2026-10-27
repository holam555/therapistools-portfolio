import { migrateWorkspace } from '../domain/migrate';
import type { Workspace } from '../domain/types';

export function exportWorkspace(ws: Workspace, schoolName?: string): void {
  const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  const slug = schoolName ? `${schoolName.replace(/[^\w-]+/g, '-')}-` : '';
  a.href = url;
  a.download = `therapist-scheduler-${slug}backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse + validate an imported backup. Throws descriptive errors. */
export function importWorkspace(json: string): Workspace {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const ws = data as Partial<Workspace>;
  const version = (data as { schemaVersion?: number }).schemaVersion;
  if (typeof version !== 'number' || version < 1 || version > 4) {
    throw new Error(`Unsupported backup version (${String(version)}). Expected version 1 to 4.`);
  }
  for (const key of ['settings', 'providers', 'grades', 'students', 'sessions'] as const) {
    if (ws[key] === undefined) throw new Error(`Backup is missing "${key}".`);
  }
  for (const key of ['providers', 'grades', 'students', 'sessions'] as const) {
    if (!Array.isArray(ws[key])) throw new Error(`Backup field "${key}" should be a list.`);
  }
  const s = ws.settings!;
  if (typeof s.schoolDayStart !== 'number' || typeof s.schoolDayEnd !== 'number' || !s.weekAAnchorMonday) {
    throw new Error('Backup settings are incomplete.');
  }
  return migrateWorkspace(ws);
}
