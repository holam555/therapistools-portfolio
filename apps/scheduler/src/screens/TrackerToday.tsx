import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { TimeSelect } from '../components/TimeSelect';
import {
  expectedVisits,
  findLog,
  formatDuration,
  isoDate,
  myProvider,
  owedMakeups,
} from '../domain/serviceLog';
import type { MissReason, SessionLog } from '../domain/types';
import { MAKEUP_DEFAULT, MISS_REASONS, formatMinutes } from '../domain/types';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

/**
 * The daily reconciliation view. The list is pre-set from the weekly
 * pattern, but each date can diverge on its own: a visit can be marked
 * seen or missed, moved to a different time for that day only, removed
 * from that day only, or added just for that day - all without touching
 * the recurring schedule.
 */

/** One line of the day: a pattern visit (with any day override) or an ad-hoc log. */
interface DayRow {
  key: string;
  studentId: string;
  /** Pattern session behind this row, if any. */
  sessionId?: string;
  /** The log that reshapes or resolves this row, if any. */
  log?: SessionLog;
  start?: number;
  minutes: number;
  adhoc: boolean;
  /** Log kept from a session that was since deleted or moved. */
  orphan?: boolean;
}

export function TodayTab() {
  const ws = useWorkspaceStore((s) => s.ws);
  const upsertSessionLog = useWorkspaceStore((s) => s.upsertSessionLog);
  const deleteSessionLog = useWorkspaceStore((s) => s.deleteSessionLog);

  const [date, setDate] = useState(() => isoDate(new Date()));
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraStudent, setExtraStudent] = useState('');
  const [extraMinutes, setExtraMinutes] = useState(30);
  const [extraStart, setExtraStart] = useState(ws.settings.schoolDayStart);
  const [extraMakeupFor, setExtraMakeupFor] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<SessionLog | null>(null);

  const me = myProvider(ws);
  const today = isoDate(new Date());
  const displayId = (id: string) => ws.students.find((s) => s.id === id)?.displayId ?? '?';

  const visits = me ? expectedVisits(ws, date, me.id) : [];
  const rows: DayRow[] = visits.map((v) => {
    const log = findLog(ws, v.sessionId, v.studentId, date);
    return {
      key: `${v.sessionId}:${v.studentId}`,
      studentId: v.studentId,
      sessionId: v.sessionId,
      log,
      start: log?.start ?? v.start,
      minutes: log?.minutes ?? v.minutes,
      adhoc: false,
    };
  });
  // Logs not claimed by a pattern visit still show: day-only additions, and
  // records whose booked session was later deleted or moved. Deleting a
  // session must never erase what the tracker recorded.
  const claimed = new Set(visits.map((v) => `${v.sessionId}:${v.studentId}`));
  for (const l of ws.sessionLogs.filter(
    (x) => x.date === date && (!x.sessionId || !claimed.has(`${x.sessionId}:${x.studentId}`)),
  )) {
    rows.push({
      key: l.id,
      studentId: l.studentId,
      log: l,
      start: l.start,
      minutes: l.minutes,
      adhoc: true,
      orphan: !!l.sessionId,
    });
  }
  rows.sort((a, b) => (a.start ?? 24 * 60) - (b.start ?? 24 * 60));

  const owed = owedMakeups(ws);
  const owedFor = (studentId: string) => owed.filter((l) => l.studentId === studentId);

  const seen = rows.filter((r) => r.log?.status === 'seen').length;
  const missed = rows.filter((r) => r.log?.status === 'missed').length;
  const skipped = rows.filter((r) => r.log?.status === 'skipped').length;
  const pending = rows.length - seen - missed - skipped;
  const toDocument = ws.sessionLogs.filter(
    (l) => l.date === date && (l.status === 'seen' || l.status === 'missed') && !l.documented,
  ).length;

  const patch = (l: SessionLog, p: Partial<SessionLog>) => upsertSessionLog({ ...l, ...p });

  /** Resolves a row to seen/missed - patching its day-plan log if one exists. */
  function resolve(row: DayRow, status: 'seen' | 'missed') {
    const base: SessionLog = row.log ?? {
      id: crypto.randomUUID(),
      date,
      studentId: row.studentId,
      sessionId: row.sessionId,
      minutes: row.minutes,
      start: row.start,
      status,
    };
    upsertSessionLog({
      ...base,
      status,
      ...(status === 'missed'
        ? { reason: base.reason ?? 'Student absent', makeupNeeded: base.makeupNeeded ?? MAKEUP_DEFAULT['Student absent'] }
        : {}),
    });
  }

  /** Day-only edit: store (or update) a 'planned' log carrying the new time. */
  function saveDayPlan(row: DayRow, start: number, minutes: number) {
    upsertSessionLog(
      row.log
        ? { ...row.log, start, minutes }
        : {
            id: crypto.randomUUID(),
            date,
            studentId: row.studentId,
            sessionId: row.sessionId,
            minutes,
            start,
            status: 'planned',
          },
    );
    setEditingKey(null);
  }

  /** Removes a pattern visit from this day only. */
  function skipForDay(row: DayRow) {
    upsertSessionLog({
      id: crypto.randomUUID(),
      date,
      studentId: row.studentId,
      sessionId: row.sessionId,
      minutes: row.minutes,
      start: row.start,
      status: 'skipped',
    });
  }

  function addExtra(status: 'planned' | 'seen') {
    if (!extraStudent) return;
    upsertSessionLog({
      id: crypto.randomUUID(),
      date,
      studentId: extraStudent,
      minutes: extraMinutes,
      start: extraStart,
      status,
      makeupForId: status === 'seen' && extraMakeupFor ? extraMakeupFor : undefined,
    });
    setExtraOpen(false);
    setExtraStudent('');
    setExtraMakeupFor('');
    setExtraMinutes(30);
  }

  function shiftDate(delta: number) {
    const d = new Date(`${date}T12:00`);
    d.setDate(d.getDate() + delta);
    setDate(isoDate(d));
  }

  function rowLabel(row: DayRow): string {
    const time = row.start !== undefined ? formatMinutes(row.start) : 'extra';
    const tag = row.orphan
      ? ' (session no longer on the schedule)'
      : row.log?.start !== undefined && !row.adhoc
        ? ' (moved, this day only)'
        : row.adhoc
          ? ' (this day only)'
          : '';
    return `${time} · Student ${displayId(row.studentId)} · ${row.minutes}m${tag}`;
  }

  function renderRow(row: DayRow) {
    const status = row.log?.status;

    if (status === 'skipped') {
      return (
        <div key={row.key} className="visit-row skipped">
          <div className="visit-who" style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>
            {rowLabel(row)}
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>removed from this day</span>
            <button
              className="btn ghost small"
              title="Put the visit back on this day"
              onClick={() => row.log && deleteSessionLog(row.log.id)}
            >
              ↻
            </button>
          </div>
        </div>
      );
    }

    if (editingKey === row.key) {
      return <RowEditor key={row.key} row={row} label={rowLabel(row)} onSave={saveDayPlan} onCancel={() => setEditingKey(null)} winStart={ws.settings.schoolDayStart} winEnd={ws.settings.schoolDayEnd} />;
    }

    // Pending: no log yet, or a day-plan waiting to happen.
    if (!status || status === 'planned') {
      return (
        <div key={row.key} className="visit-row">
          <div className="visit-who">{rowLabel(row)}</div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn small primary" onClick={() => resolve(row, 'seen')}>
              ✓ Seen
            </button>
            <button className="btn small" onClick={() => resolve(row, 'missed')}>
              Not seen
            </button>
            <button
              className="btn ghost small"
              title="Change the time or length for this day only"
              onClick={() => setEditingKey(row.key)}
            >
              ✎
            </button>
            {!row.adhoc ? (
              <button className="btn ghost small" title="Remove this visit from this day only - the weekly schedule keeps it" onClick={() => skipForDay(row)}>
                ✕
              </button>
            ) : (
              <button
                className="btn ghost small"
                title="Remove this added visit"
                onClick={() => row.log && deleteSessionLog(row.log.id)}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      );
    }

    const l = row.log!;
    return (
      <div key={row.key} className="visit-row">
        <div className="visit-who">{rowLabel(row)}</div>
        {l.status === 'seen' ? (
          <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="visit-state seen">Seen</span>
            <input
              type="number"
              min={5}
              step={5}
              value={l.minutes}
              style={{ width: 62 }}
              onChange={(e) => patch(l, { minutes: Math.max(5, Number(e.target.value) || 5) })}
            />
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>min</span>
            {(owedFor(l.studentId).length > 0 || l.makeupForId) && (
              <select
                value={l.makeupForId ?? ''}
                title="Count this delivery against an owed make-up"
                onChange={(e) => patch(l, { makeupForId: e.target.value || undefined })}
              >
                <option value="">not a make-up</option>
                {owed
                  .filter((o) => o.studentId === l.studentId || o.id === l.makeupForId)
                  .concat(
                    l.makeupForId && !owed.some((o) => o.id === l.makeupForId)
                      ? ws.sessionLogs.filter((o) => o.id === l.makeupForId)
                      : [],
                  )
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      make-up for {o.date} ({o.minutes}m)
                    </option>
                  ))}
              </select>
            )}
          </div>
        ) : (
          <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="visit-state missed">Not seen</span>
            <select
              value={l.reason}
              onChange={(e) => {
                const reason = e.target.value as MissReason;
                patch(l, { reason, makeupNeeded: MAKEUP_DEFAULT[reason] });
              }}
            >
              {MISS_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <label className="row" style={{ gap: 4, fontSize: 13, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={l.makeupNeeded ?? false}
                onChange={(e) => patch(l, { makeupNeeded: e.target.checked })}
              />
              make up
            </label>
          </div>
        )}
        <div className="row" style={{ gap: 4 }}>
          <button
            className={`btn small${l.documented ? ' doc-on' : ''}`}
            title={
              l.documented
                ? 'Documentation entered - tap to unmark'
                : 'Tap once the note is written in your documentation system'
            }
            onClick={() => patch(l, { documented: !l.documented })}
          >
            {l.documented ? '✓ Doc' : 'Doc?'}
          </button>
          <button className="btn ghost small" title="Clear this log (back to pending)" onClick={() => setConfirmClear(l)}>
            ↻
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!me && (
        <div className="card">
          Add yourself on the <Link to="/providers">Providers page</Link> first - the checklist
          shows the sessions of the provider marked as "me".
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost small" title="Previous day" onClick={() => shiftDate(-1)}>
              ‹
            </button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <button className="btn ghost small" title="Next day" onClick={() => shiftDate(1)}>
              ›
            </button>
            {date !== today && (
              <button className="btn ghost small" onClick={() => setDate(today)}>
                Today
              </button>
            )}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {rows.length > 0 && (
              <>
                <span className="chip">{seen} seen</span>
                <span className="chip">{missed} missed</span>
                {pending > 0 && <span className="chip total">{pending} pending</span>}
                {skipped > 0 && <span className="chip">{skipped} removed</span>}
              </>
            )}
            {toDocument > 0 && <span className="chip doc-due">{toDocument} to document</span>}
            <button className="btn small" onClick={() => setExtraOpen((x) => !x)}>
              + Add to this day
            </button>
          </div>
        </div>

        {extraOpen && (
          <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={extraStudent}
              onChange={(e) => {
                setExtraStudent(e.target.value);
                setExtraMakeupFor('');
              }}
            >
              <option value="">Student...</option>
              {ws.students.map((s) => (
                <option key={s.id} value={s.id}>
                  Student {s.displayId}
                </option>
              ))}
            </select>
            <TimeSelect
              value={extraStart}
              min={ws.settings.schoolDayStart}
              max={ws.settings.schoolDayEnd - 5}
              onChange={setExtraStart}
            />
            <input
              type="number"
              min={5}
              step={5}
              value={extraMinutes}
              style={{ width: 62 }}
              onChange={(e) => setExtraMinutes(Math.max(5, Number(e.target.value) || 5))}
            />
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>min</span>
            {extraStudent && owedFor(extraStudent).length > 0 && (
              <select value={extraMakeupFor} onChange={(e) => setExtraMakeupFor(e.target.value)}>
                <option value="">not a make-up</option>
                {owedFor(extraStudent).map((o) => (
                  <option key={o.id} value={o.id}>
                    make-up for {o.date} ({o.minutes}m)
                  </option>
                ))}
              </select>
            )}
            <button
              className="btn small"
              disabled={!extraStudent}
              title="Put the visit on this day's list to mark seen or missed later"
              onClick={() => addExtra('planned')}
            >
              Add to day
            </button>
            <button
              className="btn primary small"
              disabled={!extraStudent}
              title="It already happened - log it as seen right away"
              onClick={() => addExtra('seen')}
            >
              Log as seen
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            {me
              ? 'No sessions booked on this day. "+ Add to this day" plans one for this date only.'
              : ''}
          </div>
        ) : (
          <div className="stack" style={{ gap: 0, marginTop: 10 }}>
            {rows.map((row) => renderRow(row))}
          </div>
        )}
      </div>

      {owed.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Make-ups owed ({formatDuration(owed.reduce((s, l) => s + l.minutes, 0))})
          </h2>
          <div className="stack" style={{ gap: 0 }}>
            {owed.map((l) => (
              <div key={l.id} className="visit-row">
                <div className="visit-who">
                  Student {displayId(l.studentId)} · {l.minutes}m missed {l.date}
                  {l.reason ? ` (${l.reason})` : ''}
                </div>
                <button
                  className="btn small"
                  title="Log the make-up as delivered on the selected day"
                  onClick={() =>
                    upsertSessionLog({
                      id: crypto.randomUUID(),
                      date,
                      studentId: l.studentId,
                      minutes: l.minutes,
                      status: 'seen',
                      makeupForId: l.id,
                    })
                  }
                >
                  Made up on {date === today ? 'today' : date}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear this log?"
          message={`Student ${displayId(confirmClear.studentId)} on ${confirmClear.date} goes back to pending, as if nothing was recorded.`}
          confirmLabel="Clear"
          onConfirm={() => deleteSessionLog(confirmClear.id)}
          onClose={() => setConfirmClear(null)}
        />
      )}
    </>
  );
}

/** Inline editor for one row's day-only time and length. */
function RowEditor({
  row,
  label,
  onSave,
  onCancel,
  winStart,
  winEnd,
}: {
  row: DayRow;
  label: string;
  onSave: (row: DayRow, start: number, minutes: number) => void;
  onCancel: () => void;
  winStart: number;
  winEnd: number;
}) {
  const [start, setStart] = useState(row.start ?? winStart);
  const [minutes, setMinutes] = useState(row.minutes);
  return (
    <div className="visit-row">
      <div className="visit-who">{label}</div>
      <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <TimeSelect value={start} min={winStart} max={winEnd - 5} onChange={setStart} />
        <input
          type="number"
          min={5}
          step={5}
          value={minutes}
          style={{ width: 62 }}
          onChange={(e) => setMinutes(Math.max(5, Number(e.target.value) || 5))}
        />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>min</span>
        <button className="btn primary small" onClick={() => onSave(row, start, minutes)}>
          Save for this day
        </button>
        <button className="btn ghost small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
