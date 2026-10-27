import { migrateWorkspace } from '../domain/migrate';
import type { Workspace } from '../domain/types';
import type { WorkspaceRepository } from './repository';
import { LEGACY_WORKSPACE_KEY } from './schools';

/** One repository per school - each school's workspace has its own key. */
export class LocalStorageRepository implements WorkspaceRepository {
  private readonly key: string;

  constructor(key: string = LEGACY_WORKSPACE_KEY) {
    this.key = key;
  }

  async load(): Promise<Workspace | null> {
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      return migrateWorkspace(JSON.parse(raw));
    } catch {
      console.error('Corrupt workspace in localStorage; ignoring.');
      return null;
    }
  }

  async save(ws: Workspace): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(ws));
  }
}
