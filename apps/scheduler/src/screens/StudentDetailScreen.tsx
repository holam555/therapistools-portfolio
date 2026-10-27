import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockListEditor } from '../components/BlockListEditor';
import { BookingModal, type BookingModalProps } from '../components/BookingModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { TimeSelect } from '../components/TimeSelect';
import { useEscapeToClose } from '../components/useEscapeToClose';
import { WeekGrid } from '../components/WeekGrid';
import { WeekParityToggle } from '../components/WeekParityToggle';
import type { ScheduleInterval } from '../domain/schedule';
import { computeStudentWeek, computeStudentWeekAll } from '../domain/schedule';
import { buildStudentCards } from '../domain/studentCards';
import type { DayOfWeek, GoalPeriod, Minutes, StudentOverride } from '../domain/types';
import { DAY_NAMES, GOAL_PERIODS, formatMinutesWithPeriod } from '../domain/types';
import { downloadStudentCardsDocx } from '../storage/exportStudentCardsDocx';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';

interface OverrideDraft {
  kind: 'block' | 'unblock';
  day: DayOfWeek | 'all';
  start: Minutes;
  end: Minutes;
  label: string;
}

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter (2 mo)',
  semesterly: 'semester (4 mo)',
  yearly: 'year',
};

export function StudentDetailScreen() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const ws = useWorkspaceStore((s) => s.ws);
  const parity = useWorkspaceStore((s) => s.parity);
  const upsertStudent = useWorkspaceStore((s) => s.upsertStudent);
  const deleteStudent = useWorkspaceStore((s) => s.deleteStudent);
  const [draft, setDraft] = useState<OverrideDraft | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [booking, setBooking] = useState<Omit<BookingModalProps, 'onClose'> | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [slotChoice, setSlotChoice] = useState<{ day: DayOfWeek; minutes: Minutes } | null>(null);
  useEscapeToClose(
    useCallback(() => {
      setDraft(null);
      setSlotChoice(null);
    }, []),
  );

  const student = ws.students.find((s) => s.id === studentId);
  if (!student) {
    return (
      <div className="empty-state">
        <h2>Student not found</h2>
        <button className="btn" onClick={() => navigate('/students')}>
          ← All students
        </button>
      </div>
    );
  }

  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  const week = parity === 'both' ? computeStudentWeekAll(student.id, ws) : computeStudentWeek(student.id, parity, ws);
  const grade = ws.grades.find((g) => g.id === student.gradeId);

  function addOverride(d: OverrideDraft) {
    const days: DayOfWeek[] = d.day === 'all' ? [0, 1, 2, 3, 4] : [d.day];
    const added: StudentOverride[] = days.map((day) => ({
      id: newId(),
      kind: d.kind,
      block: { day, start: d.start, end: d.end },
      label: d.label.trim() || undefined,
    }));
    upsertStudent({ ...student!, overrides: [...student!.overrides, ...added] });
    setDraft(null);
  }

  function removeOverride(id: string) {
    upsertStudent({ ...student!, overrides: student!.overrides.filter((o) => o.id !== id) });
  }

  // Personal blocks are 'block' overrides; the editor below edits them as
  // rows, with a Mon-Fri-complete set collapsing into one "Every day" row.
  // Rebuilding puts unblocks first so personal blocks always win on overlap.
  function personalBlockRows() {
    const blocks = student!.overrides.filter((o) => o.kind === 'block');
    const groups = new Map<string, { days: Set<DayOfWeek>; start: Minutes; end: Minutes; label?: string }>();
    for (const o of blocks) {
      const key = `${o.block.start}:${o.block.end}:${o.label ?? ''}`;
      const g = groups.get(key) ?? { days: new Set(), start: o.block.start, end: o.block.end, label: o.label };
      g.days.add(o.block.day);
      groups.set(key, g);
    }
    const rows: Array<{ day: DayOfWeek; start: Minutes; end: Minutes; label?: string; everyDay?: boolean }> = [];
    for (const g of groups.values()) {
      if (g.days.size === 5) {
        rows.push({ day: 0, start: g.start, end: g.end, label: g.label, everyDay: true });
      } else {
        for (const day of [...g.days].sort()) rows.push({ day, start: g.start, end: g.end, label: g.label });
      }
    }
    return rows;
  }

  function setPersonalBlocks(
    rows: Array<{ day: DayOfWeek; start: Minutes; end: Minutes; label?: string; everyDay?: boolean }>,
  ) {
    const unblocks = student!.overrides.filter((o) => o.kind === 'unblock');
    const blocks: StudentOverride[] = rows.flatMap((row) => {
      const days: DayOfWeek[] = row.everyDay ? [0, 1, 2, 3, 4] : [row.day];
      return days.map((day) => ({
        id: newId(),
        kind: 'block' as const,
        block: { day, start: row.start, end: row.end },
        label: row.label,
      }));
    });
    upsertStudent({ ...student!, overrides: [...unblocks, ...blocks] });
  }

  // Clicking a blocked stretch pre-fills an "unblock" draft; clicking a gap
  // asks whether to book a session or block the time (it reads like a booking
  // page, so blocking silently would surprise).
  function onBlockClick(i: ScheduleInterval) {
    setDraft({ kind: 'unblock', day: i.day, start: i.start, end: i.end, label: '' });
  }
  function onGapClick(day: DayOfWeek, minutes: Minutes) {
    setSlotChoice({ day, minutes });
  }

  const provider = (id: string) => ws.providers.find((p) => p.id === id);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Student {student.displayId}</h1>
        <div className="row">
          <WeekParityToggle />
          <button
            className="btn small"
            disabled={buildStudentCards(ws, [student.id]).length === 0}
            title="Word file: a printable card of everyone who sees this student, and when"
            onClick={() =>
              downloadStudentCardsDocx(
                buildStudentCards(ws, [student.id]),
                `student-${student.displayId}-card.docx`,
              )
            }
          >
            Print card
          </button>
          <button
            className="btn primary small"
            disabled={ws.providers.length === 0}
            onClick={() =>
              setBooking({
                initial: {
                  providerId: ws.providers[0]?.id ?? '',
                  studentIds: [student.id],
                  day: 0,
                  start: ws.settings.schoolDayStart,
                  durationMin: 30,
                  recurrence: 'weekly',
                },
              })
            }
          >
            + Add session
          </button>
          <button className="btn ghost small" onClick={() => navigate('/students')}>
            ← All students
          </button>
          <button className="btn ghost small danger" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 24, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div className="card split-card">
            <label className="field" style={{ marginBottom: 10 }}>
              Student ID number
              <input
                key={student.id}
                defaultValue={student.displayId}
                style={{ width: 120 }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === student.displayId) {
                    e.target.value = student.displayId;
                    setIdError(null);
                    return;
                  }
                  if (ws.students.some((s) => s.id !== student.id && s.displayId === v)) {
                    setIdError(`Student ${v} already exists - ID not changed.`);
                    e.target.value = student.displayId;
                    return;
                  }
                  setIdError(null);
                  upsertStudent({ ...student, displayId: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              {idError && (
                <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>{idError}</span>
              )}
            </label>
            <label className="field">
              Grade
              <select
                value={student.gradeId}
                onChange={(e) => upsertStudent({ ...student, gradeId: e.target.value })}
              >
                {ws.grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
              The grade's master schedule (recess, lunch, protected classes) applies
              automatically.
            </p>
            {(() => {
              const optionalLabels = [
                ...new Set(
                  (grade?.templateBlocks ?? []).flatMap((b) =>
                    b.optional && b.label ? [b.label] : [],
                  ),
                ),
              ];
              if (optionalLabels.length === 0) return null;
              const optedIn = student.optionalBlocks ?? [];
              return (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>Also blocked for this student</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px' }}>
                    Per-student periods from the {grade?.name} schedule (e.g. ELD for
                    NEP/LEP needs). Off = open for pull-out.
                  </p>
                  {optionalLabels.map((label) => (
                    <label key={label} className="rail-check">
                      <input
                        type="checkbox"
                        checked={optedIn.includes(label)}
                        onChange={(e) =>
                          upsertStudent({
                            ...student,
                            optionalBlocks: e.target.checked
                              ? [...optedIn, label]
                              : optedIn.filter((x) => x !== label),
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              );
            })()}
          </div>

        <div className="card split-card">
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Service</h2>
            {student.serviceGoals.map((g, i) => {
              const patchGoal = (patch: Partial<(typeof student.serviceGoals)[number]>) =>
                upsertStudent({
                  ...student,
                  serviceGoals: student.serviceGoals.map((x, xi) =>
                    xi === i ? { ...x, ...patch } : x,
                  ),
                });
              return (
                <div className="row" key={i} style={{ marginBottom: 8, rowGap: 6 }}>
                  <select value={g.providerId} onChange={(e) => patchGoal({ providerId: e.target.value })}>
                    {ws.providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={g.type}
                    title="Direct = pull-out minutes to schedule. Indirect = consult/monitoring only."
                    onChange={(e) =>
                      patchGoal(
                        e.target.value === 'indirect'
                          ? { type: 'indirect', minutes: undefined, period: undefined }
                          : { type: 'direct', minutes: g.minutes ?? 30, period: g.period ?? 'monthly' },
                      )
                    }
                  >
                    <option value="direct">Direct</option>
                    <option value="indirect">Indirect</option>
                  </select>
                  {g.type === 'direct' && (
                    <>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={g.minutes ?? 30}
                        style={{ width: 70 }}
                        onChange={(e) => patchGoal({ minutes: Number(e.target.value) })}
                      />
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>min per</span>
                      <select
                        value={g.period ?? 'monthly'}
                        onChange={(e) => patchGoal({ period: e.target.value as GoalPeriod })}
                      >
                        {GOAL_PERIODS.map((p) => (
                          <option key={p} value={p}>
                            {PERIOD_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    className="btn ghost small"
                    onClick={() =>
                      upsertStudent({
                        ...student,
                        serviceGoals: student.serviceGoals.filter((_, xi) => xi !== i),
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button
              className="btn small"
              disabled={ws.providers.length === 0}
              onClick={() =>
                upsertStudent({
                  ...student,
                  serviceGoals: [
                    ...student.serviceGoals,
                    { providerId: ws.providers[0].id, type: 'direct', minutes: 30, period: 'monthly' },
                  ],
                })
              }
            >
              + Add service
            </button>
          </div>

      </div>

      <div>
          <div className="legend" style={{ marginBottom: 8 }}>
            <span>
              <span className="swatch" style={{ background: 'var(--blocked-bg)' }} /> Blocked
            </span>
            <span>
              <span className="swatch" style={{ background: 'var(--gap-bg)' }} /> Gap
            </span>
            {ws.providers.map((p) => (
              <span key={p.id}>
                <span className="swatch" style={{ background: p.color }} /> {p.name}
              </span>
            ))}
          </div>
          <WeekGrid
            window={win}
            intervals={week}
            pxPerMinute={1.0}
            tickMinutes={30}
            onBlockClick={onBlockClick}
            onGapClick={onGapClick}
            gapAction="book / block"
            onSessionClick={(sessionId) => {
              const s = ws.sessions.find((x) => x.id === sessionId);
              if (!s) return;
              setBooking({
                sessionId,
                initial: {
                  providerId: s.providerId,
                  studentIds: s.studentIds,
                  day: s.day,
                  start: s.start,
                  durationMin: s.durationMin,
                  recurrence: s.recurrence,
                  weekParity: s.weekParity,
                  note: s.note,
                  verified: s.verified,
                },
              });
            }}
            sessionColor={(id) => provider(ws.sessions.find((s) => s.id === id)?.providerId ?? '')?.color ?? 'var(--ink)'}
            sessionContent={(i) => {
              const sess = ws.sessions.find((s) => s.id === i.sessionId);
              const tag = sess?.recurrence === 'biweekly' ? ` (${sess.weekParity})` : '';
              return <>{provider(sess?.providerId ?? '')?.name ?? 'Session'}{tag}</>;
            }}
          />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>This student's own schedule</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
          Blocks that apply only to Student {student.displayId}, on top of the{' '}
          {grade?.name ?? 'grade'} master schedule - their own ELD group, reading
          intervention, therapy elsewhere, etc.
        </p>
        <BlockListEditor
          blocks={personalBlockRows()}
          window={win}
          allowEveryDay
          labelOptions={ws.settings.avoidCategories}
          addLabel="personal block"
          onChange={setPersonalBlocks}
        />

        <h3 style={{ fontSize: 14, margin: '16px 0 4px' }}>Opened from the grade schedule</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
          Times where the grade schedule is blocked but this student IS available -
          click any blocked stretch on the calendar to open it.
        </p>
        {student.overrides
          .filter((o) => o.kind === 'unblock')
          .map((o) => (
            <div className="row" key={o.id} style={{ marginBottom: 6, fontSize: 13 }}>
              <span style={{ flex: 1 }}>
                <strong>Opened</strong> {DAY_NAMES[o.block.day]}{' '}
                {formatMinutesWithPeriod(o.block.start)}-{formatMinutesWithPeriod(o.block.end)}
              </span>
              <button className="btn ghost small" onClick={() => removeOverride(o.id)}>
                ✕
              </button>
            </div>
          ))}
        {!student.overrides.some((o) => o.kind === 'unblock') && (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            Nothing opened - the grade's blocked times all apply.
          </p>
        )}
      </div>

      {slotChoice && (
        <div className="modal-backdrop" onClick={() => setSlotChoice(null)}>
          <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
            <h2>
              {DAY_NAMES[slotChoice.day]} {formatMinutesWithPeriod(slotChoice.minutes)} - open time
            </h2>
            <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
              What should happen with this open slot?
            </p>
            <div className="stack" style={{ gap: 8 }}>
              <button
                className="btn primary"
                disabled={ws.providers.length === 0}
                onClick={() => {
                  setBooking({
                    initial: {
                      providerId: ws.providers[0]?.id ?? '',
                      studentIds: [student.id],
                      day: slotChoice.day,
                      start: slotChoice.minutes,
                      durationMin: 30,
                      recurrence: 'weekly',
                    },
                  });
                  setSlotChoice(null);
                }}
              >
                Book a session here
              </button>
              <button
                className="btn"
                onClick={() => {
                  setDraft({
                    kind: 'block',
                    day: slotChoice.day,
                    start: slotChoice.minutes,
                    end: Math.min(slotChoice.minutes + 30, win.end),
                    label: '',
                  });
                  setSlotChoice(null);
                }}
              >
                Block this time on Student {student.displayId}'s schedule
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn ghost small" onClick={() => setSlotChoice(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {booking && <BookingModal {...booking} onClose={() => setBooking(null)} />}

      {confirmingDelete && (
        <ConfirmModal
          title={`Delete Student ${student.displayId}?`}
          message={
            ws.sessions.some((s) => s.studentIds.includes(student.id))
              ? `They will be removed from ${ws.sessions.filter((s) => s.studentIds.includes(student.id)).length} booked session(s).`
              : 'This removes the student and their schedule.'
          }
          onConfirm={() => {
            deleteStudent(student.id);
            navigate('/students');
          }}
          onClose={() => setConfirmingDelete(false)}
        />
      )}

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{draft.kind === 'block' ? 'Block time for this student' : 'Open up blocked time'}</h2>
            <div className="stack">
              <div className="row">
                <label className="field">
                  Day
                  <select
                    value={draft.day}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        day: e.target.value === 'all' ? 'all' : (Number(e.target.value) as DayOfWeek),
                      })
                    }
                  >
                    <option value="all">Every day</option>
                    {DAY_NAMES.map((n, d) => (
                      <option key={d} value={d}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  From
                  <TimeSelect
                    value={draft.start}
                    min={win.start}
                    max={win.end - 5}
                    onChange={(m) => setDraft({ ...draft, start: m, end: Math.max(draft.end, m + 5) })}
                  />
                </label>
                <label className="field">
                  To
                  <TimeSelect
                    value={draft.end}
                    min={draft.start + 5}
                    max={win.end}
                    onChange={(m) => setDraft({ ...draft, end: m })}
                  />
                </label>
              </div>
              {draft.kind === 'block' && (
                <label className="field">
                  Reason (optional)
                  <input
                    value={draft.label}
                    placeholder="reading group, medical, …"
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  />
                </label>
              )}
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button className="btn primary" onClick={() => addOverride(draft)}>
                  {draft.kind === 'block' ? 'Add block' : 'Open time'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
