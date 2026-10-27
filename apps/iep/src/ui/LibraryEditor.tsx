import { useMemo, useState } from "react";
import type { Id, Sentence, SentenceRef } from "../model/types";
import {
  addDomain, addSentence, addTask, allSentences, bandLabels, deleteDomain, deleteSentence, deleteTask, duplicateDomain, duplicateSentence,
  duplicateTask, emptySentence, findTask, moveDomain, moveSentence, moveTask, renameDomain, renameTask, sectionName, updateSentence,
} from "../model/library";
import { AddInline, InlineEdit, Modal, TokenLegend, confirmAction } from "./common";
import { SentenceForm } from "./SentenceForm";
import { TokenText } from "./TokenText";
import { useApp } from "./state";

type Editing = { mode: "new"; taskId: Id } | { mode: "edit"; sentence: Sentence; taskId: Id } | null;

interface Filters {
  domainId: string;
  taskId: string;
  sectionId: string;
  bandId: string;
}

const NO_FILTERS: Filters = { domainId: "", taskId: "", sectionId: "", bandId: "" };

export function LibraryEditor() {
  const { lib, update } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<Id | null>(lib.domains[0]?.tasks[0]?.id ?? null);
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const searching = query.trim() !== "" || Object.values(filters).some(Boolean);
  const selected = selectedTaskId ? findTask(lib, selectedTaskId) : undefined;
  const total = useMemo(() => allSentences(lib).length, [lib]);

  const results = useMemo<SentenceRef[]>(() => {
    if (!searching) return [];
    const q = query.trim().toLowerCase();
    return allSentences(lib).filter(({ sentence, domain, task }) => {
      if (filters.domainId && domain.id !== filters.domainId) return false;
      if (filters.taskId && task.id !== filters.taskId) return false;
      if (filters.sectionId && (filters.sectionId === "none" ? sentence.sectionId !== null : sentence.sectionId !== filters.sectionId)) return false;
      if (filters.bandId && sentence.gradeBandIds.length > 0 && !sentence.gradeBandIds.includes(filters.bandId)) return false;
      if (!q) return true;
      return [sentence.text, sentence.notes, sentence.tags.join(" "), task.name, domain.name].some((s) => s.toLowerCase().includes(q));
    });
  }, [lib, query, filters, searching]);

  const saveSentence = (s: Sentence) => {
    if (!editing) return;
    if (editing.mode === "new") update((l) => addSentence(l, editing.taskId, s));
    else update((l) => updateSentence(l, s));
    setEditing(null);
  };

  const taskOptions = filters.domainId ? (lib.domains.find((d) => d.id === filters.domainId)?.tasks ?? []) : lib.domains.flatMap((d) => d.tasks);

  return (
    <div className="library">
      <aside className="tree" aria-label="Domains and tasks">
        <div className="tree-head">
          <strong>Library</strong>
          <span className="hint">{total} sentences</span>
        </div>
        {lib.domains.length === 0 && <p className="hint">No domains yet. Add one below or use Import.</p>}
        {lib.domains.map((d, di) => (
          <div key={d.id} className="tree-domain">
            <div className="tree-row tree-row-domain">
              <InlineEdit value={d.name} label={`domain ${d.name}`} onSave={(v) => update((l) => renameDomain(l, d.id, v))} className="tree-name" />
              <span className="actions">
                <button type="button" className="btn btn-xs" title="Move up" disabled={di === 0} onClick={() => update((l) => moveDomain(l, d.id, -1))}>↑</button>
                <button type="button" className="btn btn-xs" title="Move down" disabled={di === lib.domains.length - 1} onClick={() => update((l) => moveDomain(l, d.id, 1))}>↓</button>
                <button type="button" className="btn btn-xs" title="Duplicate domain" onClick={() => update((l) => duplicateDomain(l, d.id).lib)}>⧉</button>
                <button
                  type="button"
                  className="btn btn-xs btn-danger"
                  title="Delete domain"
                  onClick={() => {
                    const n = d.tasks.reduce((a, t) => a + t.sentences.length, 0);
                    if (confirmAction(`Delete the domain "${d.name}" with ${d.tasks.length} tasks and ${n} sentences? You can undo with Cmd/Ctrl+Z.`)) {
                      update((l) => deleteDomain(l, d.id));
                      if (d.tasks.some((t) => t.id === selectedTaskId)) setSelectedTaskId(null);
                    }
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
            <ul className="tree-tasks">
              {d.tasks.map((t, ti) => (
                <li key={t.id} className={`tree-row tree-row-task ${t.id === selectedTaskId && !searching ? "selected" : ""}`}>
                  <button
                    type="button"
                    className="tree-task-btn"
                    aria-current={t.id === selectedTaskId && !searching ? "true" : undefined}
                    onClick={() => {
                      setSelectedTaskId(t.id);
                      setQuery("");
                      setFilters(NO_FILTERS);
                    }}
                  >
                    {t.name} <small>{t.sentences.length}</small>
                  </button>
                  <span className="actions">
                    <button type="button" className="btn btn-xs" title="Move up" disabled={ti === 0} onClick={() => update((l) => moveTask(l, t.id, -1))}>↑</button>
                    <button type="button" className="btn btn-xs" title="Move down" disabled={ti === d.tasks.length - 1} onClick={() => update((l) => moveTask(l, t.id, 1))}>↓</button>
                  </span>
                </li>
              ))}
            </ul>
            <AddInline label="task" placeholder="Task name" className="tree-add" onAdd={(name) => update((l) => {
              const r = addTask(l, d.id, name);
              setSelectedTaskId(r.id);
              return r.lib;
            })} />
          </div>
        ))}
        <AddInline label="domain" placeholder="Domain name" className="tree-add-domain" onAdd={(name) => update((l) => addDomain(l, name).lib)} />
      </aside>

      <section className="panel">
        <div className="searchbar" role="search">
          <input
            type="search"
            placeholder="Search sentences, tags, notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search sentences"
          />
          <select value={filters.domainId} onChange={(e) => setFilters({ ...filters, domainId: e.target.value, taskId: "" })} aria-label="Filter by domain">
            <option value="">Any domain</option>
            {lib.domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select value={filters.taskId} onChange={(e) => setFilters({ ...filters, taskId: e.target.value })} aria-label="Filter by task">
            <option value="">Any task</option>
            {taskOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={filters.sectionId} onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })} aria-label="Filter by section">
            <option value="">Any section</option>
            {lib.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="none">(no section)</option>
          </select>
          <select value={filters.bandId} onChange={(e) => setFilters({ ...filters, bandId: e.target.value })} aria-label="Filter by grade band">
            <option value="">Any grade</option>
            {lib.gradeBands.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
          {searching && (
            <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); setFilters(NO_FILTERS); }}>
              Clear
            </button>
          )}
        </div>

        <TokenLegend compact />
        {searching ? (
          <>
            <h2 className="panel-title">{results.length} matching sentence{results.length === 1 ? "" : "s"}</h2>
            {results.length === 0 && <p className="hint">Nothing matches. Try fewer filters.</p>}
            <ul className="sentence-list">
              {results.map(({ sentence, domain, task }) => (
                <li key={sentence.id} className="sentence-card">
                  <div className="crumb">
                    {domain.name} › <button type="button" className="link" onClick={() => { setSelectedTaskId(task.id); setQuery(""); setFilters(NO_FILTERS); }}>{task.name}</button>
                  </div>
                  <SentenceBody sentence={sentence} />
                  <div className="actions-row">
                    <button type="button" className="btn btn-sm" onClick={() => setEditing({ mode: "edit", sentence, taskId: task.id })}>Edit</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : !selected ? (
          <p className="hint">Pick a task on the left, or add a domain and task to start.</p>
        ) : (
          <>
            <div className="panel-head">
              <div>
                <div className="crumb">{selected.domain.name}</div>
                <h2 className="panel-title">
                  <InlineEdit value={selected.task.name} label={`task ${selected.task.name}`} onSave={(v) => update((l) => renameTask(l, selected.task.id, v))} />
                </h2>
              </div>
              <div className="row gap">
                <button type="button" className="btn btn-sm" onClick={() => update((l) => { const r = duplicateTask(l, selected.task.id); setSelectedTaskId(r.id); return r.lib; })}>Duplicate task</button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    if (confirmAction(`Delete the task "${selected.task.name}" and its ${selected.task.sentences.length} sentences? You can undo with Cmd/Ctrl+Z.`)) {
                      update((l) => deleteTask(l, selected.task.id));
                      setSelectedTaskId(null);
                    }
                  }}
                >
                  Delete task
                </button>
              </div>
            </div>
            {selected.task.sentences.length === 0 && <p className="hint">No sentences in this task yet.</p>}
            <ul className="sentence-list">
              {selected.task.sentences.map((s, i) => (
                <li key={s.id} className="sentence-card">
                  <SentenceBody sentence={s} />
                  <div className="actions-row">
                    <button type="button" className="btn btn-sm" onClick={() => setEditing({ mode: "edit", sentence: s, taskId: selected.task.id })}>Edit</button>
                    <button type="button" className="btn btn-sm" onClick={() => update((l) => duplicateSentence(l, s.id).lib)}>Duplicate</button>
                    <button type="button" className="btn btn-sm" title="Move up" disabled={i === 0} onClick={() => update((l) => moveSentence(l, s.id, -1))}>↑</button>
                    <button type="button" className="btn btn-sm" title="Move down" disabled={i === selected.task.sentences.length - 1} onClick={() => update((l) => moveSentence(l, s.id, 1))}>↓</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => { if (confirmAction("Delete this sentence? You can undo with Cmd/Ctrl+Z.")) update((l) => deleteSentence(l, s.id)); }}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={() => setEditing({ mode: "new", taskId: selected.task.id })}>
              + Add sentence
            </button>
          </>
        )}
      </section>

      {editing && (
        <Modal title={editing.mode === "new" ? "New sentence" : "Edit sentence"} onClose={() => setEditing(null)} wide>
          <SentenceForm
            key={editing.mode === "edit" ? editing.sentence.id : "new"}
            initial={editing.mode === "new" ? emptySentence(lib.sections[0]?.id ?? null) : editing.sentence}
            onSave={saveSentence}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function SentenceBody({ sentence }: { sentence: Sentence }) {
  const { lib } = useApp();
  return (
    <>
      <p className="sentence-text">
        <TokenText text={sentence.text} lib={lib} />
      </p>
      <div className="meta">
        <span className={`badge ${sentence.sectionId ? "" : "badge-muted"}`}>{sectionName(lib, sentence.sectionId)}</span>
        <span className="badge badge-muted">{bandLabels(lib, sentence.gradeBandIds)}</span>
        {sentence.tags.map((t) => (
          <span key={t} className="badge badge-tag">#{t}</span>
        ))}
        {sentence.notes && <span className="note" title={sentence.notes}>✎ {sentence.notes}</span>}
      </div>
    </>
  );
}
