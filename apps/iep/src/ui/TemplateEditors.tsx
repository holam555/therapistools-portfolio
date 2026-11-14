import { useRef, useState } from "react";
import { KIND_LABEL } from "../model/privacy";
import { scanReportText } from "../report/privacy-words";
import { OPTION_LISTS } from "../report/options";
import { cloneGrid, newGridId, sameGrid, type GridDef, type GridGroup, type GridLevel } from "../report/grids";
import type { PackAssessment, PackCondition } from "../report/pack";
import type { ReadyMadeAssessment } from "../report/premade/assessments";
import { fromEditable, toEditable } from "../report/render";
import { CONCERN_AREAS, GOAL_AREAS, GRADE_GROUPS, TEACHER_AREAS, type Block, type ConcernIn, type GoalArea, type ReportType, type ServiceType, type TeacherAreas } from "../report/types";
import { Modal, confirmAction } from "./common";
import { useApp } from "./state";

/** Friendly names for the dropdown lists, shown in the editors. */
export const LIST_LABELS: Record<string, string> = {
  handedness: "Handedness",
  grasp: "Grasp type",
  completedBy: "Who completed the form",
  delayFrequency: "Delay and how often",
  disability: "Disability category",
  minutes: "Service minutes",
  location: "Inside or outside the classroom",
  skillAreas: "Skill areas",
  supports: "Supports",
  accommodations: "Accommodations",
  concernAreas: "Areas of concern",
  month: "Month",
  year: "Year",
  objectivesMet: "Objectives to meet",
  objectivesTotal: "Total objectives",
  percent: "Percent of opportunities",
  dataDates: "Data collection dates",
  beeryDescriptor: "Beery descriptor",
  range: "Range, in lowercase",
  functionalOrConcern: "Functional or a concern",
};

function PrivacyNote({ texts }: { texts: string[] }) {
  const { lib } = useApp();
  const warnings = texts.flatMap((t) => (t.trim() ? scanReportText(t, lib) : []));
  if (!warnings.length) return null;
  return (
    <div className="bp-warn">
      This may include {warnings.slice(0, 4).map((w) => `${KIND_LABEL[w.kind].toLowerCase()} “${w.text}”`).join(", ")}. Templates are reused for every
      student, so keep names and other identifying details out.
    </div>
  );
}

function ExamplesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="ex-editor">
      {value.map((ex, i) => (
        <div key={i} className="ex-row">
          <textarea rows={3} value={ex} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Sample ${i + 1}`} />
          <button type="button" className="btn btn-xs btn-danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Delete sample ${i + 1}`}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...value, ""])}>
        + Add sample
      </button>
    </div>
  );
}

/** An assessment of the pack, for "only when this assessment is done" conditions. */
export interface AssessmentOption {
  id: string;
  label: string;
}

/**
 * When a section or paragraph appears: report type, result and grades up
 * front, the rest (services, teacher checklist areas, standards, assessments
 * done) under "More conditions". Nothing set means always.
 */
export function ConditionEditor({ value, onChange, assessments = [] }: { value: PackCondition | undefined; onChange: (c: PackCondition | undefined) => void; assessments?: AssessmentOption[] }) {
  const c: PackCondition = value ?? {};
  const set = (patch: Partial<PackCondition>) => {
    const next: PackCondition = { ...c, ...patch };
    for (const k of Object.keys(next) as (keyof PackCondition)[]) if (next[k] === undefined) delete next[k];
    onChange(Object.keys(next).length ? next : undefined);
  };
  const yesNo = (v: boolean | undefined) => (v === undefined ? "" : v ? "yes" : "no");
  const fromYesNo = (v: string) => (v === "" ? undefined : v === "yes");
  const setArea = (id: keyof TeacherAreas, v: string) => {
    const areas: Partial<TeacherAreas> = { ...(c.teacherAreas ?? {}) };
    if (v === "") delete areas[id];
    else areas[id] = v === "yes";
    set({ teacherAreas: Object.keys(areas).length ? areas : undefined });
  };
  const setConcern = (id: keyof ConcernIn, v: string) => {
    const areas: Partial<ConcernIn> = { ...(c.concernIn ?? {}) };
    if (v === "") delete areas[id];
    else areas[id] = v === "yes";
    set({ concernIn: Object.keys(areas).length ? areas : undefined });
  };
  const setAssessment = (id: string, v: string) => {
    const on: Record<string, boolean> = { ...(c.assessments ?? {}) };
    if (v === "") delete on[id];
    else on[id] = v === "yes";
    set({ assessments: Object.keys(on).length ? on : undefined });
  };
  const more = c.concernIn !== undefined || c.serviceType !== undefined || c.teacherAreas !== undefined || c.anyTeacherArea !== undefined || c.goalArea !== undefined || c.assessments !== undefined;
  return (
    <>
      <div className="grid2">
        <label className="field">
          <span className="field-label">In which report</span>
          <select value={c.reportType ?? ""} onChange={(e) => set({ reportType: (e.target.value || undefined) as ReportType | undefined })}>
            <option value="">Both</option>
            <option value="evaluation">Evaluation only</option>
            <option value="annual">Annual review only</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">With which result</span>
          <select value={yesNo(c.concerns)} onChange={(e) => set({ concerns: fromYesNo(e.target.value) })}>
            <option value="">Either</option>
            <option value="yes">Concerns found / qualifies</option>
            <option value="no">No concerns / does not qualify</option>
          </select>
        </label>
      </div>
      <div className="field">
        <span className="field-label">Only for these grades (none ticked means all)</span>
        <span className="row gap wrap">
          {GRADE_GROUPS.map((g) => (
            <label key={g.id} className="check">
              <input
                type="checkbox"
                checked={c.grades?.includes(g.id) ?? false}
                onChange={(e) => {
                  const grades = e.target.checked ? [...(c.grades ?? []), g.id] : (c.grades ?? []).filter((x) => x !== g.id);
                  set({ grades: grades.length ? grades : undefined });
                }}
              />{" "}
              {g.label}
            </label>
          ))}
        </span>
      </div>
      <details className="cond-more" open={more}>
        <summary>More conditions: areas of concern, services, teacher checklist areas, standards, assessments done</summary>
        <span className="field-label">Areas of concern (the ticks under Result)</span>
        <div className="cond-row">
          {CONCERN_AREAS.map((a) => (
            <label key={a.id}>
              {a.label}
              <select value={yesNo(c.concernIn?.[a.id])} onChange={(e) => setConcern(a.id, e.target.value)}>
                <option value="">Either</option>
                <option value="yes">A concern</option>
                <option value="no">Not a concern</option>
              </select>
            </label>
          ))}
        </div>
        <div className="cond-row">
          <label>
            Services
            <select value={c.serviceType ?? ""} onChange={(e) => set({ serviceType: (e.target.value || undefined) as ServiceType | undefined })}>
              <option value="">Either</option>
              <option value="direct">Direct only</option>
              <option value="indirect">Indirect only</option>
            </select>
          </label>
          <label>
            Standard chosen under the goal
            <select value={c.goalArea ?? ""} onChange={(e) => set({ goalArea: (e.target.value || undefined) as GoalArea | undefined })}>
              <option value="">Any</option>
              {GOAL_AREAS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </label>
        </div>
        <span className="field-label">Teacher checklist areas (the “Concerns in” ticks)</span>
        <div className="cond-row">
          {TEACHER_AREAS.map((t) => (
            <label key={t.id}>
              {t.label}
              <select value={yesNo(c.teacherAreas?.[t.id])} onChange={(e) => setArea(t.id, e.target.value)}>
                <option value="">Either</option>
                <option value="yes">Ticked</option>
                <option value="no">Not ticked</option>
              </select>
            </label>
          ))}
          <label>
            At least one area
            <select value={yesNo(c.anyTeacherArea)} onChange={(e) => set({ anyTeacherArea: fromYesNo(e.target.value) })}>
              <option value="">Either</option>
              <option value="yes">Ticked</option>
              <option value="no">None ticked</option>
            </select>
          </label>
        </div>
        {assessments.length > 0 && (
          <>
            <span className="field-label">Assessments done (the “What did you do?” ticks)</span>
            <div className="cond-row">
              {assessments.map((a) => (
                <label key={a.id}>
                  {a.label}
                  <select value={yesNo(c.assessments?.[a.id])} onChange={(e) => setAssessment(a.id, e.target.value)}>
                    <option value="">Either</option>
                    <option value="yes">Done</option>
                    <option value="no">Not done</option>
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
      </details>
    </>
  );
}

/** What an edit to one paragraph changes; a field left out is unchanged. */
export interface BlockEdit {
  text?: string;
  label?: string;
  examples?: string[];
  hidden?: boolean;
  /** When the paragraph appears; null clears the condition. */
  when?: PackCondition | null;
  /** A tick box under its assessment. */
  optional?: boolean;
}

/**
 * Edit one paragraph of the template. The writer sees plain text with he/him/his
 * and [STUDENT]; it is turned back into template marks on save, so the
 * sentence still switches to she/her.
 */
export function EditBlockModal({
  sectionTitle,
  original,
  current,
  override,
  examplesFromSection,
  sectionExamples,
  listNames = Object.keys(OPTION_LISTS),
  hideLabel = "Hide this paragraph",
  when,
  optional,
  inAssessment = false,
  assessments,
  onSave,
  onSaveSectionExamples,
  onReset,
  onClose,
}: {
  sectionTitle: string;
  /** The block as the built-in template has it. */
  original: Block;
  /** The block with the writer's edits applied. */
  current: Block;
  override?: BlockEdit;
  /** True when this block shares its section's sample sentences. */
  examplesFromSection: boolean;
  sectionExamples: string[];
  /** Dropdown lists a blank can use. */
  listNames?: string[];
  /** What the hide button says (a pack deletes the paragraph instead). */
  hideLabel?: string;
  /** The paragraph's own condition, editable when given (packs). */
  when?: PackCondition;
  /** Whether it is a tick box under its assessment. */
  optional?: boolean;
  /** Tick boxes only make sense inside an assessment. */
  inAssessment?: boolean;
  /** The pack's assessments, for conditions; absent means conditions cannot be edited here. */
  assessments?: AssessmentOption[];
  onSave: (o: BlockEdit) => void;
  onSaveSectionExamples: (ex: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const hasLabel = "label" in current && current.label !== undefined;
  const [label, setLabel] = useState(hasLabel ? ((current as { label?: string }).label ?? "") : "");
  // A generated line is edited as its pattern; the app fills each {slot} in afterwards.
  const wordingOf = (b: Block) => b.pattern ?? b.text;
  const slots = Object.keys(current.slots ?? {});
  const [text, setText] = useState(toEditable(wordingOf(current)));
  const [examples, setExamples] = useState<string[]>(examplesFromSection ? sectionExamples : (current.examples ?? []));
  const [blankLabel, setBlankLabel] = useState("");
  const [blankList, setBlankList] = useState("");
  const [cond, setCond] = useState<PackCondition | undefined>(when);
  const [tick, setTick] = useState(!!optional);
  const area = useRef<HTMLTextAreaElement>(null);

  const insertBlank = () => {
    const name = blankLabel.trim().replace(/[[\]:]/g, "");
    if (!name) return;
    const token = `[[${name}${blankList ? `::${blankList}` : ""}]]`;
    const el = area.current;
    const at = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    setText(text.slice(0, at) + token + text.slice(end));
    setBlankLabel("");
    setBlankList("");
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    }, 0);
  };

  const save = () => {
    const next: BlockEdit = { ...(override ?? {}) };
    const newText = fromEditable(text.trim());
    if (newText === wordingOf(original) || toEditable(wordingOf(original)) === text.trim()) delete next.text;
    else next.text = newText;
    if (hasLabel) {
      const origLabel = (original as { label?: string }).label ?? "";
      if (label.trim() && label.trim() !== origLabel) next.label = label.trim();
      else delete next.label;
    }
    const cleaned = examples.map((e) => e.trim()).filter(Boolean);
    if (examplesFromSection) onSaveSectionExamples(cleaned);
    else if (JSON.stringify(cleaned) !== JSON.stringify(original.examples ?? [])) next.examples = cleaned;
    else delete next.examples;
    if (assessments) {
      next.when = cond ?? null;
      if (inAssessment) next.optional = tick;
    }
    onSave(next);
    onClose();
  };

  return (
    <Modal title={`Edit: ${sectionTitle}`} onClose={onClose} wide>
      {hasLabel && (
        <label className="field">
          <span className="field-label">Label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
      )}
      <label className="field">
        <span className="field-label">Wording</span>
        <textarea ref={area} rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <p className="hint">
        Write it the way it reads for a boy: he, him, his. It switches to she and her automatically. [STUDENT] marks where the name goes. Text in
        [[double brackets]] is a yellow blank; [[label::list]] gives that blank a dropdown.
      </p>
      {slots.length > 0 && (
        <p className="hint">
          The app fills in {slots.map((s, i) => (
            <span key={s}>
              {i > 0 ? " and " : ""}
              <code>{`{${s}}`}</code>
            </span>
          ))}{" "}
          from your choices and ratings. Keep {slots.length === 1 ? "it" : "them"} where you want that to appear.
        </p>
      )}
      <InsertBlank
        label={blankLabel}
        setLabel={setBlankLabel}
        list={blankList}
        setList={setBlankList}
        listNames={listNames}
        onInsert={insertBlank}
      />

      <h3 className="ex-title">Sample sentences</h3>
      <p className="hint">
        {examplesFromSection ? "Shared by the whole section. " : ""}They appear when you click a blank, and they go into the AI prompt so the result matches
        your tone.
      </p>
      <ExamplesEditor value={examples} onChange={setExamples} />
      <PrivacyNote texts={[text, ...examples]} />

      {assessments && (
        <>
          <h3 className="ex-title">When it appears</h3>
          <p className="hint">Leave everything as “Both”, “Either” and “Any” for a paragraph that is always in the report.</p>
          <ConditionEditor value={cond} onChange={setCond} assessments={assessments} />
          {inAssessment && (
            <label className="check">
              <input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} /> A tick box under this assessment on the “What did you do?” list: in the report only when ticked
            </label>
          )}
        </>
      )}

      <div className="row gap between wrap modal-actions">
        <span className="row gap">
          {override && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (confirmAction("Put this paragraph back to the original wording and samples?")) {
                  onReset();
                  onClose();
                }
              }}
            >
              Reset to original
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              onSave({ ...(override ?? {}), hidden: true });
              onClose();
            }}
          >
            {hideLabel}
          </button>
        </span>
        <span className="row gap">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!text.trim()}>
            Save
          </button>
        </span>
      </div>
    </Modal>
  );
}

function InsertBlank({
  label,
  setLabel,
  list,
  setList,
  listNames,
  onInsert,
}: {
  label: string;
  setLabel: (v: string) => void;
  list: string;
  setList: (v: string) => void;
  listNames: string[];
  onInsert: () => void;
}) {
  return (
    <div className="row gap wrap insert-blank">
      <span className="field-label">Insert a blank</span>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="what goes here, e.g. grasp type" aria-label="Blank label" />
      <select value={list} onChange={(e) => setList(e.target.value)} aria-label="Dropdown list">
        <option value="">no dropdown</option>
        {listNames.map((k) => (
          <option key={k} value={k}>
            {LIST_LABELS[k] ?? k}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-sm" onClick={onInsert} disabled={!label.trim()}>
        Insert at cursor
      </button>
    </div>
  );
}

/** Where a blank goes when inserted at the cursor of a textarea. */
function insertAtCursor(el: HTMLTextAreaElement | null, text: string, token: string): { text: string; at: number } {
  const at = el ? el.selectionStart : text.length;
  const end = el ? el.selectionEnd : text.length;
  return { text: text.slice(0, at) + token + text.slice(end), at: at + token.length };
}

/** Add a paragraph, bullet, subheading or numbered line to a pack section. */
export function AddBlockModal({
  sectionTitle,
  listNames,
  onAdd,
  onClose,
}: {
  sectionTitle: string;
  listNames: string[];
  onAdd: (block: { kind: Block["kind"]; label?: string; text: string; examples: string[] }) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Block["kind"]>("para");
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [blankLabel, setBlankLabel] = useState("");
  const [blankList, setBlankList] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const hasLabel = kind === "para" || kind === "bullet";
  const insertBlank = () => {
    const name = blankLabel.trim().replace(/[[\]:]/g, "");
    if (!name) return;
    const next = insertAtCursor(area.current, text, `[[${name}${blankList ? `::${blankList}` : ""}]]`);
    setText(next.text);
    setBlankLabel("");
    setBlankList("");
    setTimeout(() => {
      area.current?.focus();
      area.current?.setSelectionRange(next.at, next.at);
    }, 0);
  };
  return (
    <Modal title={`Add to: ${sectionTitle}`} onClose={onClose} wide>
      <div className="grid2">
        <label className="field">
          <span className="field-label">What is it</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Block["kind"])}>
            <option value="para">Paragraph</option>
            <option value="bullet">Bullet point</option>
            <option value="numbered">Numbered line</option>
            <option value="subheading">Subheading</option>
          </select>
        </label>
        {hasLabel && (
          <label className="field">
            <span className="field-label">Label in bold before it (optional)</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Fine Motor" />
          </label>
        )}
      </div>
      <label className="field">
        <span className="field-label">Wording</span>
        <textarea ref={area} rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </label>
      <p className="hint">
        Write it the way it reads for a boy: he, him, his. It switches to she and her automatically. [STUDENT] marks where the name goes. Text in
        [[double brackets]] is a yellow blank; [[label::list]] gives that blank a dropdown.
      </p>
      <InsertBlank label={blankLabel} setLabel={setBlankLabel} list={blankList} setList={setBlankList} listNames={listNames} onInsert={insertBlank} />
      <h3 className="ex-title">Sample sentences</h3>
      <p className="hint">They appear when you click a blank in this line, and they go into the AI prompt so the result matches your tone.</p>
      <ExamplesEditor value={examples} onChange={setExamples} />
      <PrivacyNote texts={[label, text, ...examples]} />
      <div className="row gap end modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            onAdd({ kind, ...(hasLabel && label.trim() ? { label: label.trim() } : {}), text: fromEditable(text.trim()), examples: examples.map((e) => e.trim()).filter(Boolean) });
            onClose();
          }}
        >
          Add
        </button>
      </div>
    </Modal>
  );
}

export interface SectionSettings {
  title: string;
  place: "before" | "after";
  when?: PackCondition;
  notesHint: string;
}

/** A pack section's title, where it goes, when it appears, and what notes its prompt asks for. */
export function SectionSettingsModal({
  initial,
  inAssessment,
  assessments,
  onSave,
  onDelete,
  onClose,
}: {
  /** Absent when adding a new section. */
  initial?: SectionSettings;
  /** Sections inside an assessment have no "before/after" place. */
  inAssessment: boolean;
  assessments?: AssessmentOption[];
  onSave: (s: SectionSettings) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [place, setPlace] = useState<"before" | "after">(initial?.place ?? "after");
  const [when, setWhen] = useState<PackCondition | undefined>(initial?.when);
  const [notesHint, setNotesHint] = useState(initial?.notesHint ?? "");
  const save = () => {
    onSave({ title: title.trim(), place, ...(when ? { when } : {}), notesHint: notesHint.trim() });
    onClose();
  };
  return (
    <Modal title={initial ? "Section settings" : "Add a section"} onClose={onClose}>
      <label className="field">
        <span className="field-label">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      {!inAssessment && (
        <label className="field">
          <span className="field-label">Where it goes</span>
          <select value={place} onChange={(e) => setPlace(e.target.value as "before" | "after")}>
            <option value="before">Before the assessments</option>
            <option value="after">After the assessments</option>
          </select>
        </label>
      )}
      <ConditionEditor value={when} onChange={setWhen} assessments={assessments} />
      <label className="field">
        <span className="field-label">Notes the AI prompt asks you to paste (optional; otherwise it names the section's blanks)</span>
        <input value={notesHint} onChange={(e) => setNotesHint(e.target.value)} placeholder="e.g. The scores and what you observed" />
      </label>
      <PrivacyNote texts={[title, notesHint]} />
      <div className="row gap between wrap modal-actions">
        <span>
          {onDelete && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (confirmAction(`Remove the section “${initial?.title}” and everything in it?`)) {
                  onDelete();
                  onClose();
                }
              }}
            >
              Remove this section
            </button>
          )}
        </span>
        <span className="row gap">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!title.trim()}>
            {initial ? "Save" : "Add section"}
          </button>
        </span>
      </div>
    </Modal>
  );
}

/** Add an assessment to a pack: a ready-made one, or a blank one with a name and whether it rates items on a grid. */
export function AddAssessmentModal({
  readyMade,
  onAddReadyMade,
  onAdd,
  onClose,
}: {
  readyMade: ReadyMadeAssessment[];
  onAddReadyMade: (a: PackAssessment) => void;
  onAdd: (label: string, grid: "" | GridDef["layout"]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [grid, setGrid] = useState<"" | GridDef["layout"]>("");
  return (
    <Modal title="Add an assessment" onClose={onClose} wide>
      {readyMade.length > 0 && (
        <>
          <h3 className="ex-title">Ready-made</h3>
          <p className="hint">Added as a copy you can change: its items, levels, sentences and paragraphs become yours.</p>
          <div className="start-choices">
            {readyMade.map((r) => (
              <button
                key={r.label}
                type="button"
                className="start-choice"
                onClick={() => {
                  onAddReadyMade(r.build());
                  onClose();
                }}
              >
                <strong>{r.label}</strong>
                <span className="hint">{r.hint}</span>
              </button>
            ))}
          </div>
          <h3 className="ex-title">Or start a blank one</h3>
        </>
      )}
      <label className="field">
        <span className="field-label">Name, as it appears on the “What did you do?” list</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Classroom observation" autoFocus />
      </label>
      <label className="field">
        <span className="field-label">How are the results recorded?</span>
        <select value={grid} onChange={(e) => setGrid(e.target.value as "" | GridDef["layout"])}>
          <option value="">In sentences: paragraphs with blanks, no rating table</option>
          <option value="byGroup">A checklist: each item gets a level, written up one paragraph per group of items</option>
          <option value="byLevel">A set of scales: each scale gets a result, written up one line per result</option>
        </select>
      </label>
      <ul className="hint-list">
        <li>
          A rating table has <strong>items</strong> (tasks, skills, subtests, scales) and <strong>levels</strong> (1–5, independent or needs help, typical or concern).
        </li>
        <li>
          A <strong>checklist</strong> writes a paragraph per group of items: “Independent with coat and shoes. Needs help with buttons.”
        </li>
        <li>
          A <strong>set of scales</strong> writes one line per result: “Concern: vision, touch.”
        </li>
        <li>You get one section with an opening paragraph. Add items, levels and paragraphs from the preview.</li>
      </ul>
      <PrivacyNote texts={[label]} />
      <div className="row gap end modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!label.trim()}
          onClick={() => {
            onAdd(label.trim(), grid);
            onClose();
          }}
        >
          Add assessment
        </button>
      </div>
    </Modal>
  );
}

/** Edit the choices in one dropdown list, one per line. */
export function ListEditorModal({
  name,
  options,
  edited,
  onSave,
  onReset,
  onClose,
}: {
  name: string;
  options: string[];
  edited: boolean;
  onSave: (opts: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(options.join("\n"));
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <Modal title={`Dropdown: ${LIST_LABELS[name] ?? name}`} onClose={onClose}>
      <label className="field">
        <span className="field-label">Choices, one per line, in the order they should appear</span>
        <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <PrivacyNote texts={lines} />
      <div className="row gap between wrap modal-actions">
        <span>
          {edited && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                onReset();
                onClose();
              }}
            >
              Reset to original
            </button>
          )}
        </span>
        <span className="row gap">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!lines.length}
            onClick={() => {
              onSave([...new Set(lines)]);
              onClose();
            }}
          >
            Save
          </button>
        </span>
      </div>
    </Modal>
  );
}

/** Rename a section of the report. */
export function TitleEditorModal({ original, current, onSave, onClose }: { original: string; current: string; onSave: (title: string | null) => void; onClose: () => void }) {
  const [title, setTitle] = useState(current);
  return (
    <Modal title="Section title" onClose={onClose}>
      <label className="field">
        <span className="field-label">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <PrivacyNote texts={[title]} />
      <div className="row gap between wrap modal-actions">
        <span>
          {current !== original && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                onSave(null);
                onClose();
              }}
            >
              Reset to original
            </button>
          )}
        </span>
        <span className="row gap">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!title.trim()}
            onClick={() => {
              onSave(title.trim() === original ? null : title.trim());
              onClose();
            }}
          >
            Save
          </button>
        </span>
      </div>
    </Modal>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Edit a rating grid: the items in each group, the levels, and the sentence
 * written for each level. Saved as one piece; "Reset to original" puts the
 * built-in grid back.
 */
export function GridEditorModal({
  original,
  current,
  onSave,
  onClose,
}: {
  /** The built-in grid. */
  original: GridDef;
  /** The grid with the writer's edits. */
  current: GridDef;
  /** Null puts the built-in grid back. */
  onSave: (grid: GridDef | null) => void;
  onClose: () => void;
}) {
  const [grid, setGrid] = useState<GridDef>(() => cloneGrid(current));
  const byGroup = grid.layout === "byGroup";
  const edited = !sameGrid(current, original);
  const allIds = () => grid.groups.flatMap((g) => [g.id, ...g.rows.map((r) => r.id)]);

  const setGroups = (groups: GridGroup[]) => setGrid({ ...grid, groups });
  const setLevels = (levels: GridLevel[]) => setGrid({ ...grid, levels });
  const patchGroup = (gi: number, p: Partial<GridGroup>) => setGroups(grid.groups.map((g, i) => (i === gi ? { ...g, ...p } : g)));
  const patchRow = (gi: number, ri: number, label: string) =>
    patchGroup(gi, { rows: grid.groups[gi].rows.map((r, i) => (i === ri ? { ...r, label } : r)) });

  const texts = [...grid.levels.flatMap((l) => [l.label, l.sentence]), ...grid.groups.flatMap((g) => [g.label, ...g.rows.map((r) => r.label)])];
  const complete =
    grid.levels.length > 0 &&
    grid.levels.every((l) => l.label.trim()) &&
    grid.groups.length > 0 &&
    grid.groups.every((g) => g.rows.length > 0 && g.rows.every((r) => r.label.trim()) && (!byGroup || g.label.trim()));

  const save = () => {
    const cleaned: GridDef = {
      ...grid,
      levels: grid.levels.map((l) => ({ ...l, label: l.label.trim(), sentence: l.sentence.trim() })),
      groups: grid.groups.map((g) => ({ ...g, label: g.label.trim(), rows: g.rows.map((r) => ({ ...r, label: r.label.trim() })) })),
    };
    onSave(sameGrid(cleaned, original) ? null : cleaned);
    onClose();
  };

  return (
    <Modal title={`Edit items and levels: ${grid.title}`} onClose={onClose} wide>
      <p className="hint">
        {byGroup
          ? "Each group becomes one paragraph in the report, written from the levels you choose. Rename anything, add or remove items, or change the sentence for a level."
          : "The report lists the items at each level on its own line. Rename anything, add or remove items, or change the level names."}
      </p>

      <h3 className="ex-title">{byGroup ? "Groups and items" : "Items"}</h3>
      <div className="grid-editor">
        {grid.groups.map((g, gi) => (
          <div key={g.id} className="grid-group">
            {byGroup && (
              <div className="grid-group-head">
                <input value={g.label} onChange={(e) => patchGroup(gi, { label: e.target.value })} placeholder="Group name" aria-label={`Group ${gi + 1} name`} />
                <span className="row gap">
                  <button type="button" className="btn btn-xs" onClick={() => setGroups(move(grid.groups, gi, gi - 1))} disabled={gi === 0} aria-label="Move group up">↑</button>
                  <button type="button" className="btn btn-xs" onClick={() => setGroups(move(grid.groups, gi, gi + 1))} disabled={gi === grid.groups.length - 1} aria-label="Move group down">↓</button>
                  <button
                    type="button"
                    className="btn btn-xs btn-danger"
                    onClick={() => {
                      if (confirmAction(`Remove the group “${g.label || "untitled"}” and its ${g.rows.length} items?`)) setGroups(grid.groups.filter((_, i) => i !== gi));
                    }}
                    aria-label={`Remove group ${g.label}`}
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
            {g.rows.map((r, ri) => (
              <div key={r.id} className="grid-row">
                <input value={r.label} onChange={(e) => patchRow(gi, ri, e.target.value)} placeholder="Item, as it reads in a sentence" aria-label={`Item ${ri + 1} in ${g.label}`} />
                <span className="row gap">
                  <button type="button" className="btn btn-xs" onClick={() => patchGroup(gi, { rows: move(g.rows, ri, ri - 1) })} disabled={ri === 0} aria-label="Move item up">↑</button>
                  <button type="button" className="btn btn-xs" onClick={() => patchGroup(gi, { rows: move(g.rows, ri, ri + 1) })} disabled={ri === g.rows.length - 1} aria-label="Move item down">↓</button>
                  <button type="button" className="btn btn-xs btn-danger" onClick={() => patchGroup(gi, { rows: g.rows.filter((_, i) => i !== ri) })} aria-label={`Remove item ${r.label}`}>✕</button>
                </span>
              </div>
            ))}
            <button type="button" className="link add-item" onClick={() => patchGroup(gi, { rows: [...g.rows, { id: newGridId("item", allIds()), label: "" }] })}>
              + add an item
            </button>
          </div>
        ))}
        {byGroup && (
          <button type="button" className="btn btn-sm" onClick={() => setGroups([...grid.groups, { id: newGridId("group", allIds()), label: "", rows: [{ id: newGridId("item", allIds()), label: "" }] }])}>
            + Add a group
          </button>
        )}
      </div>

      <h3 className="ex-title">Levels</h3>
      {byGroup && (
        <p className="hint">
          In a sentence, <code>{"{items}"}</code> is replaced by the items at that level, joined with commas and “and”; <code>{"{Items}"}</code> starts the
          sentence with a capital, and <code>{"{was}"}</code> becomes “was” or “were”. Leave a sentence empty to say nothing about that level.
        </p>
      )}
      <div className="grid-editor">
        {grid.levels.map((l, li) => (
          <div key={l.value} className="grid-level">
            <div className="grid-row">
              <input value={l.label} onChange={(e) => setLevels(grid.levels.map((x, i) => (i === li ? { ...x, label: e.target.value } : x)))} placeholder="Level name" aria-label={`Level ${li + 1} name`} />
              <span className="row gap">
                <button type="button" className="btn btn-xs" onClick={() => setLevels(move(grid.levels, li, li - 1))} disabled={li === 0} aria-label="Move level up">↑</button>
                <button type="button" className="btn btn-xs" onClick={() => setLevels(move(grid.levels, li, li + 1))} disabled={li === grid.levels.length - 1} aria-label="Move level down">↓</button>
                <button type="button" className="btn btn-xs btn-danger" onClick={() => setLevels(grid.levels.filter((_, i) => i !== li))} aria-label={`Remove level ${l.label}`}>✕</button>
              </span>
            </div>
            {byGroup && (
              <textarea
                rows={2}
                value={l.sentence}
                onChange={(e) => setLevels(grid.levels.map((x, i) => (i === li ? { ...x, sentence: e.target.value } : x)))}
                placeholder="Sentence for this level, with {items}"
                aria-label={`Sentence for level ${l.label}`}
              />
            )}
            {!byGroup && (
              <label className="check">
                <input type="checkbox" checked={!!l.concern} onChange={(e) => setLevels(grid.levels.map((x, i) => (i === li ? { ...x, concern: e.target.checked || undefined } : x)))} /> Counts as a
                concern in the summary
              </label>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setLevels([...grid.levels, { value: newGridId("level", grid.levels.map((l) => l.value)), label: "", sentence: byGroup ? "" : "{items}" }])}
        >
          + Add a level
        </button>
      </div>
      <PrivacyNote texts={texts} />

      <div className="row gap between wrap modal-actions">
        <span>
          {edited && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (confirmAction("Put this grid back to the original items, levels and sentences?")) {
                  onSave(null);
                  onClose();
                }
              }}
            >
              Reset to original
            </button>
          )}
        </span>
        <span className="row gap">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!complete}>
            Save
          </button>
        </span>
      </div>
    </Modal>
  );
}
