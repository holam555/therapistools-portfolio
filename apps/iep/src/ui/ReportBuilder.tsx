import { useEffect, useMemo, useState } from "react";
import { getDiscipline } from "../model/disciplines";
import type { PronounSet } from "../model/types";
import { gridRatedCount, type GridDef } from "../report/grids";
import { otReportSections, OT_REPORT_TITLE } from "../report/ot-pack";
import { SCREEN_BORROWED, screenItemsFor } from "../report/ot-screen";
import { loadSetup, loadValues, migrateValueKeys, saveSetup, saveValues, withGrade } from "../report/setup";
import { BUILT_IN_GRIDS, applyScreenOverrides, emptyOverrides, gridFor, hasOverrides, listFor, loadOverrides, saveOverrides, type BlockOverride, type TemplateOverrides } from "../report/overrides";
import { OPTION_LISTS } from "../report/options";
import { blockKeyOf } from "../report/render";
import { GRADE_GROUPS, TEACHER_AREAS, type AssessmentId, type Block, type GoalArea, type ReportSetup, type ReportValues, type ScreenItem } from "../report/types";
import { AddScreenItemModal, EditBlockModal, GridEditorModal, ListEditorModal, TitleEditorModal } from "./TemplateEditors";
import { PackReportBuilder } from "./PackReportBuilder";
import { RatingPanel, ReportOutput } from "./ReportOutput";
import { confirmAction } from "./common";
import { useApp } from "./state";

const ASSESSMENTS: { id: AssessmentId; label: string }[] = [
  { id: "teacher", label: "Teacher rating checklist" },
  { id: "screen", label: "Informal fine motor screen" },
  { id: "beery", label: "Beery VMI" },
  { id: "spm2", label: "SPM-2 School form" },
];

const GOAL_AREAS: { id: GoalArea; label: string }[] = [
  { id: "writing", label: "Writing" },
  { id: "cutting", label: "Cutting" },
  { id: "selfcare", label: "Self care" },
];

/** Shared by the OT builder and the pack builder. */
export function useFlash(): [string | null, (m: string) => void] {
  const [flash, setFlash] = useState<string | null>(null);
  const say = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash((x) => (x === m ? null : x)), 2600);
  };
  return [flash, say];
}

/** Filled blank values, saved per discipline. */
export function useValues(discipline: Parameters<typeof loadValues>[0], migrate?: (v: ReportValues) => ReportValues) {
  const [values, setValues] = useState<ReportValues>(() => (migrate ? migrate(loadValues(discipline)) : loadValues(discipline)));
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

/**
 * Report builder: choose what you did, fill blanks by clicking them, get a Word
 * draft with every fixed sentence already written, and one AI prompt per
 * section to finish the rest with your own notes. Occupational therapy uses
 * the built-in template; other disciplines use their own pack.
 */
export function ReportBuilder() {
  const { discipline } = useApp();
  if (discipline !== "ot") return <PackReportBuilder />;
  return <OtReportBuilder />;
}

function OtReportBuilder() {
  const { discipline } = useApp();
  const current = getDiscipline(discipline);
  const [setup, setSetup] = useState<ReportSetup>(() => loadSetup(discipline));
  // Values filled before blocks had ids were stored by position; move them once.
  const { values, setValues, setValue, filledCount } = useValues(discipline, (v) => migrateValueKeys(v, otReportSections(loadSetup(discipline))));
  const [overrides, setOverrides] = useState<TemplateOverrides>(() => loadOverrides(discipline));
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<{ sectionId: string; blockKey: string } | null>(null);
  const [listEditing, setListEditing] = useState<string | null>(null);
  const [gridEditing, setGridEditing] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<ScreenItem["group"] | null>(null);
  const [flash, say] = useFlash();

  useEffect(() => saveSetup(discipline, setup), [discipline, setup]);
  useEffect(() => saveOverrides(discipline, overrides), [discipline, overrides]);

  const sections = useMemo(() => otReportSections(setup, overrides), [setup, overrides]);
  // The same report without wording edits, to compare against and to reset to.
  const originals = useMemo(() => otReportSections(setup, { ...overrides, blocks: {}, sectionExamples: {} }), [setup, overrides]);
  // The checklist shows items under the names the writer gave them in the preview.
  const items = applyScreenOverrides(screenItemsFor(setup.grade), setup.grade, overrides).map((i) => ({ ...i, label: overrides.blocks[`screen/${i.id}`]?.label ?? i.label }));
  const borrowed = SCREEN_BORROWED[setup.grade];

  const patch = (p: Partial<ReportSetup>) => setSetup((s) => ({ ...s, ...p }));
  const toggleItem = (id: string) =>
    patch({ screenItems: setup.screenItems.includes(id) ? setup.screenItems.filter((x) => x !== id) : [...setup.screenItems, id] });
  const setGroupItems = (group: string, on: boolean) => {
    const ids = items.filter((i) => i.group === group).map((i) => i.id);
    patch({ screenItems: on ? [...new Set([...setup.screenItems, ...ids])] : setup.screenItems.filter((x) => !ids.includes(x)) });
  };
  const anyRatings = Object.values(setup.ratings).some((r) => Object.keys(r).length > 0);
  const clearFilled = () => {
    if (!filledCount || confirmAction(`Clear the ${filledCount} blank${filledCount === 1 ? "" : "s"} you filled, ready for the next report?`)) {
      setValues({});
      setSetup((s) => ({ ...s, ratings: {} }));
    }
  };

  // ---------- template edits ----------
  const setBlockOverride = (sectionId: string, blockKey: string, o: BlockOverride | null) =>
    setOverrides((cur) => {
      const blocks = { ...cur.blocks };
      const k = `${sectionId}/${blockKey}`;
      if (o && Object.keys(o).length) blocks[k] = o;
      else delete blocks[k];
      return { ...cur, blocks };
    });
  const setSectionExamples = (sectionId: string, ex: string[]) =>
    setOverrides((cur) => {
      const sectionExamples = { ...cur.sectionExamples };
      const orig = originals.find((x) => x.id === sectionId)?.examples ?? [];
      if (JSON.stringify(ex) === JSON.stringify(orig)) delete sectionExamples[sectionId];
      else sectionExamples[sectionId] = ex;
      return { ...cur, sectionExamples };
    });
  const setList = (name: string, opts: string[] | null) =>
    setOverrides((cur) => {
      const lists = { ...cur.lists };
      if (!opts || JSON.stringify(opts) === JSON.stringify(OPTION_LISTS[name]?.options)) delete lists[name];
      else lists[name] = opts;
      return { ...cur, lists };
    });
  const gradeScreen = (o: TemplateOverrides) => o.screen[setup.grade] ?? { hidden: [], added: [] };
  const hideItem = (id: string) => {
    setOverrides((cur) => {
      const g = gradeScreen(cur);
      const isCustom = g.added.some((i) => i.id === id);
      const next = isCustom ? { hidden: g.hidden, added: g.added.filter((i) => i.id !== id) } : { hidden: [...g.hidden, id], added: g.added };
      return { ...cur, screen: { ...cur.screen, [setup.grade]: next } };
    });
    patch({ screenItems: setup.screenItems.filter((x) => x !== id) });
  };
  const addItem = (item: Omit<ScreenItem, "id">) => {
    const id = `custom-${Date.now().toString(36)}`;
    setOverrides((cur) => {
      const g = gradeScreen(cur);
      return { ...cur, screen: { ...cur.screen, [setup.grade]: { hidden: g.hidden, added: [...g.added, { ...item, id }] } } };
    });
    patch({ screenItems: [...setup.screenItems, id] });
  };
  const restoreHiddenItems = () =>
    setOverrides((cur) => {
      const g = gradeScreen(cur);
      return { ...cur, screen: { ...cur.screen, [setup.grade]: { hidden: [], added: g.added } } };
    });
  const showHiddenIn = (sectionId: string) =>
    setOverrides((cur) => {
      const blocks = { ...cur.blocks };
      for (const [k, v] of Object.entries(blocks))
        if (k.startsWith(`${sectionId}/`) && v.hidden) {
          const { hidden: _h, ...rest } = v;
          if (Object.keys(rest).length) blocks[k] = rest;
          else delete blocks[k];
        }
      return { ...cur, blocks };
    });
  const setGrid = (id: string, grid: GridDef | null) =>
    setOverrides((cur) => {
      const grids = { ...cur.grids };
      if (grid) grids[id] = grid;
      else delete grids[id];
      return { ...cur, grids };
    });
  const setTitle = (sectionId: string, title: string | null) =>
    setOverrides((cur) => {
      const titles = { ...cur.titles };
      if (title) titles[sectionId] = title;
      else delete titles[sectionId];
      return { ...cur, titles };
    });
  const resetAllEdits = () => {
    if (confirmAction("Remove all your template edits and go back to the original wording, samples, dropdowns, screen items, rating grids and titles?")) setOverrides(emptyOverrides());
  };
  const hiddenScreenCount = gradeScreen(overrides).hidden.length;

  const editTarget = (() => {
    if (!editing) return null;
    const section = sections.find((x) => x.id === editing.sectionId);
    const orig = originals.find((x) => x.id === editing.sectionId);
    if (!section || !orig) return null;
    const find = (blocks: Block[]) => blocks.find((b, i) => blockKeyOf(b, i) === editing.blockKey);
    const current = find(section.blocks);
    const original = find(orig.blocks);
    if (!current || !original) return null;
    return { section, current, original };
  })();

  const groups: { id: "classroom" | "supporting" | "paragraph"; label: string }[] = [
    { id: "classroom", label: "Classroom skills" },
    { id: "supporting", label: "Supporting skills" },
    { id: "paragraph", label: "Sections" },
  ];
  const spmGrid = gridFor("spm2", overrides);
  const spmSet = gridRatedCount(spmGrid, setup.ratings.spm2 ?? {});

  return (
    <div className="report">
      <section className="card report-setup" aria-label="Report setup">
        <h2>1. Set up the report</h2>

        <SetupBasics setup={setup} patch={patch} onGrade={(g) => setSetup((s) => withGrade(s, g, overrides))} />

        <h3>What did you do?</h3>
        <ul className="assess-list">
          {ASSESSMENTS.map((a) => (
            <li key={a.id}>
              <label className="check">
                <input type="checkbox" checked={setup.assessments[a.id]} onChange={(e) => patch({ assessments: { ...setup.assessments, [a.id]: e.target.checked } })} />
                {a.label}
              </label>
              {a.id === "teacher" && setup.assessments.teacher && (
                <span className="row gap wrap teacher-areas">
                  <span className="hint">Concerns in:</span>
                  {TEACHER_AREAS.map((t) => (
                    <label key={t.id} className="check">
                      <input type="checkbox" checked={setup.teacherAreas[t.id]} onChange={(e) => patch({ teacherAreas: { ...setup.teacherAreas, [t.id]: e.target.checked } })} /> {t.label}
                    </label>
                  ))}
                </span>
              )}
              {a.id === "screen" && setup.assessments.screen && (
                <div className="screen-items">
                  {borrowed && <p className="hint">There's no 9–12 screen template yet, so the 6–8 items are used.</p>}
                  {editMode && hiddenScreenCount > 0 && (
                    <p className="hint">
                      {hiddenScreenCount} built-in item{hiddenScreenCount === 1 ? " is" : "s are"} hidden for this grade.{" "}
                      <button type="button" className="link" onClick={restoreHiddenItems}>Show them again</button>
                    </p>
                  )}
                  {groups.map((g) => {
                    const list = items.filter((i) => i.group === g.id);
                    if (!list.length) return null;
                    return (
                      <div key={g.id} className="screen-group">
                        <div className="screen-group-head">
                          <span>{g.label}</span>
                          <span className="hint">
                            <button type="button" className="link" onClick={() => setGroupItems(g.id, true)}>all</button> ·{" "}
                            <button type="button" className="link" onClick={() => setGroupItems(g.id, false)}>none</button>
                          </span>
                        </div>
                        {list.map((i) => (
                          <span key={i.id} className="screen-item-row">
                            <label className="check">
                              <input type="checkbox" checked={setup.screenItems.includes(i.id)} onChange={() => toggleItem(i.id)} /> {i.label}
                              {i.id.startsWith("custom-") && <span className="badge badge-tag">yours</span>}
                            </label>
                            {editMode && (
                              <button type="button" className="btn btn-xs btn-danger" title={i.id.startsWith("custom-") ? "Delete this item" : "Hide this item for this grade"} onClick={() => hideItem(i.id)}>
                                ✕
                              </button>
                            )}
                          </span>
                        ))}
                        {editMode && (
                          <button type="button" className="link add-item" onClick={() => setAdding(g.id)}>
                            + add {g.id === "paragraph" ? "a section" : "an item"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {a.id === "spm2" && setup.assessments.spm2 && (
                <RatingPanel
                  grid={spmGrid}
                  edited={!!overrides.grids.spm2}
                  ratings={setup.ratings.spm2 ?? {}}
                  onChange={(r) => patch({ ratings: { ...setup.ratings, spm2: r } })}
                  onEdit={editMode ? () => setGridEditing("spm2") : undefined}
                  hint="The result lines fill in once every scale is set. The evaluation summary uses them too."
                />
              )}
            </li>
          ))}
        </ul>

        {setup.concerns && (
          <>
            <h3>Services and goal</h3>
            <div className="setup-row">
              <span className="setup-label">Service</span>
              <span className="seg">
                <button type="button" className={setup.serviceType === "direct" ? "on" : ""} onClick={() => patch({ serviceType: "direct" })}>Direct</button>
                <button type="button" className={setup.serviceType === "indirect" ? "on" : ""} onClick={() => patch({ serviceType: "indirect" })}>Indirect</button>
              </span>
            </div>
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
            <div className="setup-row">
              <span className="setup-label">Standards</span>
              <span className="row gap wrap">
                {GOAL_AREAS.map((g) => (
                  <label key={g.id} className="check">
                    <input
                      type="checkbox"
                      checked={setup.goalAreas.includes(g.id)}
                      onChange={(e) => patch({ goalAreas: e.target.checked ? [...setup.goalAreas, g.id] : setup.goalAreas.filter((x) => x !== g.id) })}
                    />{" "}
                    {g.label}
                  </label>
                ))}
              </span>
            </div>
          </>
        )}
      </section>

      <ReportOutput
        title={OT_REPORT_TITLE[setup.reportType]}
        sections={sections}
        reportType={setup.reportType}
        grade={setup.grade}
        pronoun={setup.pronoun}
        role={current.role}
        values={values}
        setValue={setValue}
        filledCount={filledCount}
        anyRatings={anyRatings || spmSet > 0}
        clearFilled={clearFilled}
        lists={(name) => listFor(name, overrides)}
        editMode={editMode}
        setEditMode={setEditMode}
        flash={flash}
        say={say}
        edit={{
          hasEdits: hasOverrides(overrides),
          resetAll: resetAllEdits,
          banner: (
            <>
              Click ✎ beside a paragraph to change its wording, blanks or sample sentences, or to hide it; beside a title to rename the section; beside
              a line written from ratings (SPM-2) to change that assessment's items, levels and sentences. Your edits are saved in this browser and
              included in Settings → Backup.
            </>
          ),
          onEditBlock: (sectionId, blockKey) => setEditing({ sectionId, blockKey }),
          onEditTitle: setTitleEditing,
          onEditGrid: setGridEditing,
          onEditList: setListEditing,
          sectionTools: (s) => {
            const hidden = (originals.find((o) => o.id === s.id)?.blocks.length ?? 0) - s.blocks.length;
            return hidden > 0 ? (
              <span className="hint hidden-note">
                {" "}
                {hidden} hidden · <button type="button" className="link" onClick={() => showHiddenIn(s.id)}>show</button>
              </span>
            ) : null;
          },
          listNames: Object.keys(OPTION_LISTS),
          listEdited: (name) => !!overrides.lists[name],
        }}
      />

      {editTarget && editing && (
        <EditBlockModal
          sectionTitle={editTarget.section.title}
          original={editTarget.original}
          current={editTarget.current}
          override={overrides.blocks[`${editing.sectionId}/${editing.blockKey}`]}
          examplesFromSection={!editTarget.original.examples}
          sectionExamples={editTarget.section.examples}
          listNames={Object.keys(OPTION_LISTS)}
          onSave={(o) => setBlockOverride(editing.sectionId, editing.blockKey, o)}
          onSaveSectionExamples={(ex) => setSectionExamples(editing.sectionId, ex)}
          onReset={() => setBlockOverride(editing.sectionId, editing.blockKey, null)}
          onClose={() => setEditing(null)}
        />
      )}
      {listEditing && (
        <ListEditorModal
          name={listEditing}
          options={listFor(listEditing, overrides)?.options ?? []}
          edited={!!overrides.lists[listEditing]}
          onSave={(opts) => setList(listEditing, opts)}
          onReset={() => setList(listEditing, null)}
          onClose={() => setListEditing(null)}
        />
      )}
      {gridEditing && BUILT_IN_GRIDS[gridEditing] && (
        <GridEditorModal
          original={BUILT_IN_GRIDS[gridEditing]}
          current={gridFor(gridEditing, overrides)}
          onSave={(g) => setGrid(gridEditing, g)}
          onClose={() => setGridEditing(null)}
        />
      )}
      {titleEditing && (
        <TitleEditorModal
          original={originals.find((s) => s.id === titleEditing)?.title ?? ""}
          current={sections.find((s) => s.id === titleEditing)?.title ?? ""}
          onSave={(t) => setTitle(titleEditing, t)}
          onClose={() => setTitleEditing(null)}
        />
      )}
      {adding && (
        <AddScreenItemModal
          gradeLabel={GRADE_GROUPS.find((g) => g.id === setup.grade)?.label ?? ""}
          defaultGroup={adding}
          onAdd={addItem}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}

/** Report type, result, grade and pronoun: the same for every template. */
export function SetupBasics({ setup, patch, onGrade }: { setup: ReportSetup; patch: (p: Partial<ReportSetup>) => void; onGrade: (g: ReportSetup["grade"]) => void }) {
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
