import { useEffect, useMemo, useState } from "react";
import { getDiscipline } from "../model/disciplines";
import type { GridDef } from "../report/grids";
import {
  assessmentOn, blankPack, conditionHolds, describeCondition, findSection, loadPack, moveInList, newPackId, optionalBlocks, packGrids, packSections, packUses, savePack, updateBlock, updateSection, withFreshIds,
  type PackAssessment, type PackBlock, type PackBlockExtras, type PackSection, type TemplatePack,
} from "../report/pack";
import type { PronounSet } from "../model/types";
import { premadePack } from "../report/premade";
import { readyMadeAssessments } from "../report/premade/assessments";
import { loadSetup, loadValues, saveSetup, saveValues } from "../report/setup";
import { GOAL_AREAS, GRADE_GROUPS, TEACHER_AREAS, type Block, type ReportSetup, type ReportValues } from "../report/types";
import { ImportDocument } from "./ImportDocument";
import { RatingPanel, ReportOutput } from "./ReportOutput";
import { AddAssessmentModal, AddBlockModal, EditBlockModal, GridEditorModal, ListEditorModal, SectionSettingsModal, TitleEditorModal, type BlockEdit } from "./TemplateEditors";
import { confirmAction } from "./common";
import { useApp } from "./state";


function useFlash(): [string | null, (m: string) => void] {
  const [flash, setFlash] = useState<string | null>(null);
  const say = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash((x) => (x === m ? null : x)), 2600);
  };
  return [flash, say];
}

/** Filled blank values, saved per discipline. */
function useValues(discipline: Parameters<typeof loadValues>[0]) {
  const [values, setValues] = useState<ReportValues>(() => loadValues(discipline));
  useEffect(() => saveValues(discipline, values), [discipline, values]);
  const setValue = (key: string, v: string) =>
    setValues((cur) => {
      const next = { ...cur };
      if (v.trim()) next[key] = v;
      else delete next[key];
      return next;
    });
  const filledCount = Object.values(values).filter((v) => v.trim()).length;
  return { values, setValues, setValue, filledCount };
}

/** A tick box's paragraph shows when its section's and its own conditions hold. */
const tickShown = (x: { section: PackSection; block: Block & { when?: PackSection["when"] } }, setup: ReportSetup) =>
  conditionHolds(x.section.when, setup) && conditionHolds(x.block.when, setup);

/**
 * The Report tab: choose what you did, fill blanks by clicking them, get a
 * Word draft with every fixed sentence already written, and one AI prompt per
 * section to finish the rest with your own notes. The template is a pack the
 * writer owns, started from the ready-made sample, their own document, or
 * blank; every edit changes the pack itself and is saved in this browser (and
 * in Settings → Backup).
 */
export function ReportBuilder() {
  const { discipline } = useApp();
  const current = getDiscipline(discipline);
  const [pack, setPack] = useState<TemplatePack | null>(() => loadPack(discipline));
  useEffect(() => savePack(discipline, pack), [discipline, pack]);
  // A new template starts with every tick box for the current grade ticked.
  const choose = (p: TemplatePack) => {
    const s = loadSetup(discipline);
    const ids = optionalBlocks(p).filter((x) => tickShown(x, s)).map((x) => x.block.id!);
    saveSetup(discipline, { ...s, screenItems: [...new Set([...s.screenItems, ...ids])] });
    setPack(p);
  };
  if (!pack) return <PackStart label={current.label} premade={() => premadePack(discipline)} onChoose={choose} />;
  return <PackEditor pack={pack} setPack={setPack} onDiscard={() => setPack(null)} />;
}

function PackStart({ label, premade, onChoose }: { label: string; premade: () => TemplatePack; onChoose: (p: TemplatePack) => void }) {
  const [importing, setImporting] = useState(false);
  if (importing) return <ImportDocument disciplineLabel={label} onDone={onChoose} onCancel={() => setImporting(false)} />;
  return (
    <section className="card report-empty">
      <h2>Start a report template for {label.toLowerCase()}</h2>
      <p className="hint">
        A template is the report with its fixed wording written in and yellow blanks where each student differs. It is saved only in this browser, and in
        Settings → Backup. You can change every word of it later.
      </p>
      <div className="start-choices">
        <button type="button" className="start-choice" onClick={() => setImporting(true)}>
          <strong>Build from my own document</strong>
          <span className="hint">Upload your district's report template or one of your own finished reports as a Word file, or paste its text, and get a draft template to correct.</span>
        </button>
        <button type="button" className="start-choice" onClick={() => onChoose(blankPack(label))}>
          <strong>Start blank</strong>
          <span className="hint">One summary section to begin with. Add your own sections and assessments.</span>
        </button>
        <button type="button" className="start-choice" onClick={() => onChoose(premade())}>
          <strong>Pre-made {label.toLowerCase()} template</strong>
          <span className="hint">A generic sample report for {label.toLowerCase()}: assessments, checklists, summary, next steps, services and a goal, with plain wording and fictional examples. Change any of it.</span>
        </button>
      </div>
    </section>
  );
}

function PackEditor({ pack, setPack, onDiscard }: { pack: TemplatePack; setPack: (p: TemplatePack) => void; onDiscard: () => void }) {
  const { discipline } = useApp();
  const current = getDiscipline(discipline);
  const [setup, setSetup] = useState<ReportSetup>(() => loadSetup(discipline));
  const { values, setValues, setValue, filledCount } = useValues(discipline);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<{ sectionId: string; blockId: string } | null>(null);
  const [addingBlock, setAddingBlock] = useState<string | null>(null);
  const [sectionSettings, setSectionSettings] = useState<string | "new" | null>(null);
  const [assessmentRename, setAssessmentRename] = useState<string | null>(null);
  const [addingAssessment, setAddingAssessment] = useState(false);
  const [listEditing, setListEditing] = useState<string | null>(null);
  const [gridEditing, setGridEditing] = useState<string | null>(null);
  const [flash, say] = useFlash();

  useEffect(() => saveSetup(discipline, setup), [discipline, setup]);
  const sections = useMemo(() => packSections(pack, setup), [pack, setup]);
  // Edit mode shows every paragraph, with the ones this setup leaves out marked, so each can still be edited.
  const editSections = useMemo(() => packSections(pack, setup, { showHidden: true }), [pack, setup]);
  const grids = packGrids(pack);
  const listNames = Object.keys(pack.lists);
  const assessmentOptions = pack.assessments.map((a) => ({ id: a.id, label: a.label }));
  const uses = useMemo(() => packUses(pack), [pack]);
  const optional = useMemo(() => optionalBlocks(pack), [pack]);

  const patch = (p: Partial<ReportSetup>) => setSetup((s) => ({ ...s, ...p }));
  /** Tick boxes under an assessment, for the current grade. */
  const itemsOf = (assessmentId: string, s: ReportSetup = setup) => optional.filter((x) => x.assessment.id === assessmentId && tickShown(x, s));
  const itemLabel = (b: Block) => ("label" in b && b.label) || b.text.replace(/\{\{\w+\}\}|\[\[.*?\]\]/g, "…").slice(0, 40);
  const toggleItem = (id: string) => patch({ screenItems: setup.screenItems.includes(id) ? setup.screenItems.filter((x) => x !== id) : [...setup.screenItems, id] });
  const setItems = (assessmentId: string, on: boolean) => {
    const ids = itemsOf(assessmentId).map((x) => x.block.id!);
    patch({ screenItems: on ? [...new Set([...setup.screenItems, ...ids])] : setup.screenItems.filter((x) => !ids.includes(x)) });
  };
  // A new grade starts with every tick box for that grade ticked.
  const onGrade = (grade: ReportSetup["grade"]) => {
    const next = { ...setup, grade };
    patch({ grade, screenItems: [...new Set([...setup.screenItems, ...optional.filter((x) => tickShown(x, next)).map((x) => x.block.id!)])] });
  };
  const anyRatings = Object.values(setup.ratings).some((r) => Object.keys(r).length > 0);
  const clearFilled = () => {
    if (!filledCount || confirmAction(`Clear the ${filledCount} blank${filledCount === 1 ? "" : "s"} you filled, ready for the next report?`)) {
      setValues({});
      setSetup((s) => ({ ...s, ratings: {} }));
    }
  };

  // ---------- pack edits ----------
  const setAssessments = (assessments: PackAssessment[]) => setPack({ ...pack, assessments });
  const addAssessment = (label: string, layout: "" | GridDef["layout"]) => {
    const id = newPackId(pack, "assessment");
    const sectionId = newPackId(pack, "section");
    const gridId = newPackId(pack, "grid");
    const grid: GridDef | undefined =
      layout === "byGroup"
        ? {
            id: gridId, title: "Rate each item", layout, blank: "[[ratings for this group]]",
            levels: [
              { value: "l1", label: "Independent", sentence: "The student is independent with {items}." },
              { value: "l2", label: "Needs help", sentence: "Help is needed for {items}." },
            ],
            groups: [{ id: "group1", label: "Items", rows: [{ id: "item1", label: "the first item" }] }],
          }
        : layout === "byLevel"
          ? {
              id: gridId, title: "Choose a level for each item", layout, blank: "[[items at this level, or none]]", none: "None", allClear: "within the typical range across all areas",
              levels: [
                { value: "l1", label: "Typical", sentence: "{items}" },
                { value: "l2", label: "Concern", sentence: "{items}", concern: true },
              ],
              groups: [{ id: "items", label: "Items", rows: [{ id: "item1", label: "the first item" }] }],
            }
          : undefined;
    const blocks: PackBlock[] = [{ kind: "para", id: "intro", text: `The ${label} was completed [[how and by whom]]. {{student}} [[what the results showed]].` }];
    if (grid) blocks.push({ kind: "grid", id: `grid-${gridId}`, grid: gridId });
    const section: PackSection = { id: sectionId, title: label, blocks, examples: [], notesHint: "The results and what you observed." };
    setAssessments([...pack.assessments, { id, label, sections: [section], ...(grid ? { grid } : {}) }]);
  };
  const addReadyMade = (a: PackAssessment) => {
    const copy = withFreshIds(pack, a);
    setAssessments([...pack.assessments, copy]);
    // Its tick boxes start ticked for the current grade, like a new template's.
    const ids = optionalBlocks({ ...pack, assessments: [copy] }).filter((x) => tickShown(x, setup)).map((x) => x.block.id!);
    if (ids.length) patch({ screenItems: [...new Set([...setup.screenItems, ...ids])] });
    say(`Added ${copy.label}. It is ticked under “What did you do?”; use ↑ to move it.`);
  };
  const removeAssessment = (a: PackAssessment) => {
    if (confirmAction(`Remove the assessment “${a.label}” and its ${a.sections.length} section${a.sections.length === 1 ? "" : "s"}?`)) setAssessments(pack.assessments.filter((x) => x.id !== a.id));
  };
  const setGrid = (gridId: string, grid: GridDef) => setAssessments(pack.assessments.map((a) => (a.grid?.id === gridId ? { ...a, grid } : a)));

  const applyBlockEdit = (sectionId: string, blockId: string, o: BlockEdit) =>
    setPack(
      updateBlock(pack, sectionId, blockId, (b) => {
        if (o.hidden) return null;
        if (b.kind === "grid") return b;
        const next = { ...b } as Block & PackBlockExtras & { label?: string };
        if (o.text !== undefined) next.text = o.text;
        if (o.label !== undefined) next.label = o.label;
        if (o.examples !== undefined) next.examples = o.examples;
        if (o.when !== undefined) {
          if (o.when) next.when = o.when;
          else delete next.when;
        }
        if (o.optional !== undefined) {
          if (o.optional) next.optional = true;
          else delete next.optional;
        }
        return next;
      }),
    );
  const addBlock = (sectionId: string, b: { kind: Block["kind"]; label?: string; text: string; examples: string[] }) => {
    const id = newPackId(pack, "p");
    const block = { kind: b.kind, id, text: b.text, ...(b.label ? { label: b.label } : {}), ...(b.examples.length ? { examples: b.examples } : {}) } as Block;
    setPack(updateSection(pack, sectionId, (s) => ({ ...s, blocks: [...s.blocks, block] })));
  };
  const moveSection = (sectionId: string, delta: number) => {
    const found = findSection(pack, sectionId);
    if (!found) return;
    if (found.assessment) setAssessments(pack.assessments.map((a) => (a === found.assessment ? { ...a, sections: moveInList(a.sections, sectionId, delta) } : a)));
    else {
      // Sections before and after the assessments are ordered among themselves.
      const place = found.section.place ?? "after";
      const same = pack.sections.filter((s) => (s.place ?? "after") === place);
      const moved = moveInList(same, sectionId, delta);
      let i = 0;
      setPack({ ...pack, sections: pack.sections.map((s) => ((s.place ?? "after") === place ? moved[i++] : s)) });
    }
  };
  const discard = () => {
    if (confirmAction("Delete this whole template and go back to the start choices? Filled blanks are cleared too.")) {
      setValues({});
      onDiscard();
    }
  };

  const editTarget = (() => {
    if (!editing) return null;
    const found = findSection(pack, editing.sectionId);
    const built = editSections.find((s) => s.id === editing.sectionId)?.blocks.find((b) => b.id === editing.blockId);
    const rawId = built?.sourceId ?? editing.blockId;
    const block = found?.section.blocks.find((b) => b.id === rawId);
    if (!found || !block || block.kind === "grid") return null;
    return { section: found.section, block, built: built ?? block, rawId };
  })();
  const settingsTarget = sectionSettings && sectionSettings !== "new" ? findSection(pack, sectionSettings) : null;

  return (
    <div className="report">
      <section className="card report-setup" aria-label="Report setup">
        <h2>1. Set up the report</h2>
        <SetupBasics setup={setup} patch={patch} onGrade={onGrade} />

        <h3>What did you do?</h3>
        {pack.assessments.length === 0 && <p className="hint">No assessments yet.{editMode ? "" : " Turn on Edit template to add some."}</p>}
        <ul className="assess-list">
          {pack.assessments.map((a, i) => (
            <li key={a.id}>
              <span className="screen-item-row">
                <label className="check">
                  <input type="checkbox" checked={assessmentOn(setup, a.id)} onChange={(e) => patch({ assessments: { ...setup.assessments, [a.id]: e.target.checked } })} />
                  {a.label}
                </label>
                {editMode && (
                  <span className="row gap">
                    <button type="button" className="btn btn-xs" onClick={() => setAssessmentRename(a.id)} aria-label={`Rename ${a.label}`}>✎</button>
                    <button type="button" className="btn btn-xs" disabled={i === 0} onClick={() => setAssessments(moveInList(pack.assessments, a.id, -1))} aria-label={`Move ${a.label} up`}>↑</button>
                    <button type="button" className="btn btn-xs" disabled={i === pack.assessments.length - 1} onClick={() => setAssessments(moveInList(pack.assessments, a.id, 1))} aria-label={`Move ${a.label} down`}>↓</button>
                    <button type="button" className="btn btn-xs btn-danger" onClick={() => removeAssessment(a)} aria-label={`Remove ${a.label}`}>✕</button>
                  </span>
                )}
              </span>
              {uses.teacherAreas.has(a.id) && assessmentOn(setup, a.id) && (
                <span className="row gap wrap teacher-areas">
                  <span className="hint">Concerns in:</span>
                  {TEACHER_AREAS.map((t) => (
                    <label key={t.id} className="check">
                      <input type="checkbox" checked={setup.teacherAreas[t.id]} onChange={(e) => patch({ teacherAreas: { ...setup.teacherAreas, [t.id]: e.target.checked } })} /> {t.label}
                    </label>
                  ))}
                </span>
              )}
              {assessmentOn(setup, a.id) && itemsOf(a.id).length > 0 && (
                <div className="screen-items">
                  <div className="screen-group">
                    <div className="screen-group-head">
                      <span>Items done</span>
                      <span className="hint">
                        <button type="button" className="link" onClick={() => setItems(a.id, true)}>all</button> ·{" "}
                        <button type="button" className="link" onClick={() => setItems(a.id, false)}>none</button>
                      </span>
                    </div>
                    {itemsOf(a.id).map((x) => (
                      <span key={x.block.id} className="screen-item-row">
                        <label className="check">
                          <input type="checkbox" checked={setup.screenItems.includes(x.block.id!)} onChange={() => toggleItem(x.block.id!)} /> {itemLabel(x.block)}
                        </label>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {a.grid && assessmentOn(setup, a.id) && (
                <RatingPanel
                  grid={a.grid}
                  edited={false}
                  ratings={setup.ratings[a.grid.id] ?? {}}
                  onChange={(r) => patch({ ratings: { ...setup.ratings, [a.grid!.id]: r } })}
                  onEdit={editMode ? () => setGridEditing(a.grid!.id) : undefined}
                  hint={a.grid.layout === "byGroup" ? "Each group's sentences are written from these levels." : "The lines fill in once every item is set."}
                />
              )}
            </li>
          ))}
        </ul>
        {setup.concerns && (uses.serviceType || uses.objectives || uses.goalAreas.length > 0) && (
          <>
            <h3>Services and goal</h3>
            {uses.serviceType && (
              <div className="setup-row">
                <span className="setup-label">Service</span>
                <span className="seg">
                  <button type="button" className={setup.serviceType === "direct" ? "on" : ""} onClick={() => patch({ serviceType: "direct" })}>Direct</button>
                  <button type="button" className={setup.serviceType === "indirect" ? "on" : ""} onClick={() => patch({ serviceType: "indirect" })}>Indirect</button>
                </span>
              </div>
            )}
            {uses.objectives && (
              <div className="setup-row">
                <span className="setup-label">Objectives</span>
                <span className="seg">
                  {[2, 3, 4].map((n) => (
                    <button key={n} type="button" className={setup.objectives === n ? "on" : ""} onClick={() => patch({ objectives: n })}>
                      {n}
                    </button>
                  ))}
                </span>
              </div>
            )}
            {uses.goalAreas.length > 0 && (
              <div className="setup-row">
                <span className="setup-label">Standards</span>
                <span className="row gap wrap">
                  {uses.goalAreas.map((g) => (
                    <label key={g} className="check">
                      <input
                        type="checkbox"
                        checked={setup.goalAreas.includes(g)}
                        onChange={(e) => patch({ goalAreas: e.target.checked ? [...setup.goalAreas, g] : setup.goalAreas.filter((x) => x !== g) })}
                      />{" "}
                      {GOAL_AREAS.find((x) => x.id === g)?.label ?? g}
                    </label>
                  ))}
                </span>
              </div>
            )}
          </>
        )}
        {editMode && (
          <p className="row gap wrap">
            <button type="button" className="btn btn-sm" onClick={() => setAddingAssessment(true)}>+ Add an assessment</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={discard}>Delete this template…</button>
          </p>
        )}
      </section>

      <ReportOutput
        title={pack.titles[setup.reportType]}
        sections={sections}
        previewSections={editMode ? editSections : undefined}
        reportType={setup.reportType}
        grade={setup.grade}
        pronoun={setup.pronoun}
        role={current.role}
        values={values}
        setValue={setValue}
        filledCount={filledCount}
        anyRatings={anyRatings}
        clearFilled={clearFilled}
        lists={(name) => pack.lists[name]}
        editMode={editMode}
        setEditMode={setEditMode}
        flash={flash}
        say={say}
        edit={{
          hasEdits: false,
          resetAll: () => {},
          banner: (
            <>
              This template is yours: click ✎ beside a paragraph to change its wording, blanks, sample sentences or when it appears, or to delete it;
              beside a title for the section's name, place and when it appears; beside a line written from ratings to change that assessment's items,
              levels and sentences. Paragraphs this report leaves out (an unticked tick box, or a condition such as “sensory not ticked”) are shown
              greyed with the reason, so you can still edit them. Use the buttons under each section to add paragraphs, and at the end to add sections.
              Everything is saved in this browser, in Settings → Backup, and in your account if you sign in.
            </>
          ),
          onEditBlock: (sectionId, blockId) => setEditing({ sectionId, blockId }),
          onEditTitle: setSectionSettings,
          onEditGrid: setGridEditing,
          onEditList: setListEditing,
          sectionTools: (s) => {
            const found = findSection(pack, s.id);
            if (!found) return null;
            const list = found.assessment ? found.assessment.sections : pack.sections.filter((x) => (x.place ?? "after") === (found.section.place ?? "after"));
            const i = list.findIndex((x) => x.id === s.id);
            const cond = describeCondition(found.section.when, pack);
            return (
              <span className="hint hidden-note section-tools">
                {" "}
                {found.assessment && <span className="badge badge-tag">{found.assessment.label}</span>}
                {cond && <span className="badge badge-tag">{cond}</span>}
                <button type="button" className="btn btn-xs" disabled={i <= 0} onClick={() => moveSection(s.id, -1)} aria-label={`Move section ${s.title} up`}>↑</button>
                <button type="button" className="btn btn-xs" disabled={i < 0 || i >= list.length - 1} onClick={() => moveSection(s.id, 1)} aria-label={`Move section ${s.title} down`}>↓</button>
                <button type="button" className="link" onClick={() => setAddingBlock(s.id)}>+ paragraph</button>
              </span>
            );
          },
          afterSections: (
            <p>
              <button type="button" className="btn btn-sm" onClick={() => setSectionSettings("new")}>+ Add a section</button>
            </p>
          ),
          listNames,
          listEdited: () => false,
        }}
      />

      {editTarget && editing && (
        <EditBlockModal
          sectionTitle={editTarget.section.title}
          original={editTarget.built}
          current={editTarget.built}
          examplesFromSection={!editTarget.block.examples}
          sectionExamples={editTarget.section.examples}
          listNames={listNames}
          hideLabel="Delete this paragraph"
          when={editTarget.block.when}
          optional={!!editTarget.block.optional}
          inAssessment={!!findSection(pack, editing.sectionId)?.assessment}
          assessments={assessmentOptions}
          onSave={(o) => applyBlockEdit(editing.sectionId, editTarget.rawId, o)}
          onSaveSectionExamples={(ex) => setPack(updateSection(pack, editing.sectionId, (s) => ({ ...s, examples: ex })))}
          onReset={() => {}}
          onClose={() => setEditing(null)}
        />
      )}
      {addingBlock && (
        <AddBlockModal
          sectionTitle={findSection(pack, addingBlock)?.section.title ?? ""}
          listNames={listNames}
          onAdd={(b) => addBlock(addingBlock, b)}
          onClose={() => setAddingBlock(null)}
        />
      )}
      {sectionSettings === "new" && (
        <SectionSettingsModal
          inAssessment={false}
          assessments={assessmentOptions}
          onSave={(s) => setPack({ ...pack, sections: [...pack.sections, { id: newPackId(pack, "section"), title: s.title, place: s.place, ...(s.when ? { when: s.when } : {}), ...(s.notesHint ? { notesHint: s.notesHint } : {}), blocks: [], examples: [] }] })}
          onClose={() => setSectionSettings(null)}
        />
      )}
      {settingsTarget && sectionSettings && (
        <SectionSettingsModal
          initial={{ title: settingsTarget.section.title, place: settingsTarget.section.place ?? "after", when: settingsTarget.section.when, notesHint: settingsTarget.section.notesHint ?? "" }}
          inAssessment={!!settingsTarget.assessment}
          assessments={assessmentOptions}
          onSave={(s) =>
            setPack(
              updateSection(pack, sectionSettings, (sec) => {
                const next: PackSection = { ...sec, title: s.title };
                if (!settingsTarget.assessment) next.place = s.place;
                if (s.when) next.when = s.when;
                else delete next.when;
                if (s.notesHint) next.notesHint = s.notesHint;
                else delete next.notesHint;
                return next;
              }),
            )
          }
          onDelete={() => setPack(updateSection(pack, sectionSettings, () => null))}
          onClose={() => setSectionSettings(null)}
        />
      )}
      {assessmentRename && (
        <TitleEditorModal
          original={pack.assessments.find((a) => a.id === assessmentRename)?.label ?? ""}
          current={pack.assessments.find((a) => a.id === assessmentRename)?.label ?? ""}
          onSave={(t) => {
            if (t) setAssessments(pack.assessments.map((a) => (a.id === assessmentRename ? { ...a, label: t } : a)));
          }}
          onClose={() => setAssessmentRename(null)}
        />
      )}
      {addingAssessment && <AddAssessmentModal readyMade={readyMadeAssessments(discipline)} onAddReadyMade={addReadyMade} onAdd={addAssessment} onClose={() => setAddingAssessment(false)} />}
      {listEditing && pack.lists[listEditing] && (
        <ListEditorModal
          name={listEditing}
          options={pack.lists[listEditing].options}
          edited={false}
          onSave={(opts) => setPack({ ...pack, lists: { ...pack.lists, [listEditing]: { ...pack.lists[listEditing], options: opts } } })}
          onReset={() => {}}
          onClose={() => setListEditing(null)}
        />
      )}
      {gridEditing && grids[gridEditing] && (
        <GridEditorModal
          original={grids[gridEditing]}
          current={grids[gridEditing]}
          onSave={(g) => {
            if (g) setGrid(gridEditing, g);
          }}
          onClose={() => setGridEditing(null)}
        />
      )}
    </div>
  );
}

/** Report type, result, grade and pronoun: the same for every template. */
function SetupBasics({ setup, patch, onGrade }: { setup: ReportSetup; patch: (p: Partial<ReportSetup>) => void; onGrade: (g: ReportSetup["grade"]) => void }) {
  return (
    <>
      <div className="setup-row">
        <span className="setup-label">Report</span>
        <span className="seg">
          <button type="button" className={setup.reportType === "evaluation" ? "on" : ""} onClick={() => patch({ reportType: "evaluation" })}>Evaluation</button>
          <button type="button" className={setup.reportType === "annual" ? "on" : ""} onClick={() => patch({ reportType: "annual" })}>Annual review</button>
        </span>
      </div>
      <div className="setup-row">
        <span className="setup-label">{setup.reportType === "evaluation" ? "Result" : "Qualifies for services"}</span>
        <span className="seg">
          <button type="button" className={setup.concerns ? "on" : ""} onClick={() => patch({ concerns: true })}>{setup.reportType === "evaluation" ? "Concerns found" : "Yes"}</button>
          <button type="button" className={!setup.concerns ? "on" : ""} onClick={() => patch({ concerns: false })}>{setup.reportType === "evaluation" ? "No concerns" : "No"}</button>
        </span>
      </div>
      <div className="setup-row">
        <span className="setup-label">Grade</span>
        <span className="seg">
          {GRADE_GROUPS.map((g) => (
            <button key={g.id} type="button" className={setup.grade === g.id ? "on" : ""} onClick={() => onGrade(g.id)}>
              {g.label}
            </button>
          ))}
        </span>
      </div>
      <div className="setup-row">
        <span className="setup-label">Student</span>
        <span className="seg">
          {(["he", "she"] as PronounSet[]).map((p) => (
            <button key={p} type="button" className={setup.pronoun === p ? "on" : ""} onClick={() => patch({ pronoun: p })}>
              {p === "he" ? "He / him" : "She / her"}
            </button>
          ))}
        </span>
      </div>
    </>
  );
}
