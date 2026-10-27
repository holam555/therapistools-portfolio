import { useCallback, useState, type ReactNode } from "react";
import type { PronounSet } from "../model/types";
import { gridRatedCount, gridRows, ratingKey, type GridDef, type GridRatings } from "../report/grids";
import type { OptionList } from "../report/options";
import { renderSection, type Run } from "../report/render";
import { buildReportDocx, reportDocxBlob } from "../report/report-docx";
import { buildSectionPrompt, needsPrompt } from "../report/report-prompt";
import type { GradeGroup, ReportSection, ReportType, ReportValues } from "../report/types";
import { BlankPicker, type PickerTarget } from "./BlankPicker";
import { copyText, downloadBlob } from "./clipboard";
import { todayStamp } from "./common";
import { LIST_LABELS } from "./TemplateEditors";

/**
 * The output half of the Report tab, shared by the OT template and the packs
 * other disciplines build: the preview with clickable blanks, the Word
 * download, one AI prompt per section, and in edit mode the dropdown lists.
 * What edits do is up to the caller; this only says where the writer clicked.
 */

export interface OutputEdit {
  hasEdits: boolean;
  resetAll: () => void;
  /** What the banner says can be edited. */
  banner: ReactNode;
  onEditBlock: (sectionId: string, blockKey: string) => void;
  onEditTitle: (sectionId: string) => void;
  onEditGrid: (gridId: string) => void;
  onEditList: (name: string) => void;
  /** Extra controls after a section's title (hidden counts, move, remove, add). */
  sectionTools?: (s: ReportSection) => ReactNode;
  /** Extra controls after the last section (add a section). */
  afterSections?: ReactNode;
  listNames: string[];
  listEdited: (name: string) => boolean;
}

export function ReportOutput({
  title,
  sections,
  reportType,
  grade,
  pronoun,
  role,
  values,
  setValue,
  filledCount,
  anyRatings,
  clearFilled,
  lists,
  editMode,
  setEditMode,
  edit,
  flash,
  say,
}: {
  title: string;
  sections: ReportSection[];
  reportType: ReportType;
  grade: GradeGroup;
  pronoun: PronounSet;
  role: string;
  values: ReportValues;
  setValue: (key: string, v: string) => void;
  filledCount: number;
  anyRatings: boolean;
  clearFilled: () => void;
  /** Choices for a dropdown blank. */
  lists: (name: string) => OptionList | undefined;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  edit: OutputEdit;
  flash: string | null;
  say: (m: string) => void;
}) {
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const closePicker = useCallback(() => setPicker(null), []);
  const promptSections = sections.filter((s) => needsPrompt(s, pronoun, values));

  const download = async () => {
    setBusy(true);
    try {
      const doc = buildReportDocx(title, sections, pronoun, values);
      downloadBlob(`IEP-${reportType === "evaluation" ? "evaluation" : "annual-review"}-draft-${todayStamp()}.docx`, await reportDocxBlob(doc));
      say("Word draft saved to your Downloads folder.");
    } catch (e) {
      say(e instanceof Error ? `Could not build the Word draft: ${e.message}` : "Could not build the Word draft.");
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async (s: ReportSection) => {
    const ok = await copyText(buildSectionPrompt(s, { role, reportType, grade, pronoun }, values));
    say(ok ? `Copied the prompt for “${s.title}”. Paste it into Gemini and add your notes.` : "Could not copy. Try again.");
  };

  const openPicker = (run: Run, examples: string[] | undefined, el: HTMLElement) => {
    const info = run.blank ?? run.filled;
    if (!info) return;
    setPicker({ info, current: run.filled ? run.text : "", examples, rect: el.getBoundingClientRect() });
  };

  return (
    <div className="report-out">
      <section className="card">
        <div className="row gap between wrap">
          <h2>2. Fill the blanks, download Word</h2>
          <span className="row gap">
            <button type="button" className={`btn btn-sm ${editMode ? "btn-accent" : ""}`} aria-pressed={editMode} onClick={() => setEditMode(!editMode)}>
              {editMode ? "Done editing" : "Edit template"}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearFilled} disabled={!filledCount && !anyRatings}>
              Clear filled blanks
            </button>
            <button type="button" className="btn btn-primary" onClick={download} disabled={busy || sections.length === 0}>
              {busy ? "Building…" : "Download Word draft"}
            </button>
          </span>
        </div>
        <p className="hint">
          Click any <mark className="blank">yellow blank</mark> to pick from a list or from sentences in your own examples, or type your own. Filled
          blanks go into Word as plain text; the rest stay yellow. [STUDENT] appears once at the start of each section for you to replace with the name.
        </p>
        {flash && <div className="notice notice-ok" role="status">{flash}</div>}
        {editMode && (
          <div className="notice notice-info edit-banner">
            <strong>Edit mode.</strong> {edit.banner}{" "}
            {edit.hasEdits && (
              <button type="button" className="link" onClick={edit.resetAll}>Reset all template edits</button>
            )}
          </div>
        )}
        <div className={`doc-preview ${editMode ? "editing" : ""}`} aria-label="Preview">
          <h3 className="doc-title">{title}</h3>
          {sections.length === 0 && <p className="hint">Nothing to show yet: turn on Edit template and add a section or an assessment.</p>}
          {sections.map((s) => (
            <div key={s.id} className="doc-section">
              <h4>
                {editMode && (
                  <button type="button" className="edit-pencil" title="Rename this section" aria-label={`Rename section ${s.title}`} onClick={() => edit.onEditTitle(s.id)}>
                    ✎
                  </button>
                )}
                {s.title}
                {editMode && edit.sectionTools?.(s)}
              </h4>
              <PreviewBlocks
                section={s}
                pronoun={pronoun}
                values={values}
                onOpen={openPicker}
                onEdit={editMode ? (blockKey) => edit.onEditBlock(s.id, blockKey) : undefined}
                onEditGrid={editMode ? edit.onEditGrid : undefined}
              />
            </div>
          ))}
          {editMode && edit.afterSections}
        </div>
      </section>

      <section className="card">
        <h2>3. AI prompts, one section at a time</h2>
        <p className="hint">
          Copy one prompt, paste it into Gemini, then paste your rough notes for that section where it says so. Each prompt carries the section as you
          have filled it so far, plus examples from your own reports so the result matches your style. Paste the answer into your Word draft.
        </p>
        {promptSections.length === 0 && <p className="hint">Every blank is filled, so nothing needs a prompt.</p>}
        <ul className="prompt-list">
          {promptSections.map((s) => (
            <li key={s.id} className="prompt-card">
              <div>
                <strong>{s.title}</strong>
                <div className="hint">Notes to paste: {s.notesHint}</div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => copyPrompt(s)}>Copy prompt</button>
            </li>
          ))}
        </ul>
      </section>

      {editMode && (
        <section className="card">
          <h2>Dropdown lists</h2>
          <p className="hint">The choices that appear when you click a blank with a dropdown. Edit them to match your district.</p>
          <ul className="list-cards">
            {edit.listNames.map((name) => (
              <li key={name} className="prompt-card">
                <div>
                  <strong>{LIST_LABELS[name] ?? name}</strong> {edit.listEdited(name) && <span className="badge badge-tag">edited</span>}
                  <div className="hint">{(lists(name)?.options ?? []).slice(0, 4).join(", ")}…</div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => edit.onEditList(name)}>Edit</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {picker && (
        <BlankPicker
          target={picker}
          pronoun={pronoun}
          lists={lists}
          onChoose={(v) => setValue(picker.info.key, v)}
          onClose={closePicker}
          onEditList={(name) => {
            setPicker(null);
            edit.onEditList(name);
          }}
          onEditSamples={() => {
            const t = picker.info;
            setPicker(null);
            edit.onEditBlock(t.sectionId, t.blockKey);
          }}
        />
      )}
    </div>
  );
}

/** One assessment's ratings: a dropdown per item, grouped as on the form. */
export function RatingPanel({
  grid,
  edited,
  ratings,
  onChange,
  onEdit,
  hint,
}: {
  grid: GridDef;
  edited: boolean;
  ratings: GridRatings;
  onChange: (ratings: GridRatings) => void;
  /** Present in edit mode. */
  onEdit?: () => void;
  hint: string;
}) {
  const rated = gridRatedCount(grid, ratings);
  const total = gridRows(grid).length;
  const first = grid.levels[0];
  const set = (key: string, value: string) => {
    const next = { ...ratings };
    if (value) next[key] = value;
    else delete next[key];
    onChange(next);
  };
  return (
    <details className="rating-panel">
      <summary>
        {grid.title} <span className="hint">({rated} of {total} set)</span>
        {edited && <span className="badge badge-tag">edited</span>}
      </summary>
      {onEdit && (
        <p className="hint">
          <button type="button" className="link" onClick={onEdit}>Edit items and levels</button>
        </p>
      )}
      {grid.groups.map((g) => (
        <div key={g.id} className="rating-cat">
          {grid.layout === "byGroup" && (
            <div className="screen-group-head">
              <span>{g.label}</span>
              {first && (
                <span className="hint">
                  <button
                    type="button"
                    className="link"
                    onClick={() => onChange({ ...ratings, ...Object.fromEntries(g.rows.filter((r) => !ratings[ratingKey(g.id, r.id)]).map((r) => [ratingKey(g.id, r.id), first.value])) })}
                  >
                    rest are {first.label}
                  </button>
                </span>
              )}
            </div>
          )}
          <div className="rating-grid">
            {g.rows.map((r) => (
              <label key={r.id} className="rating-row">
                <span>{r.label}</span>
                <select value={ratings[ratingKey(g.id, r.id)] ?? ""} onChange={(e) => set(ratingKey(g.id, r.id), e.target.value)}>
                  <option value="">—</option>
                  {grid.levels.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ))}
      <p className="hint">{hint}</p>
    </details>
  );
}

function PreviewBlocks({
  section,
  pronoun,
  values,
  onOpen,
  onEdit,
  onEditGrid,
}: {
  section: ReportSection;
  pronoun: PronounSet;
  values: ReportValues;
  onOpen: (run: Run, examples: string[] | undefined, el: HTMLElement) => void;
  /** Present in edit mode. */
  onEdit?: (blockKey: string) => void;
  /** Present in edit mode: open the editor for the grid a generated line is written from. */
  onEditGrid?: (gridId: string) => void;
}) {
  const blocks = renderSection(section, pronoun, values);
  let n = 0;
  return (
    <>
      {blocks.map((b, i) => {
        const examples = b.examples ?? section.examples;
        const text = b.runs.map((r, j) =>
          r.blank || r.filled ? (
            // A span, not a button: buttons can't wrap inline with the sentence around them.
            <span
              key={j}
              role="button"
              tabIndex={0}
              className={r.blank ? "blank-btn" : "filled-btn"}
              title={r.blank ? "Click to fill" : "Click to change"}
              aria-label={r.blank ? `Fill in: ${r.blank.label}` : `${r.filled!.label}: ${r.text}. Change`}
              onClick={(e) => onOpen(r, examples, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(r, examples, e.currentTarget);
                }
              }}
            >
              {r.text}
            </span>
          ) : (
            <span key={j}>{r.text}</span>
          ),
        );
        const label = b.label ? <strong>{b.label}{b.kind === "bullet" ? " – " : ": "}</strong> : null;
        const src = section.blocks[i];
        const pencil =
          onEdit && !src.generated ? (
            <button type="button" className="edit-pencil" title="Edit this paragraph" aria-label={`Edit ${b.label ?? "paragraph"}`} onClick={() => onEdit(b.key)}>
              ✎
            </button>
          ) : onEditGrid && src.generated && src.grid ? (
            <button
              type="button"
              className="edit-pencil"
              title="Written from your ratings. Edit the items, levels and sentences"
              aria-label={`Edit items and levels for ${b.label ?? "this line"}`}
              onClick={() => onEditGrid(src.grid!)}
            >
              ✎
            </button>
          ) : null;
        if (b.kind === "subheading" || b.kind === "heading") return <p key={i} className="doc-sub">{pencil}{text}</p>;
        if (b.kind === "bullet") return <p key={i} className="doc-bullet">{pencil}• {label}{text}</p>;
        if (b.kind === "numbered") return <p key={i} className="doc-bullet">{pencil}{++n}. {text}</p>;
        return <p key={i} className="doc-para">{pencil}{label}{text}</p>;
      })}
    </>
  );
}
