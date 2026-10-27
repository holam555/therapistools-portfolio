import { useState } from 'react';
import { useEscapeToClose } from './useEscapeToClose';
import { TimeSelect } from './TimeSelect';
import { describeGroupingWarning, groupingWarnings } from '../domain/grouping';
import { findSiblingSessions } from '../domain/schedule';
import type { SessionDraft } from '../domain/validation';
import {
  conflictKey,
  describeConflict,
  existingConflictKeys,
  partitionConflicts,
  validateBooking,
} from '../domain/validation';
import type { DayOfWeek, Session, SessionLength, WeekParity } from '../domain/types';
import { DAY_NAMES, SESSION_LENGTHS } from '../domain/types';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';

export interface BookingModalProps {
  /** Existing session id when editing; undefined when creating. */
  sessionId?: string;
  initial: SessionDraft & { note?: string; verified?: boolean };
  onClose: () => void;
}

/** Dialog-local draft: day may be 'all' (book the session Mon-Fri at once). */
type DialogDraft = Omit<SessionDraft, 'day'> & {
  day: DayOfWeek | 'all';
  note?: string;
  verified?: boolean;
};

export function BookingModal({ sessionId, initial, onClose }: BookingModalProps) {
  const ws = useWorkspaceStore((s) => s.ws);
  const addSession = useWorkspaceStore((s) => s.addSession);
  const addSessions = useWorkspaceStore((s) => s.addSessions);
  const updateSession = useWorkspaceStore((s) => s.updateSession);
  const updateSessions = useWorkspaceStore((s) => s.updateSessions);
  const deleteSessions = useWorkspaceStore((s) => s.deleteSessions);
  // Sessions booked by hand in this dialog are verified by definition;
  // imported ones arrive unverified and get ticked after a manual check.
  const [draft, setDraft] = useState<DialogDraft>({
    ...initial,
    verified: initial.verified ?? (sessionId ? undefined : true),
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [applyAll, setApplyAll] = useState(true);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [copiedDays, setCopiedDays] = useState<string[]>([]);
  useEscapeToClose(onClose);

  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  // When editing, conflicts the session already has today never lock the
  // dialog - only conflicts this edit would newly introduce block saving.
  const stored = sessionId ? ws.sessions.find((s) => s.id === sessionId) : undefined;
  const grandfathered = stored ? existingConflictKeys(stored, ws) : new Set<string>();
  // The same session repeated on other days (a daily LS/para schedule):
  // one save or delete can apply to the whole set.
  const siblings = stored ? findSiblingSessions(stored, ws) : [];

  // 'Every day' validates each weekday separately: days that would gain a new
  // hard conflict get skipped on save; only all-five-blocked disables saving.
  const targetDays: DayOfWeek[] = draft.day === 'all' ? [0, 1, 2, 3, 4] : [draft.day];
  const perDay = targetDays.map((day) => {
    const d: SessionDraft = { ...draft, day };
    const { hard, soft } = partitionConflicts(validateBooking(d, ws, sessionId), d, ws, grandfathered);
    return { day, hard, soft };
  });
  const dayTag = (day: DayOfWeek) => (draft.day === 'all' ? `${DAY_NAMES[day]}: ` : '');
  const conflicts = perDay.flatMap((p) => p.hard.map((c) => ({ day: p.day, c })));
  const overlapWarnings = perDay.flatMap((p) => p.soft.map((c) => ({ day: p.day, c })));
  const blockedDayCount = perDay.filter((p) => p.hard.length > 0).length;
  const saveBlocked = draft.day === 'all' ? blockedDayCount === targetDays.length : blockedDayCount > 0;
  const warnings = groupingWarnings(draft.studentIds, ws);
  const provider = ws.providers.find((p) => p.id === draft.providerId);

  function toggleStudent(id: string) {
    setDraft((d) => ({
      ...d,
      studentIds: d.studentIds.includes(id)
        ? d.studentIds.filter((x) => x !== id)
        : [...d.studentIds, id],
    }));
  }

  function save() {
    const base = {
      providerId: draft.providerId,
      studentIds: draft.studentIds,
      start: draft.start,
      durationMin: draft.durationMin,
      recurrence: draft.recurrence,
      weekParity: draft.recurrence === 'biweekly' ? (draft.weekParity ?? 'A') : undefined,
      note: draft.note?.trim() || undefined,
      verified: draft.verified || undefined,
    };

    if (draft.day === 'all') {
      // Book (or extend to) every weekday; conflicted days are skipped.
      const okDays = perDay.filter((p) => p.hard.length === 0).map((p) => p.day);
      const skipped = perDay.filter((p) => p.hard.length > 0).map((p) => DAY_NAMES[p.day]);
      if (sessionId && stored) {
        if (okDays.includes(stored.day)) updateSession({ id: sessionId, ...base, day: stored.day });
        addSessions(okDays.filter((d) => d !== stored.day).map((day) => ({ id: newId(), ...base, day })));
      } else {
        addSessions(okDays.map((day) => ({ id: newId(), ...base, day })));
      }
      if (skipped.length > 0) {
        setBulkNotice(
          `Booked ${okDays.length} day(s). Skipped ${skipped.join(', ')} - there's a conflict there; book those days individually.`,
        );
        return;
      }
      onClose();
      return;
    }

    const session: Session = { id: sessionId ?? newId(), ...base, day: draft.day };
    if (!sessionId) {
      addSession(session);
      onClose();
      return;
    }
    if (!applyAll || siblings.length === 0) {
      updateSession(session);
      onClose();
      return;
    }
    // Apply the change to every sibling, each keeping its own day. A sibling
    // is skipped if the change would create a brand-new hard conflict there.
    const updates: Session[] = [session];
    const skippedDays: string[] = [];
    for (const sib of siblings) {
      const candidate: Session = { ...session, id: sib.id, day: sib.day };
      const sibDraft: SessionDraft = { ...candidate };
      const { hard } = partitionConflicts(
        validateBooking(sibDraft, ws, sib.id),
        sibDraft,
        ws,
        existingConflictKeys(sib, ws),
      );
      if (hard.length > 0) skippedDays.push(DAY_NAMES[sib.day]);
      else updates.push(candidate);
    }
    updateSessions(updates);
    if (skippedDays.length > 0) {
      setBulkNotice(
        `Applied to ${updates.length} day(s). Skipped ${skippedDays.join(', ')} - the change would create a new conflict there; edit those days individually.`,
      );
      return;
    }
    onClose();
  }

  /** Books an identical session (as currently drafted) on another weekday. */
  function copyToDay(day: DayOfWeek) {
    addSession({
      id: newId(),
      providerId: draft.providerId,
      studentIds: draft.studentIds,
      day,
      start: draft.start,
      durationMin: draft.durationMin,
      recurrence: draft.recurrence,
      weekParity: draft.recurrence === 'biweekly' ? (draft.weekParity ?? 'A') : undefined,
      note: draft.note?.trim() || undefined,
      verified: draft.verified || undefined,
    });
    setCopiedDays((c) => [...c, DAY_NAMES[day]]);
  }

  function remove() {
    if (!sessionId) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const ids = applyAll ? [sessionId, ...siblings.map((s) => s.id)] : [sessionId];
    deleteSessions(ids);
    onClose();
  }

  const sortedStudents = [...ws.students].sort((a, b) =>
    a.displayId.localeCompare(b.displayId, undefined, { numeric: true }),
  );

  if (bulkNotice) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
          <h2>Change applied</h2>
          <p style={{ color: 'var(--ink-soft)' }}>{bulkNotice}</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{sessionId ? 'Edit session' : 'Book a session'}</h2>
        <div className="stack">
          <label className="field">
            Provider
            <select
              value={draft.providerId}
              onChange={(e) => setDraft({ ...draft, providerId: e.target.value })}
            >
              {ws.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

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
              Starts
              <TimeSelect
                value={draft.start}
                min={win.start}
                max={win.end - 10}
                onChange={(m) => setDraft({ ...draft, start: m })}
              />
            </label>
            <label className="field">
              Length
              <div className="segmented">
                {SESSION_LENGTHS.map((len) => (
                  <button
                    key={len}
                    className={draft.durationMin === len ? 'on' : ''}
                    onClick={() => setDraft({ ...draft, durationMin: len as SessionLength })}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <label className="field">
            Repeats
            <div className="segmented">
              <button
                className={draft.recurrence === 'weekly' ? 'on' : ''}
                onClick={() => setDraft({ ...draft, recurrence: 'weekly', weekParity: undefined })}
              >
                Every week
              </button>
              {(['A', 'B'] as WeekParity[]).map((p) => (
                <button
                  key={p}
                  className={draft.recurrence === 'biweekly' && draft.weekParity === p ? 'on' : ''}
                  onClick={() => setDraft({ ...draft, recurrence: 'biweekly', weekParity: p })}
                >
                  Week {p} only
                </button>
              ))}
            </div>
          </label>

          {sessionId && draft.day !== 'all' && (
            <label className="field">
              Copy to another day
              <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {DAY_NAMES.map((name, d) => {
                  const day = d as DayOfWeek;
                  const already = day === draft.day || siblings.some((sib) => sib.day === day);
                  const candidate: SessionDraft = { ...draft, day };
                  // A copy is a brand-new session, so nothing is grandfathered.
                  const { hard } = partitionConflicts(validateBooking(candidate, ws), candidate, ws);
                  const blocked = !already && hard.length > 0;
                  return (
                    <button
                      key={d}
                      className="btn small"
                      disabled={already || blocked}
                      title={
                        already
                          ? 'This session is already on that day'
                          : blocked
                            ? describeConflict(hard[0], ws)
                            : `Book the same session (as shown above) on ${name}`
                      }
                      onClick={() => copyToDay(day)}
                    >
                      {name}
                    </button>
                  );
                })}
                {copiedDays.length > 0 && (
                  <span style={{ color: 'var(--gap-ink)', fontSize: 13, fontWeight: 600 }}>
                    ✓ copied to {copiedDays.join(', ')}
                  </span>
                )}
              </div>
            </label>
          )}

          <label className="field">
            Students {draft.studentIds.length > 1 ? `(group of ${draft.studentIds.length})` : ''}
            <div className="rail-list" style={{ maxHeight: 160, border: '1px solid var(--line)', borderRadius: 8, padding: 6 }}>
              {sortedStudents.map((s) => (
                <label key={s.id} className="rail-check">
                  <input
                    type="checkbox"
                    checked={draft.studentIds.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                  />
                  Student {s.displayId}
                </label>
              ))}
            </div>
          </label>

          <label className="field">
            Note (optional)
            <input
              value={draft.note ?? ''}
              placeholder="fine motor group, articulation, …"
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>

          {sessionId && (
            <label className="rail-check" title="Tick after checking this session against the provider's real schedule. Shows a ✓ on the calendar.">
              <input
                type="checkbox"
                checked={draft.verified ?? false}
                onChange={(e) => setDraft({ ...draft, verified: e.target.checked || undefined })}
              />
              Verified by hand against the real schedule
              {(draft.verified ?? false) && <span style={{ color: 'var(--gap-ink)', fontWeight: 700 }}>✓</span>}
            </label>
          )}

          {(warnings.length > 0 || overlapWarnings.length > 0) && (
            <ul className="warning-list">
              {overlapWarnings.map((x, i) => (
                <li key={`o${i}`}>
                  ⚠ {dayTag(x.day)}
                  {describeConflict(x.c, ws)} -{' '}
                  {grandfathered.has(conflictKey(x.c))
                    ? 'already the case before this change'
                    : 'overlap allowed with a warning'}
                </li>
              ))}
              {warnings.map((w, i) => (
                <li key={i}>⚠ {describeGroupingWarning(w, ws)} - you can still book</li>
              ))}
            </ul>
          )}

          {conflicts.length > 0 ? (
            <ul className="conflict-list">
              {conflicts.map((x, i) => (
                <li key={i}>⚠ {dayTag(x.day)}{describeConflict(x.c, ws)}</li>
              ))}
              {draft.day === 'all' && !saveBlocked && (
                <li style={{ color: 'var(--ink-soft)' }}>
                  Days with conflicts are skipped - the rest still book.
                </li>
              )}
            </ul>
          ) : overlapWarnings.length === 0 ? (
            <div className="ok-note">
              ✓ Open for {provider?.name ?? 'provider'} and{' '}
              {draft.studentIds.length === 1
                ? `Student ${ws.students.find((s) => s.id === draft.studentIds[0])?.displayId ?? ''}`
                : `all ${draft.studentIds.length} students`}
              . Booking blocks this time on every calendar at once.
            </div>
          ) : null}

          {sessionId && siblings.length > 0 && draft.day !== 'all' && (
            <label className="rail-check" style={{ background: 'var(--accent-soft)', borderRadius: 8, padding: '6px 10px' }}>
              <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
              Apply to the same session on {siblings.length} other day
              {siblings.length > 1 ? 's' : ''} ({siblings.map((s) => DAY_NAMES[s.day]).join(', ')}) -
              each keeps its own day
            </label>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              {sessionId && (
                <button className="btn danger" onClick={remove} onBlur={() => setConfirmingDelete(false)}>
                  {confirmingDelete
                    ? `Really delete${applyAll && siblings.length > 0 ? ` all ${siblings.length + 1}` : ''}?`
                    : `Delete session${applyAll && siblings.length > 0 ? ` (${siblings.length + 1} days)` : ''}`}
                </button>
              )}
            </div>
            <div className="row">
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary" disabled={saveBlocked} onClick={save}>
                {sessionId ? 'Save changes' : draft.day === 'all' ? 'Book Mon-Fri' : 'Book it'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
