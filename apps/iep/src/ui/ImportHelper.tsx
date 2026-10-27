import { useMemo, useState } from "react";
import type { Id } from "../model/types";
import { addSentence, ensureTask, findVariable, upsertVariable } from "../model/library";
import { newId } from "../model/ids";
import { convertPronouns, splitIntoRows, type HeadingLevel, type ImportRow } from "../model/splitter";
import { TokenText } from "./TokenText";
import { useApp } from "./state";

interface Row extends ImportRow {
  include: boolean;
  /** User overrides; empty string means "use the suggestion". */
  domainOverride: string;
  taskOverride: string;
  sectionId: string;
}

interface Placed extends Row {
  domain: string;
  task: string;
}

/** Walk rows in order so headings (and their chosen level) cascade down. */
function place(rows: Row[]): Placed[] {
  let domain = "";
  let task = "";
  return rows.map((r) => {
    if (r.kind === "heading") {
      if (r.headingLevel === "domain") {
        domain = r.text;
        task = "";
      } else if (r.headingLevel === "task") task = r.text;
      return { ...r, domain, task };
    }
    if (r.labelTask) task = r.labelTask;
    return { ...r, domain: r.domainOverride || domain, task: r.taskOverride || task };
  });
}

export function ImportHelper({ onDone }: { onDone: () => void }) {
  const { lib, replace } = useApp();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [defaultSection, setDefaultSection] = useState<string>(lib.sections[0]?.id ?? "");
  const [bandIds, setBandIds] = useState<Id[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const placed = useMemo(() => (rows ? place(rows) : []), [rows]);
  const importable = placed.filter((r) => r.kind !== "heading" && r.include && r.text.trim());
  const unplaced = importable.filter((r) => !r.domain.trim() || !r.task.trim());

  const split = () => {
    const base = splitIntoRows(text, lib.domains.map((d) => d.name));
    setRows(base.map((r) => ({ ...r, include: r.kind !== "heading", domainOverride: "", taskOverride: "", sectionId: defaultSection })));
    setSummary(null);
  };

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => (rs ? rs.map((r) => (r.id === id ? { ...r, ...p } : r)) : rs));

  const convertAllPronouns = () =>
    setRows((rs) => (rs ? rs.map((r) => (r.kind === "heading" ? r : { ...r, text: convertPronouns(r.text).text })) : rs));

  const applySectionToAll = () => setRows((rs) => (rs ? rs.map((r) => ({ ...r, sectionId: defaultSection })) : rs));
  const setAllInclude = (include: boolean, kind?: Row["kind"]) =>
    setRows((rs) => (rs ? rs.map((r) => (r.kind === "heading" || (kind && r.kind !== kind) ? r : { ...r, include })) : rs));

  const doImport = () => {
    if (importable.length === 0) return;
    // Build the new library synchronously so the summary is accurate.
    let l = lib;
    let added = 0;
    const newVars = new Set<string>();
    for (const r of importable) {
      const domain = r.domain.trim() || "Unsorted";
      const task = r.task.trim() || "Unsorted";
      const e = ensureTask(l, domain, task);
      l = addSentence(e.lib, e.taskId, {
        id: newId("s"),
        text: r.text.trim(),
        sectionId: r.sectionId || null,
        gradeBandIds: [...bandIds],
        tags: [],
        notes: "",
      });
      added++;
      for (const v of r.suggestedVariables) {
        if (!findVariable(l, v)) {
          l = upsertVariable(l, { name: v, label: v.replace(/_/g, " "), presets: [], allowFreeText: true });
          newVars.add(v);
        }
      }
    }
    replace(l);
    setSummary(`Added ${added} sentence${added === 1 ? "" : "s"} to the library${newVars.size ? ` and created ${[...newVars].join(", ")} as variables` : ""}.`);
    setRows(null);
    setText("");
  };

  const domainNames = [...new Set([...lib.domains.map((d) => d.name), ...placed.map((r) => r.domain).filter(Boolean)])];
  const taskNames = [...new Set([...lib.domains.flatMap((d) => d.tasks.map((t) => t.name)), ...placed.map((r) => r.task).filter(Boolean)])];

  return (
    <div className="import">
      <h2 className="panel-title">Import from your existing template</h2>
      <p className="hint">
        Paste a chunk of a report or template. The tool splits it into sentences, turns <code>XX</code> into <code>{"{{student}}"}</code>, and lets you tag
        each row with a domain, task and section. Headings and bullet labels become suggested domains and tasks. No AI is involved.
      </p>
      {summary && (
        <div className="notice notice-ok">
          {summary}{" "}
          <button type="button" className="link" onClick={onDone}>
            Open the library
          </button>
        </div>
      )}
      {!rows && (
        <>
          <textarea
            className="import-text"
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Fine motor:\n* Cutting – During cutting tasks, XX demonstrated functional bilateral coordination. She cut a complex shape (heart) without deviation.\n…"}
            aria-label="Template text to split"
          />
          <div className="row gap wrap">
            <label className="field-inline">
              Section for all rows
              <select value={defaultSection} onChange={(e) => setDefaultSection(e.target.value)}>
                <option value="">(no section)</option>
                {lib.sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-primary" onClick={split} disabled={!text.trim()}>
              Split into sentences
            </button>
          </div>
        </>
      )}

      {rows && (
        <>
          <div className="toolbar">
            <button type="button" className="btn btn-sm" onClick={convertAllPronouns} title="Replace he/she/him/his/her with pronoun tokens in every row">
              Convert pronouns to tokens
            </button>
            <label className="field-inline">
              Section
              <select value={defaultSection} onChange={(e) => setDefaultSection(e.target.value)}>
                <option value="">(no section)</option>
                {lib.sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button type="button" className="btn btn-sm" onClick={applySectionToAll}>Apply to all rows</button>
            </label>
            <span className="field-inline">
              Grade bands for all
              {lib.gradeBands.map((g) => (
                <label key={g.id} className="check">
                  <input
                    type="checkbox"
                    checked={bandIds.includes(g.id)}
                    onChange={() => setBandIds(bandIds.includes(g.id) ? bandIds.filter((b) => b !== g.id) : [...bandIds, g.id])}
                  />{" "}
                  {g.label}
                </label>
              ))}
            </span>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAllInclude(true)}>Check all</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAllInclude(false, "item")}>Uncheck list items</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRows(null)}>Start over</button>
          </div>

          <datalist id="import-domains">{domainNames.map((n) => <option key={n} value={n} />)}</datalist>
          <datalist id="import-tasks">{taskNames.map((n) => <option key={n} value={n} />)}</datalist>

          <table className="import-table">
            <thead>
              <tr>
                <th className="col-check"><span className="sr-only">Include</span></th>
                <th>Text</th>
                <th className="col-place">Domain</th>
                <th className="col-place">Task</th>
                <th className="col-section">Section</th>
              </tr>
            </thead>
            <tbody>
              {placed.map((r) =>
                r.kind === "heading" ? (
                  <tr key={r.id} className="import-heading">
                    <td />
                    <td>
                      <strong>{r.text}</strong>
                    </td>
                    <td colSpan={3}>
                      <label className="field-inline">
                        Use as
                        <select value={r.headingLevel} onChange={(e) => patch(r.id, { headingLevel: e.target.value as HeadingLevel })}>
                          <option value="domain">Domain heading</option>
                          <option value="task">Task heading</option>
                          <option value="ignore">Ignore</option>
                        </select>
                      </label>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className={`${r.include ? "" : "import-skipped"} ${r.kind === "item" ? "import-item" : ""}`}>
                    <td className="col-check">
                      <input type="checkbox" checked={r.include} onChange={(e) => patch(r.id, { include: e.target.checked })} aria-label="Include this row" />
                    </td>
                    <td>
                      <RowText row={r} onChange={(t) => patch(r.id, { text: t })} />
                      {r.kind === "item" && <span className="hint">list item</span>}
                    </td>
                    <td className="col-place">
                      <input list="import-domains" value={r.domainOverride || r.domain} onChange={(e) => patch(r.id, { domainOverride: e.target.value })} placeholder="Domain" aria-label="Domain" />
                    </td>
                    <td className="col-place">
                      <input list="import-tasks" value={r.taskOverride || r.task} onChange={(e) => patch(r.id, { taskOverride: e.target.value })} placeholder="Task" aria-label="Task" />
                    </td>
                    <td className="col-section">
                      <select value={r.sectionId} onChange={(e) => patch(r.id, { sectionId: e.target.value })} aria-label="Section">
                        <option value="">(none)</option>
                        {lib.sections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          <div className="row gap end sticky-foot">
            {unplaced.length > 0 && <span className="hint warn">{unplaced.length} checked row{unplaced.length === 1 ? " has" : "s have"} no domain or task and will go to “Unsorted”.</span>}
            <button type="button" className="btn btn-primary" onClick={doImport} disabled={importable.length === 0}>
              Add {importable.length} sentence{importable.length === 1 ? "" : "s"} to library
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RowText({ row, onChange }: { row: Placed; onChange: (t: string) => void }) {
  const { lib } = useApp();
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <div className="row-text">
        <TokenText text={row.text} lib={lib} />
        <span className="row-text-actions">
          <button type="button" className="btn btn-xs" onClick={() => setEditing(true)}>Edit</button>
          <button type="button" className="btn btn-xs" title="Replace he/she/his/her in this row with tokens" onClick={() => onChange(convertPronouns(row.text).text)}>Pronouns</button>
        </span>
      </div>
    );
  return (
    <textarea
      className="row-edit"
      rows={3}
      autoFocus
      value={row.text}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) setEditing(false);
      }}
      aria-label="Edit row text"
    />
  );
}
