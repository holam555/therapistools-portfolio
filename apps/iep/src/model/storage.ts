import type { Backup, Library, Recipe, Sentence } from "./types";
import { emptyBuilderState, type BuilderState } from "./assemble";
import { newId } from "./ids";
import { libraryFor } from "./defaults";
import { isDisciplineId, type DisciplineId } from "./disciplines";

export const KEYS = {
  library: "easyiep.library",
  recipes: "easyiep.recipes",
  draft: "easyiep.draft",
  discipline: "easyiep.discipline",
} as const;

/**
 * Each discipline keeps its own library, recipes and draft. Occupational
 * therapy uses the original keys, so libraries saved before disciplines
 * existed keep loading as the OT library.
 */
export function keyFor(base: string, discipline: DisciplineId): string {
  return discipline === "ot" ? base : `${base}.${discipline}`;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * The discipline chosen last time. Someone who already has an OT library from
 * before disciplines existed is treated as OT; a brand-new visitor gets null
 * and is asked to choose.
 */
export function loadDiscipline(): DisciplineId | null {
  const s = storage();
  const saved = s?.getItem(KEYS.discipline);
  if (isDisciplineId(saved)) return saved;
  return s?.getItem(KEYS.library) ? "ot" : null;
}

export function saveDiscipline(d: DisciplineId): void {
  storage()?.setItem(KEYS.discipline, d);
}

export function loadLibrary(discipline: DisciplineId = "ot"): { library: Library; fresh: boolean } {
  const s = storage();
  const key = keyFor(KEYS.library, discipline);
  const raw = s?.getItem(key);
  if (!raw) return { library: libraryFor(discipline), fresh: true };
  try {
    const parsed = JSON.parse(raw);
    return { library: normalizeLibrary(parsed), fresh: false };
  } catch {
    // Keep the unreadable data aside instead of silently losing it.
    s?.setItem(`${key}.unreadable`, raw);
    return { library: libraryFor(discipline), fresh: true };
  }
}

export function saveLibrary(lib: Library, discipline: DisciplineId = "ot"): void {
  storage()?.setItem(keyFor(KEYS.library, discipline), JSON.stringify(lib));
}

export function loadRecipes(discipline: DisciplineId = "ot"): Recipe[] {
  const raw = storage()?.getItem(keyFor(KEYS.recipes, discipline));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecipes(recipes: Recipe[], discipline: DisciplineId = "ot"): void {
  storage()?.setItem(keyFor(KEYS.recipes, discipline), JSON.stringify(recipes));
}

export function loadDraft(discipline: DisciplineId = "ot"): BuilderState {
  const raw = storage()?.getItem(keyFor(KEYS.draft, discipline));
  if (!raw) return emptyBuilderState();
  try {
    const p = JSON.parse(raw) as Partial<BuilderState>;
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return {
      pronounSet: p.pronounSet === "she" ? "she" : "he",
      gradeBandId: typeof p.gradeBandId === "string" ? p.gradeBandId : null,
      domainIds: arr(p.domainIds),
      taskIds: arr(p.taskIds),
      sentenceIds: arr(p.sentenceIds),
      values: p.values && typeof p.values === "object" ? (p.values as BuilderState["values"]) : {},
    };
  } catch {
    return emptyBuilderState();
  }
}

export function saveDraft(d: BuilderState, discipline: DisciplineId = "ot"): void {
  storage()?.setItem(keyFor(KEYS.draft, discipline), JSON.stringify(d));
}

// ---------- backup file ----------

export function makeBackup(library: Library, recipes: Recipe[], discipline?: DisciplineId, template?: unknown, pack?: unknown): Backup {
  return {
    app: "easyiep",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...(discipline ? { discipline } : {}),
    library,
    recipes,
    ...(template ? { template } : {}),
    ...(pack ? { pack } : {}),
  };
}

export function serializeBackup(b: Backup): string {
  return JSON.stringify(b, null, 2);
}

/** Parse a backup file. Throws an Error with a plain-English message on failure. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!data || typeof data !== "object") throw new Error("That file does not contain a backup.");
  const obj = data as Record<string, unknown>;
  // Accept either a full backup or a bare library object.
  const libraryRaw = obj.app === "easyiep" ? obj.library : obj.version === 1 && Array.isArray(obj.domains) ? obj : null;
  if (!libraryRaw) throw new Error("That file does not look like an IEP Writer backup.");
  const library = normalizeLibrary(libraryRaw);
  const recipes = Array.isArray(obj.recipes) ? (obj.recipes as Recipe[]) : [];
  return {
    app: "easyiep",
    version: 1,
    exportedAt: String(obj.exportedAt ?? ""),
    ...(isDisciplineId(obj.discipline) ? { discipline: obj.discipline } : {}),
    library,
    recipes,
    ...(obj.template && typeof obj.template === "object" ? { template: obj.template } : {}),
    ...(obj.pack && typeof obj.pack === "object" ? { pack: obj.pack } : {}),
  };
}

/** Fill in defaults for any missing fields so older/partial files still load. */
export function normalizeLibrary(raw: unknown): Library {
  if (!raw || typeof raw !== "object") throw new Error("Library data is missing.");
  const r = raw as Record<string, unknown>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
  const domains = arr<Record<string, unknown>>(r.domains).map((d) => ({
    id: str(d.id) || newId("d"),
    name: str(d.name, "Untitled domain"),
    tasks: arr<Record<string, unknown>>(d.tasks).map((t) => ({
      id: str(t.id) || newId("t"),
      name: str(t.name, "Untitled task"),
      sentences: arr<Record<string, unknown>>(t.sentences).map(
        (s): Sentence => ({
          id: str(s.id) || newId("s"),
          text: str(s.text),
          sectionId: typeof s.sectionId === "string" ? s.sectionId : null,
          gradeBandIds: arr<string>(s.gradeBandIds).filter((x) => typeof x === "string"),
          tags: arr<string>(s.tags).filter((x) => typeof x === "string"),
          notes: str(s.notes),
        }),
      ),
    })),
  }));
  return {
    version: 1,
    sections: arr<Record<string, unknown>>(r.sections).map((s) => ({ id: str(s.id) || newId("sec"), name: str(s.name, "Section") })),
    gradeBands: arr<Record<string, unknown>>(r.gradeBands).map((g) => ({ id: str(g.id) || newId("gb"), label: str(g.label, "Band") })),
    variables: arr<Record<string, unknown>>(r.variables)
      .filter((v) => typeof v.name === "string")
      .map((v) => ({
        name: str(v.name).toLowerCase(),
        label: str(v.label, str(v.name)),
        presets: arr<string>(v.presets).filter((x) => typeof x === "string"),
        allowFreeText: v.allowFreeText !== false,
      })),
    domains,
    neverAllow: arr<string>(r.neverAllow).filter((x) => typeof x === "string"),
    ...(typeof r.aiPromptTemplate === "string" ? { aiPromptTemplate: r.aiPromptTemplate } : {}),
  };
}

/**
 * Merge an incoming library into the current one. Matching is by name
 * (case-insensitive): sections, bands, variables, domains and tasks are
 * matched by name; sentences are matched by exact text within a task.
 * Nothing in the current library is removed or changed.
 */
export function mergeLibraries(current: Library, incoming: Library): Library {
  const lower = (s: string) => s.trim().toLowerCase();
  const sections = current.sections.slice();
  const sectionIdMap = new Map<string, string>();
  for (const s of incoming.sections) {
    const match = sections.find((x) => lower(x.name) === lower(s.name));
    if (match) sectionIdMap.set(s.id, match.id);
    else {
      const id = sections.some((x) => x.id === s.id) ? newId("sec") : s.id;
      sections.push({ id, name: s.name });
      sectionIdMap.set(s.id, id);
    }
  }
  const gradeBands = current.gradeBands.slice();
  const bandIdMap = new Map<string, string>();
  for (const g of incoming.gradeBands) {
    const match = gradeBands.find((x) => lower(x.label) === lower(g.label));
    if (match) bandIdMap.set(g.id, match.id);
    else {
      const id = gradeBands.some((x) => x.id === g.id) ? newId("gb") : g.id;
      gradeBands.push({ id, label: g.label });
      bandIdMap.set(g.id, id);
    }
  }
  const variables = current.variables.slice();
  for (const v of incoming.variables) {
    const match = variables.find((x) => x.name === v.name);
    if (!match) variables.push(v);
    else {
      const presets = [...match.presets];
      for (const p of v.presets) if (!presets.includes(p)) presets.push(p);
      variables[variables.indexOf(match)] = { ...match, presets };
    }
  }
  const usedIds = new Set<string>();
  for (const d of current.domains) {
    usedIds.add(d.id);
    for (const t of d.tasks) {
      usedIds.add(t.id);
      for (const s of t.sentences) usedIds.add(s.id);
    }
  }
  const freshId = (id: string, prefix: string) => (usedIds.has(id) ? newId(prefix) : (usedIds.add(id), id));
  const domains = current.domains.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t, sentences: t.sentences.slice() })) }));
  for (const d of incoming.domains) {
    let target = domains.find((x) => lower(x.name) === lower(d.name));
    if (!target) {
      target = { id: freshId(d.id, "d"), name: d.name, tasks: [] };
      domains.push(target);
    }
    for (const t of d.tasks) {
      let task = target.tasks.find((x) => lower(x.name) === lower(t.name));
      if (!task) {
        task = { id: freshId(t.id, "t"), name: t.name, sentences: [] };
        target.tasks.push(task);
      }
      for (const s of t.sentences) {
        if (task.sentences.some((x) => x.text.trim() === s.text.trim())) continue;
        task.sentences.push({
          ...s,
          id: freshId(s.id, "s"),
          sectionId: s.sectionId ? (sectionIdMap.get(s.sectionId) ?? null) : null,
          gradeBandIds: s.gradeBandIds.map((b) => bandIdMap.get(b)).filter((b): b is string => !!b),
        });
      }
    }
  }
  const neverAllow = [...new Set([...current.neverAllow, ...incoming.neverAllow])];
  return { ...current, sections, gradeBands, variables, domains, neverAllow };
}
