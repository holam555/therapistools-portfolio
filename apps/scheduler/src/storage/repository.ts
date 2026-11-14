// The seam for a future shared backend: swap the implementation, keep the UI.

import type { Workspace } from '../domain/types';

export interface WorkspaceRepository {
  load(): Promise<Workspace | null>;
  save(ws: Workspace): Promise<void>;
}
