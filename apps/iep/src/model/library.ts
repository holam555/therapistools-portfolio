import { newId } from "./ids";
import type { Domain, GradeBand, Id, Library, Section, Sentence, SentenceRef, Task, VariableDef } from "./types";

// All functions are pure: they return a new Library and never mutate the input.

export function moveItem<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= arr.length || target < 0 || target >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function mapDomain(lib: Library, domainId: Id, fn: (d: Domain) => Domain): Library {
  return { ...lib, domains: lib.domains.map((d) => (d.id === domainId ? fn(d) : d)) };
}

function mapTask(lib: Library, taskId: Id, fn: (t: Task, d: Domain) => Task): Library {
  return {
    ...lib,
    domains: lib.domains.map((d) =>
      d.tasks.some((t) => t.id === taskId) ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? fn(t, d) : t)) } : d,
    ),
  };
}

// ---------- domains ----------

export function addDomain(lib: Library, name: string): { lib: Library; id: Id } {
  const id = newId("d");
  return { lib: { ...lib, domains: [...lib.domains, { id, name: name.trim() || "New domain", tasks: [] }] }, id };
}

export function renameDomain(lib: Library, domainId: Id, name: string): Library {
  return mapDomain(lib, domainId, (d) => ({ ...d, name: name.trim() || d.name }));
}

export function deleteDomain(lib: Library, domainId: Id): Library {
  return { ...lib, domains: lib.domains.filter((d) => d.id !== domainId) };
}

export function duplicateDomain(lib: Library, domainId: Id): { lib: Library; id: Id } {
  const i = lib.domains.findIndex((d) => d.id === domainId);
  if (i < 0) return { lib, id: domainId };
  const src = lib.domains[i];
  const copy: Domain = {
    id: newId("d"),
    name: `${src.name} (copy)`,
    tasks: src.tasks.map(cloneTask),
  };
  const domains = lib.domains.slice();
  domains.splice(i + 1, 0, copy);
  return { lib: { ...lib, domains }, id: copy.id };
}

export function moveDomain(lib: Library, domainId: Id, delta: number): Library {
  const i = lib.domains.findIndex((d) => d.id === domainId);
  return { ...lib, domains: moveItem(lib.domains, i, delta) };
}

// ---------- tasks ----------

function cloneTask(t: Task): Task {
  return { id: newId("t"), name: t.name, sentences: t.sentences.map(cloneSentence) };
}

export function addTask(lib: Library, domainId: Id, name: string): { lib: Library; id: Id } {
  const id = newId("t");
  return {
    lib: mapDomain(lib, domainId, (d) => ({ ...d, tasks: [...d.tasks, { id, name: name.trim() || "New task", sentences: [] }] })),
    id,
  };
}

export function renameTask(lib: Library, taskId: Id, name: string): Library {
  return mapTask(lib, taskId, (t) => ({ ...t, name: name.trim() || t.name }));
}

export function deleteTask(lib: Library, taskId: Id): Library {
  return { ...lib, domains: lib.domains.map((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== taskId) })) };
}

export function duplicateTask(lib: Library, taskId: Id): { lib: Library; id: Id } {
  let newTaskId = taskId;
  const domains = lib.domains.map((d) => {
    const i = d.tasks.findIndex((t) => t.id === taskId);
    if (i < 0) return d;
    const copy = cloneTask(d.tasks[i]);
    copy.name = `${d.tasks[i].name} (copy)`;
    newTaskId = copy.id;
    const tasks = d.tasks.slice();
    tasks.splice(i + 1, 0, copy);
    return { ...d, tasks };
  });
  return { lib: { ...lib, domains }, id: newTaskId };
}

export function moveTask(lib: Library, taskId: Id, delta: number): Library {
  return {
    ...lib,
    domains: lib.domains.map((d) => {
      const i = d.tasks.findIndex((t) => t.id === taskId);
      return i < 0 ? d : { ...d, tasks: moveItem(d.tasks, i, delta) };
    }),
  };
}

// ---------- sentences ----------

function cloneSentence(s: Sentence): Sentence {
  return { ...s, id: newId("s"), gradeBandIds: [...s.gradeBandIds], tags: [...s.tags] };
}

export function emptySentence(sectionId: Id | null = null): Sentence {
  return { id: newId("s"), text: "", sectionId, gradeBandIds: [], tags: [], notes: "" };
}

export function addSentence(lib: Library, taskId: Id, sentence: Sentence): Library {
  return mapTask(lib, taskId, (t) => ({ ...t, sentences: [...t.sentences, sentence] }));
}

export function updateSentence(lib: Library, sentence: Sentence): Library {
  return {
    ...lib,
    domains: lib.domains.map((d) => ({
      ...d,
      tasks: d.tasks.map((t) => ({ ...t, sentences: t.sentences.map((s) => (s.id === sentence.id ? sentence : s)) })),
    })),
  };
}

export function deleteSentence(lib: Library, sentenceId: Id): Library {
  return {
    ...lib,
    domains: lib.domains.map((d) => ({
      ...d,
      tasks: d.tasks.map((t) => ({ ...t, sentences: t.sentences.filter((s) => s.id !== sentenceId) })),
    })),
  };
}

export function duplicateSentence(lib: Library, sentenceId: Id): { lib: Library; id: Id } {
  let newSentenceId = sentenceId;
  const domains = lib.domains.map((d) => ({
    ...d,
    tasks: d.tasks.map((t) => {
      const i = t.sentences.findIndex((s) => s.id === sentenceId);
      if (i < 0) return t;
      const copy = cloneSentence(t.sentences[i]);
      newSentenceId = copy.id;
      const sentences = t.sentences.slice();
      sentences.splice(i + 1, 0, copy);
      return { ...t, sentences };
    }),
  }));
  return { lib: { ...lib, domains }, id: newSentenceId };
}

export function moveSentence(lib: Library, sentenceId: Id, delta: number): Library {
  return {
    ...lib,
    domains: lib.domains.map((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        const i = t.sentences.findIndex((s) => s.id === sentenceId);
        return i < 0 ? t : { ...t, sentences: moveItem(t.sentences, i, delta) };
      }),
    })),
  };
}

/** Move a sentence to another task (appended at the end). */
export function moveSentenceToTask(lib: Library, sentenceId: Id, taskId: Id): Library {
  const ref = findSentence(lib, sentenceId);
  if (!ref || ref.task.id === taskId) return lib;
  return addSentence(deleteSentence(lib, sentenceId), taskId, ref.sentence);
}

// ---------- lookups ----------

export function allSentences(lib: Library): SentenceRef[] {
  const out: SentenceRef[] = [];
  for (const domain of lib.domains)
    for (const task of domain.tasks) for (const sentence of task.sentences) out.push({ sentence, domain, task });
  return out;
}

export function findSentence(lib: Library, sentenceId: Id): SentenceRef | undefined {
  return allSentences(lib).find((r) => r.sentence.id === sentenceId);
}

export function findTask(lib: Library, taskId: Id): { domain: Domain; task: Task } | undefined {
  for (const domain of lib.domains) for (const task of domain.tasks) if (task.id === taskId) return { domain, task };
  return undefined;
}

export function findDomainByName(lib: Library, name: string): Domain | undefined {
  const n = name.trim().toLowerCase();
  return lib.domains.find((d) => d.name.trim().toLowerCase() === n);
}

export function findTaskByName(domain: Domain, name: string): Task | undefined {
  const n = name.trim().toLowerCase();
  return domain.tasks.find((t) => t.name.trim().toLowerCase() === n);
}

/** Find or create a domain and task by name; returns the task id. */
export function ensureTask(lib: Library, domainName: string, taskName: string): { lib: Library; taskId: Id } {
  let domain = findDomainByName(lib, domainName);
  let next = lib;
  if (!domain) {
    const r = addDomain(lib, domainName);
    next = r.lib;
    domain = next.domains.find((d) => d.id === r.id)!;
  }
  const task = findTaskByName(domain, taskName);
  if (task) return { lib: next, taskId: task.id };
  const r = addTask(next, domain.id, taskName);
  return { lib: r.lib, taskId: r.id };
}

export function countSentences(lib: Library): number {
  return allSentences(lib).length;
}

// ---------- settings: sections, grade bands, variables ----------

export function addSection(lib: Library, name: string): Library {
  return { ...lib, sections: [...lib.sections, { id: newId("sec"), name: name.trim() || "New section" }] };
}
export function renameSection(lib: Library, id: Id, name: string): Library {
  return { ...lib, sections: lib.sections.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)) };
}
export function moveSection(lib: Library, id: Id, delta: number): Library {
  return { ...lib, sections: moveItem(lib.sections, lib.sections.findIndex((s) => s.id === id), delta) };
}
/** Deleting a section clears it from any sentence that used it. */
export function deleteSection(lib: Library, id: Id): Library {
  const cleared = mapAllSentences(lib, (s) => (s.sectionId === id ? { ...s, sectionId: null } : s));
  return { ...cleared, sections: lib.sections.filter((s) => s.id !== id) };
}

export function addGradeBand(lib: Library, label: string): Library {
  return { ...lib, gradeBands: [...lib.gradeBands, { id: newId("gb"), label: label.trim() || "New band" }] };
}
export function renameGradeBand(lib: Library, id: Id, label: string): Library {
  return { ...lib, gradeBands: lib.gradeBands.map((g) => (g.id === id ? { ...g, label: label.trim() || g.label } : g)) };
}
export function moveGradeBand(lib: Library, id: Id, delta: number): Library {
  return { ...lib, gradeBands: moveItem(lib.gradeBands, lib.gradeBands.findIndex((g) => g.id === id), delta) };
}
export function deleteGradeBand(lib: Library, id: Id): Library {
  const cleared = mapAllSentences(lib, (s) =>
    s.gradeBandIds.includes(id) ? { ...s, gradeBandIds: s.gradeBandIds.filter((g) => g !== id) } : s,
  );
  return { ...cleared, gradeBands: lib.gradeBands.filter((g) => g.id !== id) };
}

export function upsertVariable(lib: Library, v: VariableDef): Library {
  const name = v.name.toLowerCase();
  const exists = lib.variables.some((x) => x.name === name);
  const def = { ...v, name, presets: v.presets.map((p) => p.trim()).filter(Boolean) };
  return {
    ...lib,
    variables: exists ? lib.variables.map((x) => (x.name === name ? def : x)) : [...lib.variables, def],
  };
}
export function deleteVariable(lib: Library, name: string): Library {
  return { ...lib, variables: lib.variables.filter((v) => v.name !== name) };
}
export function findVariable(lib: Library, name: string): VariableDef | undefined {
  return lib.variables.find((v) => v.name === name.toLowerCase());
}

export function setNeverAllow(lib: Library, words: string[]): Library {
  const cleaned = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
  return { ...lib, neverAllow: cleaned };
}

/** Remove all domains/tasks/sentences but keep sections, bands, variables and settings. */
export function clearLibrary(lib: Library): Library {
  return { ...lib, domains: [] };
}

function mapAllSentences(lib: Library, fn: (s: Sentence) => Sentence): Library {
  return {
    ...lib,
    domains: lib.domains.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t, sentences: t.sentences.map(fn) })) })),
  };
}

export function sectionName(lib: Library, id: Id | null): string {
  return lib.sections.find((s) => s.id === id)?.name ?? "(no section)";
}

export function bandLabels(lib: Library, ids: Id[]): string {
  if (ids.length === 0) return "All grades";
  return ids.map((id) => lib.gradeBands.find((g) => g.id === id)?.label ?? "?").join(", ");
}

export type { Section, GradeBand };
