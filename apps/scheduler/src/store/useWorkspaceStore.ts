import { create } from 'zustand';
import type {
  Grade,
  GroupingRules,
  IepCase,
  Provider,
  Session,
  SessionLog,
  Settings,
  Student,
  WeekParity,
  Workspace,
} from '../domain/types';
import { emptyWorkspace } from '../domain/types';
import { parityForDate } from '../domain/parity';
import type { WorkspaceRepository } from '../storage/repository';
import type { SchoolSnapshot } from '../storage/backupAll';
import { LocalStorageRepository } from '../storage/localStorageRepository';
import {
  LEGACY_WORKSPACE_KEY,
  loadRegistry,
  newSchoolEntry,
  saveRegistry,
  type SchoolEntry,
} from '../storage/schools';

let repository: WorkspaceRepository = new LocalStorageRepository();

export type ParityView = WeekParity | 'both';

interface WorkspaceState {
  ws: Workspace;
  loaded: boolean;
  isFresh: boolean; // true when nothing was in storage (show seed offer)
  parity: ParityView; // 'both' = every-week view (the default)
  currentParity: WeekParity;
  schools: SchoolEntry[];
  activeSchoolId: string;

  init(): Promise<void>;
  setParity(p: ParityView): void;
  replaceWorkspace(ws: Workspace, opts?: { fresh?: boolean }): void;
  switchSchool(id: string): Promise<void>;
  addSchool(name: string): Promise<string | undefined>; // error message on failure
  renameSchool(id: string, name: string): void;
  deleteSchool(id: string): Promise<void>;
  /** Full-backup restore: replaces EVERY school and the registry. */
  restoreAllSchools(items: SchoolSnapshot[]): Promise<void>;

  updateSettings(patch: Partial<Settings>): void;
  updateGrouping(patch: Partial<GroupingRules>): void;
  upsertProvider(p: Provider): void;
  /** Move a provider up (-1) or down (+1) in the display order. */
  moveProvider(id: string, delta: -1 | 1): void;
  deleteProvider(id: string): void;
  upsertGrade(g: Grade): void;
  deleteGrade(id: string): void;
  upsertStudent(s: Student): void;
  deleteStudent(id: string): void;
  addSession(s: Session): void;
  addSessions(list: Session[]): void;
  deleteSessionsForProvider(providerId: string): void;
  updateSession(s: Session): void;
  updateSessions(list: Session[]): void;
  deleteSession(id: string): void;
  deleteSessions(ids: string[]): void;
  upsertIepCase(c: IepCase): void;
  deleteIepCase(id: string): void;
  upsertSessionLog(l: SessionLog): void;
  deleteSessionLog(id: string): void;
  /** Mark exactly one provider as "me" - the Today checklist follows them. */
  setMeProvider(id: string): void;
}

export function newId(): string {
  return crypto.randomUUID();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave(ws: Workspace) {
  clearTimeout(saveTimer);
  const repo = repository; // bind: a school switch must not save into the new school
  saveTimer = setTimeout(() => void repo.save(ws), 300);
}

/** Persist immediately (before switching schools). */
async function flushSave(ws: Workspace) {
  clearTimeout(saveTimer);
  await repository.save(ws);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  // Every mutation funnels through here: update state, then persist (debounced).
  const apply = (fn: (ws: Workspace) => Workspace) => {
    const ws = fn(get().ws);
    set({ ws, isFresh: false });
    scheduleSave(ws);
  };

  return {
    ws: emptyWorkspace(),
    loaded: false,
    isFresh: false,
    parity: 'both',
    currentParity: 'A',
    schools: [],
    activeSchoolId: '',

    async init() {
      const registry = loadRegistry();
      const active = registry.schools.find((s) => s.id === registry.activeId)!;
      repository = new LocalStorageRepository(active.storageKey);
      const stored = await repository.load();
      const ws = stored ?? emptyWorkspace();
      const currentParity = parityForDate(new Date(), ws.settings);
      set({
        ws,
        loaded: true,
        isFresh: !stored,
        parity: 'both',
        currentParity,
        schools: registry.schools,
        activeSchoolId: registry.activeId,
      });
    },

    async switchSchool(id) {
      const { schools, ws, activeSchoolId } = get();
      const target = schools.find((s) => s.id === id);
      if (!target || id === activeSchoolId) return;
      await flushSave(ws);
      repository = new LocalStorageRepository(target.storageKey);
      const stored = await repository.load();
      const next = stored ?? emptyWorkspace();
      saveRegistry({ schools, activeId: id });
      set({
        ws: next,
        isFresh: false,
        parity: 'both',
        currentParity: parityForDate(new Date(), next.settings),
        activeSchoolId: id,
      });
    },

    async restoreAllSchools(items) {
      // Old school keys first, so no orphaned workspaces linger.
      for (const s of get().schools) {
        if (s.storageKey !== LEGACY_WORKSPACE_KEY) localStorage.removeItem(s.storageKey);
      }
      localStorage.removeItem(LEGACY_WORKSPACE_KEY);
      const entries = items.map((item) => newSchoolEntry(item.name));
      entries.forEach((e, i) => localStorage.setItem(e.storageKey, JSON.stringify(items[i].workspace)));
      const registry = { schools: entries, activeId: entries[0].id };
      saveRegistry(registry);
      repository = new LocalStorageRepository(entries[0].storageKey);
      const ws = items[0].workspace;
      set({
        ws,
        isFresh: false,
        parity: 'both',
        currentParity: parityForDate(new Date(), ws.settings),
        schools: entries,
        activeSchoolId: entries[0].id,
      });
    },

    async addSchool(name) {
      const { schools } = get();
      if (schools.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        return `"${name}" already exists.`;
      }
      const entry = newSchoolEntry(name);
      const nextSchools = [...schools, entry];
      set({ schools: nextSchools });
      saveRegistry({ schools: nextSchools, activeId: get().activeSchoolId });
      await get().switchSchool(entry.id);
      return undefined;
    },

    renameSchool(id, name) {
      const schools = get().schools.map((s) => (s.id === id ? { ...s, name } : s));
      set({ schools });
      saveRegistry({ schools, activeId: get().activeSchoolId });
    },

    async deleteSchool(id) {
      const { schools, activeSchoolId } = get();
      if (schools.length <= 1) return;
      const target = schools.find((s) => s.id === id);
      if (!target) return;
      const remaining = schools.filter((s) => s.id !== id);
      if (id === activeSchoolId) {
        await get().switchSchool(remaining[0].id);
      }
      localStorage.removeItem(target.storageKey);
      set({ schools: remaining });
      saveRegistry({ schools: remaining, activeId: get().activeSchoolId });
    },

    setParity(p) {
      set({ parity: p });
    },

    replaceWorkspace(ws, opts) {
      const currentParity = parityForDate(new Date(), ws.settings);
      set({ ws, isFresh: opts?.fresh ?? false, parity: 'both', currentParity });
      scheduleSave(ws);
    },

    updateSettings(patch) {
      apply((ws) => {
        const settings = { ...ws.settings, ...patch };
        return { ...ws, settings };
      });
      const { ws } = get();
      const currentParity = parityForDate(new Date(), ws.settings);
      set({ currentParity });
    },

    updateGrouping(patch) {
      apply((ws) => ({ ...ws, grouping: { ...ws.grouping, ...patch } }));
    },

    upsertProvider(p) {
      apply((ws) => ({
        ...ws,
        providers: ws.providers.some((x) => x.id === p.id)
          ? ws.providers.map((x) => (x.id === p.id ? p : x))
          : [...ws.providers, p],
      }));
    },
    moveProvider(id, delta) {
      apply((ws) => {
        const i = ws.providers.findIndex((p) => p.id === id);
        const j = i + delta;
        if (i === -1 || j < 0 || j >= ws.providers.length) return ws;
        const providers = [...ws.providers];
        [providers[i], providers[j]] = [providers[j], providers[i]];
        return { ...ws, providers };
      });
    },
    deleteProvider(id) {
      apply((ws) => ({
        ...ws,
        providers: ws.providers.filter((p) => p.id !== id),
        sessions: ws.sessions.filter((s) => s.providerId !== id),
        students: ws.students.map((st) => ({
          ...st,
          serviceGoals: st.serviceGoals.filter((g) => g.providerId !== id),
        })),
      }));
    },

    upsertGrade(g) {
      apply((ws) => ({
        ...ws,
        grades: ws.grades.some((x) => x.id === g.id)
          ? ws.grades.map((x) => (x.id === g.id ? g : x))
          : [...ws.grades, g],
      }));
    },
    deleteGrade(id) {
      apply((ws) => ({ ...ws, grades: ws.grades.filter((g) => g.id !== id) }));
    },

    upsertStudent(s) {
      apply((ws) => ({
        ...ws,
        students: ws.students.some((x) => x.id === s.id)
          ? ws.students.map((x) => (x.id === s.id ? s : x))
          : [...ws.students, s],
      }));
    },
    deleteStudent(id) {
      apply((ws) => ({
        ...ws,
        students: ws.students.filter((s) => s.id !== id),
        sessions: ws.sessions
          .map((s) => ({ ...s, studentIds: s.studentIds.filter((x) => x !== id) }))
          .filter((s) => s.studentIds.length > 0),
        iepCases: ws.iepCases.filter((c) => c.studentId !== id),
        sessionLogs: ws.sessionLogs.filter((l) => l.studentId !== id),
      }));
    },

    addSession(s) {
      apply((ws) => ({ ...ws, sessions: [...ws.sessions, s] }));
    },
    addSessions(list) {
      apply((ws) => ({ ...ws, sessions: [...ws.sessions, ...list] }));
    },
    deleteSessionsForProvider(providerId) {
      apply((ws) => ({ ...ws, sessions: ws.sessions.filter((s) => s.providerId !== providerId) }));
    },
    updateSession(s) {
      apply((ws) => ({ ...ws, sessions: ws.sessions.map((x) => (x.id === s.id ? s : x)) }));
    },
    updateSessions(list) {
      apply((ws) => ({
        ...ws,
        sessions: ws.sessions.map((x) => list.find((u) => u.id === x.id) ?? x),
      }));
    },
    deleteSession(id) {
      apply((ws) => ({ ...ws, sessions: ws.sessions.filter((s) => s.id !== id) }));
    },
    deleteSessions(ids) {
      apply((ws) => ({ ...ws, sessions: ws.sessions.filter((s) => !ids.includes(s.id)) }));
    },
    upsertIepCase(c) {
      apply((ws) => ({
        ...ws,
        iepCases: ws.iepCases.some((x) => x.id === c.id)
          ? ws.iepCases.map((x) => (x.id === c.id ? c : x))
          : [...ws.iepCases, c],
      }));
    },
    deleteIepCase(id) {
      apply((ws) => ({ ...ws, iepCases: ws.iepCases.filter((c) => c.id !== id) }));
    },
    upsertSessionLog(l) {
      apply((ws) => ({
        ...ws,
        sessionLogs: ws.sessionLogs.some((x) => x.id === l.id)
          ? ws.sessionLogs.map((x) => (x.id === l.id ? l : x))
          : [...ws.sessionLogs, l],
      }));
    },
    deleteSessionLog(id) {
      apply((ws) => ({
        ...ws,
        // A delivery pointing at this miss keeps its minutes but loses the link.
        sessionLogs: ws.sessionLogs
          .filter((l) => l.id !== id)
          .map((l) => (l.makeupForId === id ? { ...l, makeupForId: undefined } : l)),
      }));
    },
    setMeProvider(id) {
      apply((ws) => ({
        ...ws,
        providers: ws.providers.map((p) => ({ ...p, isMe: p.id === id ? true : undefined })),
      }));
    },
  };
});
