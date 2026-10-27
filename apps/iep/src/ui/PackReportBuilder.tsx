import { useEffect, useMemo, useState } from "react";
import { getDiscipline } from "../model/disciplines";
import type { GridDef } from "../report/grids";
import {
  assessmentOn, blankPack, findSection, loadPack, moveInList, newPackId, packGrids, packSections, savePack, updateBlock, updateSection,
  type PackAssessment, type PackBlock, type PackSection, type TemplatePack,
} from "../report/pack";
import { ImportDocument } from "./ImportDocument";
import { loadSetup, saveSetup } from "../report/setup";
import type { Block, ReportSetup } from "../report/types";
import { SetupBasics, useFlash, useValues } from "./ReportBuilder";
import { RatingPanel, ReportOutput } from "./ReportOutput";
import { AddAssessmentModal, AddBlockModal, EditBlockModal, GridEditorModal, ListEditorModal, SectionSettingsModal, TitleEditorModal } from "./TemplateEditors";
import { confirmAction } from "./common";
import { useApp } from "./state";

/**
 * The Report tab for a discipline other than OT: its template is a pack the
 * writer owns, so every edit changes the pack itself and is saved in this
 * browser (and in Settings → Backup).
 */
export function PackReportBuilder() {
  const { discipline } = useApp();
  const current = getDiscipline(discipline);
  const [pack, setPack] = useState<TemplatePack | null>(() => loadPack(discipline));
  useEffect(() => savePack(discipline, pack), [discipline, pack]);
  if (!pack) return <PackStart label={current.label} onChoose={setPack} />;
  return <PackEditor pack={pack} setPack={setPack} onDiscard={() => setPack(null)} />;
}

function PackStart({ label, onChoose }: { label: string; onChoose: (p: TemplatePack) => void }) {
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
        <button type="button" className="start-choice" disabled title="Coming next">
          <strong>Pre-made {label.toLowerCase()} template</strong>
          <span className="hint">Coming next. Only occupational therapy has a pre-made template so far.</span>
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
  const grids = packGrids(pack);
  const listNames = Object.keys(pack.lists);

  const patch = (p: Partial<ReportSetup>) => setSetup((s) => ({ ...s, ...p }));
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
  const removeAssessment = (a: PackAssessment) => {
    if (confirmAction(`Remove the assessment “${a.label}” and its ${a.sections.length} section${a.sections.length === 1 ? "" : "s"}?`)) setAssessments(pack.assessments.filter((x) => x.id !== a.id));
  };
  const setGrid = (gridId: string, grid: GridDef) => setAssessments(pack.assessments.map((a) => (a.grid?.id === gridId ? { ...a, grid } : a)));

  const applyBlockEdit = (sectionId: string, blockId: string, o: { text?: string; label?: string; examples?: string[]; hidden?: boolean }) =>
    setPack(
      updateBlock(pack, sectionId, blockId, (b) => {
        if (o.hidden) return null;
        if (b.kind === "grid") return b;
        const next = { ...b } as Block & { label?: string };
        if (o.text !== undefined) next.text = o.text;
        if (o.label !== undefined) next.label = o.label;
        if (o.examples !== undefined) next.examples = o.examples;
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
    const block = found?.section.blocks.find((b) => b.id === editing.blockId);
    if (!found || !block || block.kind === "grid") return null;
    return { section: found.section, block };
  })();
  const settingsTarget = sectionSettings && sectionSettings !== "new" ? findSection(pack, sectionSettings) : null;
  const conditionText = (s: PackSection) => {
    const parts: string[] = [];
    if (s.when?.reportType) parts.push(s.when.reportType === "evaluation" ? "evaluation" : "annual review");
    if (s.when?.concerns !== undefined) parts.push(s.when.concerns ? "with concerns" : "no concerns");
    if (s.when?.grades) parts.push(`grades ${s.when.grades.join(", ")}`);
    return parts.join(" · ");
  };

  return (
    <div className="report">
      <section className="card report-setup" aria-label="Report setup">
        <h2>1. Set up the report</h2>
        <SetupBasics setup={setup} patch={patch} onGrade={(grade) => patch({ grade })} />

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
              This template is yours: click ✎ beside a paragraph to change its wording, blanks or sample sentences, or to delete it; beside a title
              for the section's name, place and when it appears; beside a line written from ratings to change that assessment's items, levels and
              sentences. Use the buttons under each section to add paragraphs, and at the end to add sections. Everything is saved in this browser and
              included in Settings → Backup.
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
            const cond = conditionText(found.section);
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
          original={editTarget.block}
          current={editTarget.block}
          examplesFromSection={!editTarget.block.examples}
          sectionExamples={editTarget.section.examples}
          listNames={listNames}
          hideLabel="Delete this paragraph"
          onSave={(o) => applyBlockEdit(editing.sectionId, editing.blockId, o)}
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
          onSave={(s) => setPack({ ...pack, sections: [...pack.sections, { id: newPackId(pack, "section"), title: s.title, place: s.place, ...(s.when ? { when: s.when } : {}), ...(s.notesHint ? { notesHint: s.notesHint } : {}), blocks: [], examples: [] }] })}
          onClose={() => setSectionSettings(null)}
        />
      )}
      {settingsTarget && sectionSettings && (
        <SectionSettingsModal
          initial={{ title: settingsTarget.section.title, place: settingsTarget.section.place ?? "after", when: settingsTarget.section.when, notesHint: settingsTarget.section.notesHint ?? "" }}
          inAssessment={!!settingsTarget.assessment}
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
      {addingAssessment && <AddAssessmentModal onAdd={addAssessment} onClose={() => setAddingAssessment(false)} />}
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
