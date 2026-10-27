// Multi-school registry. One person can run several school workspaces side
// by side; each school's data lives under its own localStorage key, and this
// registry records which schools exist and which is active. A pre-registry
// install (single workspace under the legacy key) is adopted as the first
// school without moving its data.

export interface SchoolEntry {
  id: string;
  name: string;
  storageKey: string;
}

const REGISTRY_KEY = 'gapboard-schools';
const ACTIVE_KEY = 'gapboard-active-school';
export const LEGACY_WORKSPACE_KEY = 'ot-scheduler-workspace-v1';

export interface SchoolRegistry {
  schools: SchoolEntry[];
  activeId: string;
}

interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadRegistry(storage: KV = localStorage): SchoolRegistry {
  const raw = storage.getItem(REGISTRY_KEY);
  if (raw) {
    try {
      const schools = JSON.parse(raw) as SchoolEntry[];
      if (Array.isArray(schools) && schools.length > 0) {
        const activeRaw = storage.getItem(ACTIVE_KEY);
        const activeId = schools.some((s) => s.id === activeRaw) ? activeRaw! : schools[0].id;
        return { schools, activeId };
      }
    } catch {
      // fall through to adoption
    }
  }
  // First run with the registry: adopt whatever single workspace exists.
  const hasLegacy = storage.getItem(LEGACY_WORKSPACE_KEY) !== null;
  const first: SchoolEntry = {
    id: crypto.randomUUID(),
    name: hasLegacy ? 'School 2' : 'My school',
    storageKey: LEGACY_WORKSPACE_KEY,
  };
  const registry = { schools: [first], activeId: first.id };
  saveRegistry(registry, storage);
  return registry;
}

export function saveRegistry(registry: SchoolRegistry, storage: KV = localStorage): void {
  storage.setItem(REGISTRY_KEY, JSON.stringify(registry.schools));
  storage.setItem(ACTIVE_KEY, registry.activeId);
}

export function newSchoolEntry(name: string): SchoolEntry {
  const id = crypto.randomUUID();
  return { id, name, storageKey: `gapboard-school-${id}` };
}
