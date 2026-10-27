import { useState } from 'react';
import { BlockListEditor } from '../components/BlockListEditor';
import { ConfirmModal } from '../components/ConfirmModal';
import { PasteGradeScheduleModal } from '../components/PasteGradeScheduleModal';
import { InlineAdd } from '../components/InlineAdd';
import { TimeSelect } from '../components/TimeSelect';
import { WeekGrid } from '../components/WeekGrid';
import { effectiveBlockedTime } from '../domain/schedule';
import { invertBlocks } from '../domain/intervals';
import { gradeLevelFromName } from '../domain/migrate';
import type { DayOfWeek, Grade } from '../domain/types';
import { DAY_NAMES } from '../domain/types';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';

export function SetupScreen() {
  const ws = useWorkspaceStore((s) => s.ws);
  const updateSettings = useWorkspaceStore((s) => s.updateSettings);
  const upsertGrade = useWorkspaceStore((s) => s.upsertGrade);
  const deleteGrade = useWorkspaceStore((s) => s.deleteGrade);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(
    ws.grades[0]?.id ?? null,
  );
  const [newCategory, setNewCategory] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'everyday' | 'perday'>('everyday');
  const [pastingGrade, setPastingGrade] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState(false);
  const schools = useWorkspaceStore((s) => s.schools);
  const activeSchoolId = useWorkspaceStore((s) => s.activeSchoolId);
  const renameSchool = useWorkspaceStore((s) => s.renameSchool);
  const deleteSchool = useWorkspaceStore((s) => s.deleteSchool);

  function addCategory() {
    const v = newCategory.trim();
    if (!v) return;
    if (!ws.settings.avoidCategories.includes(v)) {
      updateSettings({ avoidCategories: [...ws.settings.avoidCategories, v] });
    }
    setNewCategory('');
  }

  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  const grade = ws.grades.find((g) => g.id === selectedGradeId) ?? null;

  function addGrade(name: string): string | undefined {
    if (ws.grades.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      return `"${name}" already exists.`;
    }
    const g: Grade = {
      id: newId(),
      name,
      level: gradeLevelFromName(name),
      templatePolarity: 'blocked',
      templateBlocks: [],
    };
    upsertGrade(g);
    setSelectedGradeId(g.id);
    return undefined;
  }

  // Two ways to edit a grade's master schedule. Every day (the default):
  // one row per (time, label) pattern, and an edit there rewrites the whole
  // week. Each day: the raw per-day rows, where an edit touches only that
  // day. Blocks are always STORED per day, so both modes read the same data.
  // Insertion order is kept (no time sort) so a freshly added row stays at
  // the bottom, where it's obviously the one waiting to be edited.
  const patternKey = (b: { start: number; end: number; label?: string; optional?: boolean }) =>
    `${b.start}:${b.end}:${b.label ?? ''}:${b.optional ? 1 : 0}`;

  const dailyRows = (() => {
    if (!grade) return [];
    const byPattern = new Map<
      string,
      { day: DayOfWeek; start: number; end: number; label?: string; optional?: boolean; days: DayOfWeek[] }
    >();
    for (const b of grade.templateBlocks) {
      const key = patternKey(b);
      const row = byPattern.get(key);
      if (row) {
        if (!row.days.includes(b.day)) row.days.push(b.day);
      } else {
        byPattern.set(key, {
          day: 0,
          start: b.start,
          end: b.end,
          label: b.label,
          optional: b.optional,
          days: [b.day],
        });
      }
    }
    return [...byPattern.values()];
  })();

  function saveDailyRows(rows: Array<{ start: number; end: number; label?: string; optional?: boolean }>) {
    if (!grade) return;
    upsertGrade({
      ...grade,
      templateBlocks: rows.flatMap((row) => {
        // A row left untouched keeps whatever days it already covered; a row
        // the user edited or added applies to the whole week, which is what
        // "Every day" means.
        const original = dailyRows.find((r) => patternKey(r) === patternKey(row));
        const days = original ? original.days : ([0, 1, 2, 3, 4] as DayOfWeek[]);
        return days.map((day) => ({
          day,
          start: row.start,
          end: row.end,
          label: row.label,
          optional: row.optional,
        }));
      }),
    });
  }

  const perDayRows = grade
    ? [...grade.templateBlocks]
        .sort((a, b) => a.day - b.day || a.start - b.start)
        .map((b) => ({ day: b.day, start: b.start, end: b.end, label: b.label, optional: b.optional }))
    : [];

  function savePerDayRows(
    rows: Array<{ day: DayOfWeek; start: number; end: number; label?: string; optional?: boolean }>,
  ) {
    if (!grade) return;
    upsertGrade({
      ...grade,
      templateBlocks: rows.map((r) => ({
        day: r.day,
        start: r.start,
        end: r.end,
        label: r.label,
        optional: r.optional,
      })),
    });
  }

  // Preview: what a student in this grade would see as blocked vs open.
  // 'blocked' polarity renders the labeled blocks directly so labels show;
  // optional blocks are tagged so it's clear they bind only opted-in students.
  const previewIntervals = grade
    ? [
        ...(grade.templatePolarity === 'blocked'
          ? grade.templateBlocks
              .map((b) => ({ ...b, start: Math.max(b.start, win.start), end: Math.min(b.end, win.end) }))
              .filter((b) => b.start < b.end)
              .map((b) => ({
                ...b,
                label: b.optional ? `${b.label ?? 'blocked'} · some students` : b.label,
                kind: b.optional ? ('override-block' as const) : ('template-block' as const),
              }))
          : effectiveBlockedTime(grade, [], ws.settings).map((b) => ({
              ...b,
              kind: 'template-block' as const,
            }))),
        ...invertBlocks(
          effectiveBlockedTime(
            grade,
            [],
            ws.settings,
            grade.templateBlocks.flatMap((b) => (b.optional && b.label ? [b.label] : [])),
          ),
          win,
        ).map((b) => ({
          ...b,
          kind: 'gap' as const,
        })),
      ]
    : [];

  return (
    <div className="stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-head">
        <h1>School Setup</h1>
        <span className="sub">School day, week rotation, and each grade's master schedule</span>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>This school</h2>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field">
            School name
            <input
              key={activeSchoolId}
              defaultValue={schools.find((s) => s.id === activeSchoolId)?.name ?? ''}
              style={{ width: 180 }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) renameSchool(activeSchoolId, v);
                else e.target.value = schools.find((s) => s.id === activeSchoolId)?.name ?? '';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </label>
          {schools.length > 1 && (
            <button className="btn ghost small danger" onClick={() => setSchoolToDelete(true)}>
              Delete this school
            </button>
          )}
          <span className="sub" style={{ color: 'var(--muted)', fontSize: 13, paddingBottom: 8 }}>
            Switch or add schools in the top bar - each school keeps completely separate data.
          </span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>School day</h2>
        <div className="row">
          <label className="field">
            Day starts
            <TimeSelect
              value={ws.settings.schoolDayStart}
              min={300}
              max={ws.settings.schoolDayEnd - 60}
              step={15}
              onChange={(m) => updateSettings({ schoolDayStart: m })}
            />
          </label>
          <label className="field">
            Day ends
            <TimeSelect
              value={ws.settings.schoolDayEnd}
              min={ws.settings.schoolDayStart + 60}
              max={1140}
              step={15}
              onChange={(m) => updateSettings({ schoolDayEnd: m })}
            />
          </label>
          <label className="field">
            Week A anchor Monday
            <input
              type="date"
              value={ws.settings.weekAAnchorMonday}
              onChange={(e) => e.target.value && updateSettings({ weekAAnchorMonday: e.target.value })}
            />
          </label>
          <span className="sub" style={{ alignSelf: 'flex-end', paddingBottom: 8, color: 'var(--muted)', fontSize: 13 }}>
            The week containing this date is "Week A" for biweekly schedules.
          </span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Times to avoid</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
          Categories for labeling master-schedule blocks (why a time can't be used for
          pull-out). Labels show on student calendars and in conflict messages. Other
          providers' sessions are avoided automatically.
        </p>
        <div className="row">
          {ws.settings.avoidCategories.map((c) => (
            <span key={c} className="segmented" style={{ padding: '3px 4px 3px 12px', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>
              {c}
              <button
                className="btn ghost small"
                style={{ padding: '0 6px' }}
                title={`Remove "${c}"`}
                onClick={() =>
                  updateSettings({ avoidCategories: ws.settings.avoidCategories.filter((x) => x !== c) })
                }
              >
                ✕
              </button>
            </span>
          ))}
          <input
            value={newCategory}
            placeholder="Add category…"
            style={{ width: 140 }}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCategory();
            }}
          />
          <button className="btn small" disabled={!newCategory.trim()} onClick={addCategory}>
            + Add
          </button>
        </div>
      </div>

      <div className="card">
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 18 }}>Grade master schedules</h2>
          <div className="row">
            <InlineAdd placeholder='e.g. "Grade 4"' buttonLabel="Add grade" onAdd={addGrade} />
          </div>
        </div>

        {ws.grades.length === 0 ? (
          <div className="empty-state">
            <h2>No grades yet</h2>
            Add a grade by hand, or upload the school's master schedule Excel to set up
            every grade at once.
          </div>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 16 }}>
              <div className="segmented">
                {ws.grades.map((g) => (
                  <button
                    key={g.id}
                    className={g.id === selectedGradeId ? 'on' : ''}
                    onClick={() => setSelectedGradeId(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              {grade && (
                <button className="btn ghost small danger" onClick={() => setGradeToDelete(grade)}>
                  Delete {grade.name}
                </button>
              )}
            </div>

            {grade && (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div className="stack side-card">
                  <label className="field" style={{ maxWidth: 180 }}>
                    Grade level (K = 0)
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={grade.level ?? ''}
                      placeholder="for grouping rules"
                      onChange={(e) =>
                        upsertGrade({
                          ...grade,
                          level: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    I'm marking…
                    <div className="segmented">
                      <button
                        className={grade.templatePolarity === 'blocked' ? 'on' : ''}
                        onClick={() => upsertGrade({ ...grade, templatePolarity: 'blocked' })}
                      >
                        Blocked time
                      </button>
                      <button
                        className={grade.templatePolarity === 'available' ? 'on' : ''}
                        onClick={() => upsertGrade({ ...grade, templatePolarity: 'available' })}
                      >
                        Available time
                      </button>
                    </div>
                  </label>
                  <label className="field">
                    Editing
                    <div className="row" style={{ gap: 8 }}>
                    <div className="segmented">
                      <button
                        className={scheduleMode === 'everyday' ? 'on' : ''}
                        title="One row per period; a change here applies to all five days"
                        onClick={() => setScheduleMode('everyday')}
                      >
                        Every day
                      </button>
                      <button
                        className={scheduleMode === 'perday' ? 'on' : ''}
                        title="Every day listed separately; a change here affects only that day"
                        onClick={() => setScheduleMode('perday')}
                      >
                        Each day
                      </button>
                    </div>
                    <button
                      className={grade.templateBlocks.length === 0 ? 'btn primary' : 'btn small'}
                      title="Paste this grade's column from Excel and read the periods automatically"
                      onClick={() => setPastingGrade(true)}
                    >
                      Paste from Excel
                    </button>
                    <strong style={{ fontSize: 12, alignSelf: 'center' }}>
                      Paste ONE grade at a time.
                    </strong>
                    </div>
                  </label>
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                    {grade.templatePolarity === 'blocked'
                      ? 'List the times students in this grade cannot be pulled. Mark ELD-style periods "only students who need it" and switch them on per student.'
                      : 'List the times students in this grade are free to be pulled. Everything else is blocked.'}{' '}
                    {scheduleMode === 'everyday'
                      ? 'Each row applies Monday through Friday, and editing one changes every day.'
                      : 'Each row is one day only, so editing one leaves the other days alone.'}
                  </p>
                  {scheduleMode === 'everyday' ? (
                    <BlockListEditor
                      blocks={dailyRows}
                      window={win}
                      hideDay
                      showOptional={grade.templatePolarity === 'blocked'}
                      labelOptions={grade.templatePolarity === 'blocked' ? ws.settings.avoidCategories : undefined}
                      addLabel={grade.templatePolarity === 'blocked' ? 'blocked time' : 'available time'}
                      rowNote={(_b, i) => {
                        const days = dailyRows[i]?.days ?? [];
                        if (days.length === 0 || days.length === 5) return null;
                        return (
                          <span
                            className="goal-tag"
                            title="This period is not on every day. Switch to Each day to edit it without changing the rest of the week; editing it here would apply it Monday through Friday."
                          >
                            {[...days].sort().map((d) => DAY_NAMES[d]).join('/')} only
                          </span>
                        );
                      }}
                      onChange={(rows) =>
                        saveDailyRows(rows.map(({ start, end, label, optional }) => ({ start, end, label, optional })))
                      }
                    />
                  ) : (
                    <BlockListEditor
                      blocks={perDayRows}
                      window={win}
                      showOptional={grade.templatePolarity === 'blocked'}
                      labelOptions={grade.templatePolarity === 'blocked' ? ws.settings.avoidCategories : undefined}
                      addLabel={grade.templatePolarity === 'blocked' ? 'blocked time' : 'available time'}
                      onChange={(rows) =>
                        savePerDayRows(
                          rows.flatMap(({ day, start, end, label, optional, everyDay }) =>
                            (everyDay ? ([0, 1, 2, 3, 4] as DayOfWeek[]) : [day]).map((d) => ({
                              day: d,
                              start,
                              end,
                              label,
                              optional,
                            })),
                          ),
                        )
                      }
                      allowEveryDay
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="legend" style={{ marginBottom: 8 }}>
                    <span>
                      <span className="swatch" style={{ background: 'var(--blocked-bg)' }} /> Blocked
                    </span>
                    <span>
                      <span className="swatch" style={{ background: 'var(--gap-bg)' }} /> Open for pull-out
                    </span>
                  </div>
                  <WeekGrid window={win} intervals={previewIntervals} pxPerMinute={0.85} showTimes={false} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {schoolToDelete && (
        <ConfirmModal
          title={`Delete ${schools.find((s) => s.id === activeSchoolId)?.name ?? 'this school'}?`}
          message="This permanently removes the school and ALL of its data - students, providers, schedules, everything. Export a backup first if you might need it."
          confirmLabel="Delete school"
          onConfirm={() => void deleteSchool(activeSchoolId)}
          onClose={() => setSchoolToDelete(false)}
        />
      )}

      {pastingGrade && grade && (
        <PasteGradeScheduleModal grade={grade} onClose={() => setPastingGrade(false)} />
      )}

      {gradeToDelete && (
        <ConfirmModal
          title={`Delete ${gradeToDelete.name}?`}
          message={
            ws.students.some((s) => s.gradeId === gradeToDelete.id)
              ? `${ws.students.filter((s) => s.gradeId === gradeToDelete.id).length} student(s) are assigned to it and will lose their master-schedule blocks.`
              : 'This removes the grade and its master schedule.'
          }
          onConfirm={() => {
            deleteGrade(gradeToDelete.id);
            if (selectedGradeId === gradeToDelete.id) setSelectedGradeId(null);
          }}
          onClose={() => setGradeToDelete(null)}
        />
      )}
    </div>
  );
}
