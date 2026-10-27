import { useMemo, useState } from "react";
import type { Id, PronounSet, Recipe, VariableDef } from "../model/types";
import { assemble, emptyBuilderState, matchingSentences, type BuilderState } from "../model/assemble";
import { findVariable } from "../model/library";
import { newId } from "../model/ids";
import { renderSegments, variableSlots, type Segment } from "../model/template";
import { confirmAction } from "./common";
import { useApp } from "./state";

/**
 * Phase 2: choose pronouns, grade band, domains and tasks; tick sentences; fill blanks;
 * watch the preview. The draft autosaves. Recipes remember a selection (not values).
 */
export function Builder() {
  const { lib, recipes, setRecipes, draft: state, setDraft: setState } = useApp();
  const [recipeId, setRecipeId] = useState<string>("");

  // Ignore ids that no longer exist in the library (deleted since the draft was saved).
  const domainIds = state.domainIds.filter((id) => lib.domains.some((d) => d.id === id));
  const matching = useMemo(() => matchingSentences(lib, state), [lib, state]);
  const assembled = useMemo(() => assemble(lib, state), [lib, state]);

  const patch = (p: Partial<BuilderState>) => setState((s) => ({ ...s, ...p }));
  const toggle = (list: Id[], id: Id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const toggleDomain = (id: Id) => {
    const on = !domainIds.includes(id);
    const tasks = lib.domains.find((d) => d.id === id)?.tasks.map((t) => t.id) ?? [];
    patch({
      domainIds: toggle(domainIds, id),
      taskIds: on ? [...new Set([...state.taskIds, ...tasks])] : state.taskIds.filter((t) => !tasks.includes(t)),
    });
  };
  const toggleTask = (id: Id) => patch({ taskIds: toggle(state.taskIds, id) });
  const toggleSentence = (id: Id) => patch({ sentenceIds: toggle(state.sentenceIds, id) });
  const setTaskSentences = (taskId: Id, on: boolean) => {
    const ids = matching.filter((r) => r.task.id === taskId).map((r) => r.sentence.id);
    patch({ sentenceIds: on ? [...new Set([...state.sentenceIds, ...ids])] : state.sentenceIds.filter((s) => !ids.includes(s)) });
  };
  const setValue = (sentenceId: Id, key: string, value: string) =>
    setState((s) => ({ ...s, values: { ...s.values, [sentenceId]: { ...(s.values[sentenceId] ?? {}), [key]: value } } }));

  const startOver = () => {
    if (state.sentenceIds.length === 0 || confirmAction("Clear the current IEP draft (selections and filled-in blanks)? Your library is not affected."))
      setState({ ...emptyBuilderState(), pronounSet: state.pronounSet, gradeBandId: state.gradeBandId });
  };

  const saveRecipe = () => {
    const name = window.prompt("Name for this recipe (e.g. “usual 2nd grade fine motor set”):");
    if (!name?.trim()) return;
    const r: Recipe = {
      id: newId("r"),
      name: name.trim(),
      pronounSet: state.pronounSet,
      gradeBandId: state.gradeBandId,
      domainIds,
      taskIds: state.taskIds,
      sentenceIds: state.sentenceIds,
    };
    setRecipes([...recipes, r]);
    setRecipeId(r.id);
  };
  const loadRecipe = () => {
    const r = recipes.find((x) => x.id === recipeId);
    if (!r) return;
    if (state.sentenceIds.length > 0 && !confirmAction(`Load “${r.name}”? It replaces the current selection; filled-in blanks are cleared.`)) return;
    setState({ pronounSet: r.pronounSet, gradeBandId: r.gradeBandId, domainIds: r.domainIds, taskIds: r.taskIds, sentenceIds: r.sentenceIds, values: {} });
  };
  const deleteRecipe = () => {
    const r = recipes.find((x) => x.id === recipeId);
    if (r && confirmAction(`Delete the recipe “${r.name}”?`)) {
      setRecipes(recipes.filter((x) => x.id !== recipeId));
      setRecipeId("");
    }
  };

  // Section → domain → task grouping of the matching sentences, for the picker.
  const sectionGroups = useMemo(() => {
    const order: (Id | null)[] = [...lib.sections.map((s) => s.id), null];
    return order
      .map((sectionId) => {
        const refs = matching.filter((r) => r.sentence.sectionId === sectionId);
        const tasks = new Map<Id, { domainName: string; taskName: string; refs: typeof refs }>();
        for (const r of refs) {
          const g = tasks.get(r.task.id) ?? { domainName: r.domain.name, taskName: r.task.name, refs: [] };
          g.refs.push(r);
          tasks.set(r.task.id, g);
        }
        return { sectionId, name: sectionId ? (lib.sections.find((s) => s.id === sectionId)?.name ?? "") : "No section", tasks: [...tasks.entries()] };
      })
      .filter((g) => g.tasks.length > 0);
  }, [lib, matching]);

  return (
    <div className="builder">
      <section className="card builder-setup">
        <div className="row gap wrap">
          <span className="field-inline">
            Student pronouns
            <span className="seg" role="radiogroup" aria-label="Pronouns">
              {(["he", "she"] as PronounSet[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={state.pronounSet === p} className={state.pronounSet === p ? "on" : ""} onClick={() => patch({ pronounSet: p })}>
                  {p === "he" ? "He / him" : "She / her"}
                </button>
              ))}
            </span>
          </span>
          <label className="field-inline">
            Grade band
            <select value={state.gradeBandId ?? ""} onChange={(e) => patch({ gradeBandId: e.target.value || null })}>
              <option value="">Any grade</option>
              {lib.gradeBands.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </label>
          <span className="spacer" />
          <label className="field-inline">
            Recipe
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} aria-label="Saved recipes">
              <option value="">{recipes.length ? "choose…" : "none saved yet"}</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-sm" onClick={loadRecipe} disabled={!recipeId}>Load</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={deleteRecipe} disabled={!recipeId}>Delete</button>
          <button type="button" className="btn btn-sm" onClick={saveRecipe} disabled={state.sentenceIds.length === 0} title="Remember this selection of domains, tasks and sentences">
            Save selection as recipe
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={startOver}>Start new IEP</button>
        </div>
      </section>

      <div className="builder-cols">
        <div className="builder-pick">
          <section className="card">
            <h2>1. What did you assess?</h2>
            <div className="domain-grid">
              {lib.domains.map((d) => (
                <div key={d.id} className={`domain-box ${domainIds.includes(d.id) ? "on" : ""}`}>
                  <label className="check strong">
                    <input type="checkbox" checked={domainIds.includes(d.id)} onChange={() => toggleDomain(d.id)} /> {d.name}
                  </label>
                  <div className="task-checks">
                    {d.tasks.map((t) => (
                      <label key={t.id} className="check">
                        <input type="checkbox" checked={state.taskIds.includes(t.id)} onChange={() => toggleTask(t.id)} /> {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>2. Pick sentences and fill in the blanks</h2>
            {matching.length === 0 && <p className="hint">Check a domain or task above to see its sentences here.</p>}
            {sectionGroups.map((g) => (
              <div key={g.sectionId ?? "none"} className="pick-section">
                <h3>{g.name}</h3>
                {g.tasks.map(([taskId, t]) => (
                  <div key={taskId} className="pick-task">
                    <div className="pick-task-head">
                      <span className="crumb">{t.domainName} › {t.taskName}</span>
                      <span className="hint">
                        <button type="button" className="link" onClick={() => setTaskSentences(taskId, true)}>all</button> ·{" "}
                        <button type="button" className="link" onClick={() => setTaskSentences(taskId, false)}>none</button>
                      </span>
                    </div>
                    {t.refs.map(({ sentence }) => {
                      const on = state.sentenceIds.includes(sentence.id);
                      return (
                        <div key={sentence.id} className={`pick-row ${on ? "on" : ""}`}>
                          <input type="checkbox" checked={on} onChange={() => toggleSentence(sentence.id)} aria-label="Use this sentence" />
                          <div className="pick-text">
                            {on ? (
                              <FillableSentence text={sentence.text} pronounSet={state.pronounSet} values={state.values[sentence.id] ?? {}} onChange={(k, v) => setValue(sentence.id, k, v)} />
                            ) : (
                              <button type="button" className="pick-preview" onClick={() => toggleSentence(sentence.id)}>
                                <PreviewSentence text={sentence.text} pronounSet={state.pronounSet} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>

        <aside className="card builder-preview" aria-label="Preview">
          <div className="row gap between">
            <h2>Preview</h2>
            <span className={`hint ${assembled.missing ? "warn" : ""}`}>
              {assembled.sentenceCount} sentence{assembled.sentenceCount === 1 ? "" : "s"}
              {assembled.missing ? ` · ${assembled.missing} blank${assembled.missing === 1 ? "" : "s"} to fill` : assembled.sentenceCount ? " · all blanks filled" : ""}
            </span>
          </div>
          {assembled.sections.length === 0 && <p className="hint">Tick sentences on the left and they appear here, grouped by IEP section.</p>}
          {assembled.sections.map((s) => (
            <div key={s.sectionId ?? "none"} className="prev-section">
              <h3>{s.sectionName}</h3>
              {s.blocks.map((b) => (
                <div key={b.domainId} className="prev-block">
                  {b.paragraphs.map((p) => (
                    <p key={p.taskId} className="prev-para">
                      {p.label && <strong>{p.label}: </strong>}
                      {p.sentences.map((sn, i) => (
                        <span key={sn.sentenceId}>
                          {i > 0 ? " " : ""}
                          <Segments segments={sn.segments} />
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ))}
          <p className="hint">When it reads right, go to the <strong>Output</strong> tab to copy it or download a Word file.</p>
        </aside>
      </div>
    </div>
  );
}

function Segments({ segments }: { segments: Segment[] }) {
  const { lib } = useApp();
  return (
    <>
      {segments.map((s, i) =>
        s.kind === "text" || s.kind === "auto" ? (
          <span key={i}>{s.text}</span>
        ) : s.kind === "filled" ? (
          <span key={i} className="filled">{s.text}</span>
        ) : (
          <mark key={i} className="miss">⟨{findVariable(lib, s.name)?.label ?? s.name}⟩</mark>
        ),
      )}
    </>
  );
}

function PreviewSentence({ text, pronounSet }: { text: string; pronounSet: PronounSet }) {
  return <Segments segments={renderSegments(text, { pronounSet, values: {} })} />;
}

/** The sentence with an input in place of each blank. */
function FillableSentence({ text, pronounSet, values, onChange }: { text: string; pronounSet: PronounSet; values: Record<string, string>; onChange: (key: string, v: string) => void }) {
  const { lib } = useApp();
  const slots = variableSlots(text);
  let slotIndex = 0;
  return (
    <span className="fillable">
      {renderSegments(text, { pronounSet, values }).map((s, i) => {
        if (s.kind === "text") return <span key={i}>{s.text}</span>;
        if (s.kind === "auto") return <span key={i} className="auto">{s.text}</span>;
        const slot = slots[slotIndex++];
        return <BlankInput key={i} def={findVariable(lib, s.name)} name={s.name} value={values[slot.key] ?? ""} onChange={(v) => onChange(slot.key, v)} />;
      })}
    </span>
  );
}

const CUSTOM = "__custom__";

function BlankInput({ def, name, value, onChange }: { def: VariableDef | undefined; name: string; value: string; onChange: (v: string) => void }) {
  const label = def?.label ?? name.replace(/_/g, " ");
  const presets = def?.presets ?? [];
  const [custom, setCustom] = useState(() => value !== "" && !presets.includes(value));
  if (presets.length === 0) {
    return <input className={`blank-input ${value ? "" : "empty"}`} value={value} placeholder={label} onChange={(e) => onChange(e.target.value)} aria-label={label} size={Math.max(label.length, value.length, 6)} />;
  }
  const isCustom = custom || (value !== "" && !presets.includes(value));
  return (
    <span className="blank-group">
      <select
        className={`blank-select ${value ? "" : "empty"}`}
        value={isCustom ? CUSTOM : value}
        aria-label={label}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">⟨{label}⟩</option>
        {presets.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        {(def?.allowFreeText ?? true) && <option value={CUSTOM}>type my own…</option>}
      </select>
      {isCustom && <input className={`blank-input ${value ? "" : "empty"}`} value={value} placeholder={label} autoFocus onChange={(e) => onChange(e.target.value)} aria-label={`${label} (typed)`} size={Math.max(value.length, 8)} />}
    </span>
  );
}
