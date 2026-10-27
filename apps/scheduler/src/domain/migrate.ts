// Schema migrations. Old backups and stored workspaces are upgraded on load,
// so nothing the user saved ever stops working.

import type { Workspace } from './types';
import { DEFAULT_AVOID_CATEGORIES, DEFAULT_GROUPING } from './types';

/** Best-effort numeric level from a grade name: "Grade K" → 0, "Grade 04" → 4. */
export function gradeLevelFromName(name: string): number | undefined {
  if (/\bk\b/i.test(name)) return 0;
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}

/** Older workspaces stored prefer-together as pairs; they become 2-member groups. */
function normalizeGrouping(g: unknown): Workspace['grouping'] {
  const raw = (g ?? {}) as Partial<Workspace['grouping']> & { preferPairs?: Array<[string, string]> };
  return {
    policy: raw.policy ?? 'any',
    preferGroups: raw.preferGroups ?? raw.preferPairs ?? [],
    cannotPairs: raw.cannotPairs ?? [],
    groupLens: raw.groupLens ?? {},
    soloStudents: raw.soloStudents ?? [],
  };
}

/**
 * Upgrade any supported schema version to the current one. Returns the input
 * untouched when already current. Throws on unknown versions.
 */
export function migrateWorkspace(data: unknown): Workspace {
  const ws = data as { schemaVersion?: number; grouping?: unknown };
  if (ws.schemaVersion === 4) return data as Workspace;
  if (ws.schemaVersion === 3 || ws.schemaVersion === 2) {
    // v2 -> v3: the IEP tracker arrives; grouping shapes normalize.
    // v3 -> v4: the dated session log arrives.
    const old = data as Workspace;
    return {
      ...old,
      schemaVersion: 4,
      grouping: normalizeGrouping(ws.grouping),
      iepCases: old.iepCases ?? [],
      sessionLogs: old.sessionLogs ?? [],
    };
  }
  if (ws.schemaVersion !== 1) {
    throw new Error(`Unsupported backup version (${String(ws.schemaVersion)}).`);
  }

  // v1 → v2: service goals gain type:'direct'; settings gain avoidCategories;
  // workspace gains grouping rules; grades gain a numeric level.
  const v1 = data as Omit<Workspace, 'schemaVersion' | 'grouping' | 'iepCases' | 'sessionLogs'> & {
    schemaVersion: 1;
  };
  return {
    ...v1,
    schemaVersion: 4,
    iepCases: [],
    sessionLogs: [],
    settings: {
      ...v1.settings,
      avoidCategories: v1.settings.avoidCategories ?? [...DEFAULT_AVOID_CATEGORIES],
    },
    grouping: { ...DEFAULT_GROUPING, preferGroups: [], cannotPairs: [] },
    grades: v1.grades.map((g) => ({ ...g, level: g.level ?? gradeLevelFromName(g.name) })),
    students: v1.students.map((s) => ({
      ...s,
      serviceGoals: s.serviceGoals.map((goal) => ({ ...goal, type: goal.type ?? ('direct' as const) })),
    })),
  };
}
