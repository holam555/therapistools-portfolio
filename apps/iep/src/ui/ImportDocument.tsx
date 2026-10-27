import { useRef, useState } from "react";
import { scanText } from "../model/privacy";
import { itemsFromText, readDocx, type DocItem } from "../report/docx-read";
import { draftFromItems, packFromDraft, type Draft, type DraftSection } from "../report/import-doc";
import { templateWords } from "../report/privacy-words";
import { sectionText } from "../report/render";
import type { TemplatePack } from "../report/pack";
import { packSections } from "../report/pack";
import { defaultSetup } from "../report/setup";
import { useApp } from "./state";

/**
 * Build a template from the writer's own document: a Word file or pasted
 * text goes through plain rules (no AI, nothing sent anywhere), then the
 * writer checks what was found before it becomes their template.
 */
export function ImportDocument({ disciplineLabel, onDone, onCancel }: { disciplineLabel: string; onDone: (pack: TemplatePack) => void; onCancel: () => void }) {
  const { lib } = useApp();
  const [text, setText] = useState("");
  const [finished, setFinished] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [items, setItems] = useState<DocItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      setError(file.name.toLowerCase().endsWith(".pdf") ? "PDFs can't be read here. Open it in Word and save as .docx, or paste the text below." : "Choose a Word file (.docx), or paste the text below.");
      return;
    }
    try {
      setItems(await readDocx(await file.arrayBuffer()));
      setFileName(file.name);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const read = () => {
    const source = items ?? (text.trim() ? itemsFromText(text) : null);
    if (!source) return;
    const d = draftFromItems(source, { finishedReport: finished, studentName: finished ? studentName : undefined });
    setStudentName("");
    if (!d.sections.length) {
      setError("Nothing usable was found. Check that the document has headings and paragraphs.");
      return;
    }
    setDraft(d);
  };

  if (!draft)
    return (
      <section className="card report-empty">
        <h2>Build a template from your own document</h2>
        <p className="hint">
          Upload your district's report template or one of your own finished reports as a Word file, or paste its text. Headings become sections,
          rating tables become checklists, highlighted or bracketed text becomes blanks, and instructions become hints. Names, dates of birth,
          addresses and other identifying lines are left out. It all happens in this browser; the file is not sent anywhere.
        </p>
        <div className="import-source">
          <label className="field">
            <span className="field-label">Word file (.docx)</span>
            <input ref={fileRef} type="file" accept=".docx" onChange={(e) => onFile(e.target.files?.[0])} />
            {fileName && <span className="hint">Read “{fileName}”: {items?.length ?? 0} paragraphs and tables.</span>}
          </label>
          <label className="field">
            <span className="field-label">Or paste the text</span>
            <textarea rows={8} value={text} onChange={(e) => { setText(e.target.value); setItems(null); setFileName(null); }} placeholder="Paste a report or template here. Keep the headings on their own lines; table rows pasted from Word keep their tabs." />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} /> This is a finished report, not a blank form
        </label>
        {finished && (
          <>
            <p className="hint">
              A finished report's sentences become sample sentences, and the scores, ages and dates in them become blanks. If the student's name
              appears in it, type it here so it can be swapped for [STUDENT]. The name is used once and never saved.
            </p>
            <label className="field">
              <span className="field-label">Student's name as written in the report (optional)</span>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} autoComplete="off" />
            </label>
          </>
        )}
        {error && <div className="notice">{error}</div>}
        <div className="row gap modal-actions">
          <button type="button" className="btn btn-primary" onClick={read} disabled={!items && !text.trim()}>
            Read the document
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Back
          </button>
        </div>
      </section>
    );

  return <ReviewDraft draft={draft} setDraft={setDraft} disciplineLabel={disciplineLabel} open={open} setOpen={setOpen} onDone={onDone} onBack={() => setDraft(null)} allow={lib.neverAllow} />;
}

const ROLE_LABEL: Record<DraftSection["role"], string> = {
  before: "Before the assessments",
  assessment: "An assessment",
  part: "Part of the assessment above",
  after: "After the assessments",
  out: "Leave out",
};

function ReviewDraft({
  draft,
  setDraft,
  disciplineLabel,
  open,
  setOpen,
  onDone,
  onBack,
  allow,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  disciplineLabel: string;
  open: string | null;
  setOpen: (id: string | null) => void;
  onDone: (pack: TemplatePack) => void;
  onBack: () => void;
  allow: string[];
}) {
  const pack = packFromDraft(draft, disciplineLabel);
  const preview = packSections(pack, { ...defaultSetup(), assessments: {} });
  const previewText = (id: string) => {
    const s = preview.find((x) => x.id === id);
    return s ? sectionText(s, "he") : "";
  };
  // Two or more capitalised words together that neither the template nor the document's own headings and labels use: probably a name to fix in Edit template.
  const known = new Set(templateWords());
  for (const s of draft.sections) {
    const own = [s.title, ...s.blocks.map((b) => (b.kind === "subheading" ? b.text : "label" in b ? (b.label ?? "") : ""))];
    for (const t of own) for (const w of t.match(/[A-Z][A-Za-z'’-]*/g) ?? []) known.add(w);
  }
  const names = new Set<string>();
  for (const s of preview)
    for (const w of scanText(sectionText(s, "he"), { neverAllow: allow, allow: known })) if (w.kind === "name" && w.text.includes(" ")) names.add(w.text);
  const patch = (id: string, p: Partial<DraftSection>) => setDraft({ ...draft, sections: draft.sections.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const counts = {
    sections: draft.sections.filter((s) => s.role !== "out").length,
    assessments: draft.sections.filter((s) => s.role === "assessment").length,
    grids: draft.sections.filter((s) => s.grid && s.role !== "out").length,
    blanks: preview.reduce((n, s) => n + (sectionText(s, "he").match(/\[\[/g) ?? []).length, 0),
  };
  const leftOut = draft.notes.filter((n) => n.kind === "left-out").map((n) => n.text);

  return (
    <section className="card report-empty">
      <h2>Check what was found</h2>
      <p className="hint">
        {counts.sections} sections, {counts.assessments} assessments, {counts.grids} rating tables and {counts.blanks} blanks. Choose what each section
        is, rename or leave out what's wrong, then use the template. Everything else can be fixed later in Edit template.
      </p>
      {leftOut.length > 0 && (
        <p className="hint">
          <strong>Left out on purpose:</strong> {leftOut.join(", ")}. The tool never holds a student's details; fill those in Word.
        </p>
      )}
      {names.size > 0 && (
        <div className="bp-warn">
          These look like names and should come out in Edit template: {[...names].slice(0, 6).join(", ")}
          {names.size > 6 ? "…" : ""}
        </div>
      )}
      <ol className="draft-list">
        {draft.sections.map((s) => (
          <li key={s.id} className={`draft-row ${s.role === "out" ? "out" : ""}`}>
            <div className="draft-main">
              <input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} aria-label="Section title" />
              <select value={s.role} onChange={(e) => patch(s.id, { role: e.target.value as DraftSection["role"] })} aria-label={`Role of ${s.title}`}>
                {(Object.keys(ROLE_LABEL) as DraftSection["role"][]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <div className="hint draft-meta">
              {s.blocks.filter((b) => b.kind !== "grid").length} paragraphs
              {s.grid && ` · rating table: ${s.grid.groups.reduce((n, g) => n + g.rows.length, 0)} items × ${s.grid.levels.map((l) => l.label).join(" / ")}`}
              {s.notesHint && ` · hint: ${s.notesHint.slice(0, 60)}${s.notesHint.length > 60 ? "…" : ""}`}
              {" · "}
              <button type="button" className="link" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "hide" : "show"}</button>
            </div>
            {open === s.id && <pre className="draft-preview">{previewText(s.id) || "(nothing, or not shown for this role)"}</pre>}
          </li>
        ))}
      </ol>
      {draft.notes.some((n) => n.kind !== "left-out") && (
        <details className="rating-panel draft-notes">
          <summary>What the reader did</summary>
          <ul className="hint">
            {draft.notes.filter((n) => n.kind !== "left-out").map((n, i) => (
              <li key={i}>{n.text}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="row gap modal-actions">
        <button type="button" className="btn btn-primary" onClick={() => onDone(pack)} disabled={!counts.sections}>
          Use this template
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
