import { useRef, useState } from "react";
import type { VariableDef } from "../model/types";
import {
  addGradeBand, addSection, allSentences, clearLibrary, deleteGradeBand, deleteSection, deleteVariable, moveGradeBand, moveSection,
  renameGradeBand, renameSection, setNeverAllow, upsertVariable,
} from "../model/library";
import { libraryFor } from "../model/defaults";
import { DISCIPLINES, getDiscipline, type DisciplineId } from "../model/disciplines";
import { makeBackup, mergeLibraries, parseBackup, serializeBackup } from "../model/storage";
import { hasOverrides, loadOverrides, normalizeOverrides, saveOverrides } from "../report/overrides";
import { loadPack, normalizePack, savePack } from "../report/pack";
import { BLANKS_MARKER, DEFAULT_PROMPT_TEMPLATE, ROLE_MARKER, TEMPLATE_MARKER, promptTemplate } from "../model/prompt";
import { isValidVariableName, variableNames } from "../model/template";
import { AddInline, InlineEdit, confirmAction, downloadText, todayStamp } from "./common";
import { useApp } from "./state";
import { PRIVACY_PATH, SITE_ORIGIN } from "../../../../shared/brand.js";

/** From the downloaded offline file, the privacy page lives on the website. */
const privacyHref = `${typeof location !== "undefined" && location.protocol === "file:" ? SITE_ORIGIN : ""}${PRIVACY_PATH}#iep`;

export function Settings() {
  const { lib, update, replace, recipes, setRecipes, discipline, changeDiscipline } = useApp();
  const current = getDiscipline(discipline);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null);

  const usage = new Map<string, number>();
  for (const { sentence } of allSentences(lib)) for (const v of variableNames(sentence.text)) usage.set(v, (usage.get(v) ?? 0) + 1);

  const exportJson = () => {
    downloadText(
      `therapistools-iep-${discipline}-backup-${todayStamp()}.json`,
      serializeBackup(makeBackup(lib, recipes, discipline, hasOverrides(loadOverrides(discipline)) ? loadOverrides(discipline) : undefined, loadPack(discipline) ?? undefined)),
    );
    setMessage("Backup file saved to your Downloads folder.");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      setPendingImport(parsed);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read that file.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const n = (l: typeof lib) => allSentences(l).length;

  return (
    <div className="settings">
      {message && <div className="notice">{message}</div>}

      <section className="card">
        <h2>Privacy</h2>
        <p className="hint">
          Your library and drafts are saved only in this browser. This tool has no field for a student's name, never connects to the
          internet after it loads, and has no visit counter. Students are always written as [STUDENT].{" "}
          <a href={privacyHref}>Read the full privacy page</a>.
        </p>
      </section>

      <section className="card">
        <h2>Discipline</h2>
        <p className="hint">
          Each discipline keeps its own sentence bank, recipes and draft. Switching never mixes them. Only occupational therapy has a starter library
          so far.
        </p>
        <label className="field-inline">
          Writing as
          <select value={discipline} onChange={(e) => changeDiscipline(e.target.value as DisciplineId)}>
            {DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="hint">Your library, recipes and report-template edits live inside this browser on this computer. Export a file now and then so you can restore them.</p>
        <div className="row gap wrap">
          <button type="button" className="btn btn-primary" onClick={exportJson}>Export JSON</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Import JSON…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose a backup file" />
        </div>
        {pendingImport && (
          <div className="notice">
            <p>
              The file holds {n(pendingImport.library)} sentences in {pendingImport.library.domains.length} domains
              {pendingImport.exportedAt ? ` (exported ${pendingImport.exportedAt.slice(0, 10)})` : ""}
              {pendingImport.discipline && pendingImport.discipline !== discipline
                ? `. It was exported from the ${getDiscipline(pendingImport.discipline).label.toLowerCase()} bank and will be loaded into ${current.label.toLowerCase()}`
                : ""}
              . How should it be loaded?
            </p>
            <div className="row gap wrap">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  replace(mergeLibraries(lib, pendingImport.library));
                  if (pendingImport.template) {
                    // Merge: keep your own edits, add the file's edits where you have none.
                    const mine = loadOverrides(discipline);
                    const theirs = normalizeOverrides(pendingImport.template);
                    saveOverrides(discipline, {
                      version: 1,
                      blocks: { ...theirs.blocks, ...mine.blocks },
                      sectionExamples: { ...theirs.sectionExamples, ...mine.sectionExamples },
                      lists: { ...theirs.lists, ...mine.lists },
                      screen: { ...theirs.screen, ...mine.screen },
                      grids: { ...theirs.grids, ...mine.grids },
                      titles: { ...theirs.titles, ...mine.titles },
                    });
                  }
                  // A template pack is taken from the file only when there is none here yet.
                  if (pendingImport.pack && !loadPack(discipline)) savePack(discipline, normalizePack(pendingImport.pack));
                  setPendingImport(null);
                  setMessage("Merged: new domains, tasks, sentences and settings were added; nothing existing was removed.");
                }}
              >
                Merge into current library
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (confirmAction(`Replace the current library (${n(lib)} sentences) with the file? You can undo with Cmd/Ctrl+Z.`)) {
                    replace(pendingImport.library);
                    if (pendingImport.template) saveOverrides(discipline, normalizeOverrides(pendingImport.template));
                    if (pendingImport.pack) savePack(discipline, normalizePack(pendingImport.pack));
                    if (pendingImport.recipes.length) setRecipes(pendingImport.recipes);
                    setPendingImport(null);
                    setMessage("Library replaced from the backup file.");
                  }
                }}
              >
                Replace current library
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>IEP sections</h2>
        <p className="hint">The order here is the order sections appear in the builder and output.</p>
        <OrderedList
          items={lib.sections.map((s) => ({ id: s.id, label: s.name }))}
          kind="section"
          onRename={(id, v) => update((l) => renameSection(l, id, v))}
          onMove={(id, d) => update((l) => moveSection(l, id, d))}
          onDelete={(id, label) => {
            const used = allSentences(lib).filter((r) => r.sentence.sectionId === id).length;
            if (confirmAction(`Delete the section "${label}"? ${used} sentence${used === 1 ? "" : "s"} will lose their section (undo with Cmd/Ctrl+Z).`))
              update((l) => deleteSection(l, id));
          }}
        />
        <AddInline label="section" placeholder="Section name" onAdd={(v) => update((l) => addSection(l, v))} />
      </section>

      <section className="card">
        <h2>Grade bands</h2>
        <OrderedList
          items={lib.gradeBands.map((g) => ({ id: g.id, label: g.label }))}
          kind="grade band"
          onRename={(id, v) => update((l) => renameGradeBand(l, id, v))}
          onMove={(id, d) => update((l) => moveGradeBand(l, id, d))}
          onDelete={(id, label) => {
            if (confirmAction(`Delete the grade band "${label}"? Sentences tagged with it keep their other bands (undo with Cmd/Ctrl+Z).`))
              update((l) => deleteGradeBand(l, id));
          }}
        />
        <AddInline label="grade band" placeholder="e.g. K–2" onAdd={(v) => update((l) => addGradeBand(l, v))} />
      </section>

      <section className="card">
        <h2>Blanks</h2>
        <p className="hint">
          A blank is a fill-in spot like <code>{"{{accuracy}}"}</code>. Each blank has one shared list of preset choices used everywhere it appears,
          and can also accept typed text. Put one preset per line.
        </p>
        <div className="var-grid">
          {lib.variables.map((v) => (
            <VariableCard key={v.name} v={v} used={usage.get(v.name) ?? 0} onSave={(nv) => update((l) => upsertVariable(l, nv))} onDelete={() => {
              const used = usage.get(v.name) ?? 0;
              if (confirmAction(`Delete the blank "${v.name}"?${used ? ` It is used in ${used} sentence${used === 1 ? "" : "s"}; those will still work as free text.` : ""}`))
                update((l) => deleteVariable(l, v.name));
            }} />
          ))}
        </div>
        <AddInline
          label="blank"
          placeholder="name, e.g. accuracy"
          onAdd={(raw) => {
            const name = raw.trim().toLowerCase().replace(/\s+/g, "_");
            if (!isValidVariableName(name)) {
              setMessage("Blank names use lowercase letters, numbers and underscores, and cannot be a reserved word like student or they.");
              return;
            }
            update((l) => upsertVariable(l, { name, label: name.replace(/_/g, " "), presets: [], allowFreeText: true }));
          }}
        />
      </section>

      <section className="card">
        <h2>AI prompt</h2>
        <p className="hint">
          The instructions placed around your template when you press “Build AI prompt”. Keep the two markers <code>{TEMPLATE_MARKER}</code> (your
          assembled text goes there) and <code>{BLANKS_MARKER}</code> (the list of unfilled blanks). <code>{ROLE_MARKER}</code> becomes your role, such as “{current.role}”. If the first marker is missing,
          the default wording is used.
        </p>
        <textarea
          key={lib.aiPromptTemplate ?? "default"}
          rows={14}
          className="prompt-text"
          defaultValue={promptTemplate(lib)}
          onBlur={(e) => {
            const v = e.target.value;
            update((l) => (v.trim() === DEFAULT_PROMPT_TEMPLATE.trim() ? { ...l, aiPromptTemplate: undefined } : { ...l, aiPromptTemplate: v }));
          }}
          aria-label="AI prompt wording"
        />
        <div className="row gap wrap">
          <button type="button" className="btn btn-sm" onClick={() => update((l) => ({ ...l, aiPromptTemplate: undefined }))} disabled={!lib.aiPromptTemplate}>
            Reset to default wording
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Never-allow list</h2>
        <p className="hint">
          Words or phrases the privacy check on the Output tab should always warn about, such as school names, teacher names, or room numbers.
          One per line; capitalisation does not matter.
        </p>
        <textarea
          rows={4}
          defaultValue={lib.neverAllow.join("\n")}
          onBlur={(e) => update((l) => setNeverAllow(l, e.target.value.split("\n")))}
          aria-label="Never-allow words"
        />
      </section>

      <section className="card card-danger">
        <h2>Start over</h2>
        <div className="row gap wrap">
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (confirmAction(`Remove all ${n(lib)} sentences, tasks and domains? Sections, grade bands and variables are kept. Undo with Cmd/Ctrl+Z.`))
                update((l) => clearLibrary(l));
            }}
          >
            Clear library
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (
                confirmAction(
                  current.hasStarter
                    ? "Replace everything with the built-in starter library? Undo with Cmd/Ctrl+Z."
                    : "Replace everything with an empty sentence bank and the default sections and blanks? Undo with Cmd/Ctrl+Z.",
                )
              )
                replace(libraryFor(discipline));
            }}
          >
            {current.hasStarter ? "Reset to starter library" : "Reset to an empty bank"}
          </button>
        </div>
      </section>
    </div>
  );
}

function OrderedList({
  items,
  kind,
  onRename,
  onMove,
  onDelete,
}: {
  items: { id: string; label: string }[];
  kind: string;
  onRename: (id: string, v: string) => void;
  onMove: (id: string, delta: number) => void;
  onDelete: (id: string, label: string) => void;
}) {
  return (
    <ol className="ordered-list">
      {items.map((it, i) => (
        <li key={it.id} className="ordered-row">
          <InlineEdit value={it.label} label={`${kind} ${it.label}`} onSave={(v) => onRename(it.id, v)} />
          <span className="actions always">
            <button type="button" className="btn btn-xs" title="Move up" disabled={i === 0} onClick={() => onMove(it.id, -1)}>↑</button>
            <button type="button" className="btn btn-xs" title="Move down" disabled={i === items.length - 1} onClick={() => onMove(it.id, 1)}>↓</button>
            <button type="button" className="btn btn-xs btn-danger" title={`Delete ${kind}`} onClick={() => onDelete(it.id, it.label)}>✕</button>
          </span>
        </li>
      ))}
    </ol>
  );
}

function VariableCard({ v, used, onSave, onDelete }: { v: VariableDef; used: number; onSave: (v: VariableDef) => void; onDelete: () => void }) {
  const [label, setLabel] = useState(v.label);
  const [presets, setPresets] = useState(v.presets.join("\n"));
  const [free, setFree] = useState(v.allowFreeText);
  const dirty = label !== v.label || presets !== v.presets.join("\n") || free !== v.allowFreeText;
  const save = () => onSave({ name: v.name, label: label.trim() || v.name, presets: presets.split("\n"), allowFreeText: free });
  return (
    <div className={`var-card ${dirty ? "dirty" : ""}`}>
      <div className="row gap between">
        <code className="var-name">{"{{" + v.name + "}}"}</code>
        <span className="hint">{used ? `used in ${used}` : "unused"}</span>
      </div>
      <label className="field">
        <span className="field-label">Label</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => dirty && save()} />
      </label>
      <label className="field">
        <span className="field-label">Presets (one per line)</span>
        <textarea rows={4} value={presets} onChange={(e) => setPresets(e.target.value)} onBlur={() => dirty && save()} />
      </label>
      <div className="row gap between">
        <label className="check">
          <input type="checkbox" checked={free} onChange={(e) => { setFree(e.target.checked); onSave({ name: v.name, label, presets: presets.split("\n"), allowFreeText: e.target.checked }); }} /> allow free text
        </label>
        <button type="button" className="btn btn-xs btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
