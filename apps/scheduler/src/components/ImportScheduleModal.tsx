import { useMemo, useRef, useState } from 'react';
import { useEscapeToClose } from './useEscapeToClose';
import { detectShape, parseScheduleGrid, type ParsedSchedule, type ScheduleShape } from '../domain/importSchedule';
import { parseWorkbookSchedule } from '../domain/importWorkbook';
import { readWorkbook } from '../storage/readWorkbook';
import { describeConflict, partitionConflicts, validateBooking } from '../domain/validation';
import type { Provider, Session } from '../domain/types';
import { DAY_NAMES, formatMinutesWithPeriod } from '../domain/types';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';

interface ImportScheduleModalProps {
  provider: Provider;
  onClose: () => void;
}

/**
 * Paste a schedule grid straight from Excel (time column + Mon-Fri columns,
 * cells naming student numbers) and bulk-book it as weekly sessions with
 * two-sided blocking.
 */
export function ImportScheduleModal({ provider, onClose }: ImportScheduleModalProps) {
  const ws = useWorkspaceStore((s) => s.ws);
  const addSessions = useWorkspaceStore((s) => s.addSessions);
  const deleteSessionsForProvider = useWorkspaceStore((s) => s.deleteSessionsForProvider);
  const [text, setText] = useState('');
  const [shape, setShape] = useState<ScheduleShape>('columns');
  // Shape is auto-detected from the paste until the user picks one by hand.
  const [shapeLocked, setShapeLocked] = useState(false);
  const [fileParsed, setFileParsed] = useState<ParsedSchedule | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  /** Rows the user chose to import despite a conflict (keyed by content). */
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEscapeToClose(onClose);

  const existingCount = ws.sessions.filter((s) => s.providerId === provider.id).length;

  async function handleFile(f: File) {
    setFileError(null);
    try {
      const sheet = await readWorkbook(f);
      setFileParsed(parseWorkbookSchedule(sheet, ws));
      setFileName(f.name);
      setText('');
    } catch (err) {
      setFileError(err instanceof Error ? err.message : String(err));
      setFileParsed(null);
      setFileName(null);
    }
  }

  const textParsed = useMemo(
    () => (text.trim() ? parseScheduleGrid(text, ws, shape) : null),
    [text, ws, shape],
  );
  const parsed = fileParsed ?? textParsed;

  // Validate each parsed session. Provider-unavailable is only a soft note here:
  // the paste IS the provider's schedule; availability can be filled in later.
  const rows = useMemo(() => {
    if (!parsed) return [];
    const baseline = replaceExisting
      ? { ...ws, sessions: ws.sessions.filter((s) => s.providerId !== provider.id) }
      : ws;
    const accepted: Session[] = [];
    const out = parsed.sessions.map((p) => {
      const draft = {
        providerId: provider.id,
        studentIds: p.studentIds,
        day: p.day,
        start: p.start,
        durationMin: p.durationMin,
        recurrence: 'weekly' as const,
      };
      const simulated = { ...baseline, sessions: [...baseline.sessions, ...accepted] };
      const all = validateBooking(draft, simulated);
      const { hard, soft } = partitionConflicts(
        all.filter((c) => c.type !== 'provider-unavailable'),
        draft,
        simulated,
      );
      const offSite = all.some((c) => c.type === 'provider-unavailable');
      const session: Session = { id: newId(), ...draft };
      // Key by content, not index, so an override survives re-parsing.
      const key = `${p.day}|${p.start}|${p.durationMin}|${p.studentDisplayIds.join(',')}`;
      const forced = overrides.has(key);
      if (hard.length === 0 || forced) accepted.push(session);
      return { parsed: p, session, conflicts: hard, soft, offSite, key, forced };
    });
    return out;
  }, [parsed, ws, provider.id, replaceExisting, overrides]);

  const importable = rows.filter((r) => r.conflicts.length === 0 || r.forced);
  const blockedRows = rows.filter((r) => r.conflicts.length > 0 && !r.forced);

  // A "same every day" paste becomes five identical sessions. Show them as
  // ONE "Every day" line so the preview reads like the sheet it came from;
  // the five real sessions are still what gets imported.
  const displayGroups = useMemo(() => {
    const byPattern = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.parsed.start}|${r.parsed.durationMin}|${r.parsed.studentDisplayIds.join(',')}`;
      byPattern.set(key, [...(byPattern.get(key) ?? []), r]);
    }
    const emitted = new Set<string>();
    const out: Array<{ members: typeof rows; everyDay: boolean }> = [];
    for (const r of rows) {
      const key = `${r.parsed.start}|${r.parsed.durationMin}|${r.parsed.studentDisplayIds.join(',')}`;
      const members = byPattern.get(key)!;
      const allWeek =
        members.length === 5 && new Set(members.map((m) => m.parsed.day)).size === 5;
      if (allWeek) {
        if (emitted.has(key)) continue;
        emitted.add(key);
        out.push({ members, everyDay: true });
      } else {
        out.push({ members: [r], everyDay: false });
      }
    }
    return out;
  }, [rows]);
  const anyOffSite = rows.some((r) => r.offSite);

  function runImport() {
    if (replaceExisting) deleteSessionsForProvider(provider.id);
    addSessions(importable.map((r) => r.session));
    setDone(importable.length);
  }

  if (done !== null) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
          <h2>Imported {done} session(s)</h2>
          <p style={{ color: 'var(--ink-soft)' }}>
            {provider.name}'s sessions are booked and the time is now blocked on every
            student's calendar too.
            {anyOffSite &&
              ` Some sessions fall outside ${provider.name}'s on-site availability - update it on this page so their open time shows correctly.`}
          </p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
        <h2>Import {provider.name}'s schedule</h2>
        <div className="stack">
          <div className="row">
            <button className="btn primary small" onClick={() => fileRef.current?.click()}>
              📄 Upload Excel file (.xlsx)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
            {fileName && (
              <span className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                {fileName}
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setFileParsed(null);
                    setFileName(null);
                  }}
                >
                  ✕
                </button>
              </span>
            )}
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              - best for color-coded or merged-cell sheets - or paste cells below.
            </span>
          </div>
          {fileError && (
            <ul className="conflict-list">
              <li>⚠ Couldn't read the file: {fileError}</li>
            </ul>
          )}

          <details style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              What can be recognized - and what can't
            </summary>
            <div className="stack" style={{ gap: 8, marginTop: 8 }}>
              <div>
                <strong>Recognized automatically:</strong> a time column (ranges like
                8-8:30, or 5-minute slot times); Mon-Fri day headers (no headers = same
                schedule every day); student numbers as 12, 14 or 十二號, 十四號; several
                students in one cell = a group; "Group 3 十四號" = Student 14 (Group 3 is
                a label); merged cells = the session's length; a time range written inside
                a cell (e.g. 七號 10:00-10:30) overrides everything; long blocks are split
                into 10-30 minute sessions.
              </div>
              <div>
                <strong>Cannot be recognized - fix these in Excel first:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  <li>
                    A colored cell with no student number - color says <em>when</em>, never{' '}
                    <em>who</em>. Type the student number into the cell.
                  </li>
                  <li>Student names - ignored on purpose (privacy). Use numbers only.</li>
                  <li>Teacher, location, and notes columns - ignored.</li>
                  <li>Week A/B alternating sessions - import as weekly, then click the session to change it.</li>
                </ul>
              </div>
              <div>
                <strong>Good practice</strong> - a sheet that imports perfectly:
                <pre
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 8,
                    margin: '4px 0 0',
                    fontSize: 12,
                    overflowX: 'auto',
                  }}
                >{`        Mon        Tues       Weds       Thurs      Fri
8-8:30  十二號 十四號  十二號 十四號                    12, 14
8:30-9             七號
9-9:45  五號                  五號`}</pre>
                One row per time, one cell per session, numbers only - that's all it takes.
              </div>
            </div>
          </details>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!shapeLocked) setShape(detectShape(e.target.value));
            }}
            placeholder={'e.g. weekly grid:\n\tMon\tTues\tWeds\tThurs\tFri\n8-8:15\t十二號 十四號\t…\n\nor a daily list:\n8:45-9:15\t十二號\n10-10:15\t十七號'}
            rows={6}
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              border: '1px solid var(--line-strong)',
              borderRadius: 8,
              padding: 8,
              resize: 'vertical',
            }}
          />

          {text.trim() && !fileParsed && (
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>
                Recognized as:
              </span>
              <div className="segmented">
                <button
                  className={shape === 'columns' ? 'on' : ''}
                  onClick={() => {
                    setShape('columns');
                    setShapeLocked(true);
                  }}
                >
                  Mon-Fri grid
                </button>
                <button
                  className={shape === 'everyday' ? 'on' : ''}
                  onClick={() => {
                    setShape('everyday');
                    setShapeLocked(true);
                  }}
                >
                  Same every day
                </button>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {shapeLocked ? 'set by you' : 'detected from the paste - click to override'}
              </span>
            </div>
          )}

          {parsed && parsed.issues.length > 0 && (
            <ul className="warning-list">
              {parsed.issues.map((iss, i) => (
                <li key={i}>
                  ⚠ Row {iss.line}: {iss.message}
                </li>
              ))}
            </ul>
          )}

          {parsed && rows.length > 0 && (
            <>
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Students</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayGroups.map((g, i) => {
                      const first = g.members[0];
                      const clashing = g.members.filter((m) => m.conflicts.length > 0);
                      const forcedCount = clashing.filter((m) => m.forced).length;
                      const allForced = clashing.length > 0 && forcedCount === clashing.length;
                      const conflictText = [
                        ...new Set(
                          clashing.flatMap((m) => m.conflicts.map((c) => describeConflict(c, ws))),
                        ),
                      ].join('; ');
                      const softText = [
                        ...new Set(g.members.flatMap((m) => m.soft.map((c) => describeConflict(c, ws)))),
                      ].join('; ');
                      const partial = g.everyDay && clashing.length > 0 && clashing.length < g.members.length;
                      return (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {g.everyDay ? 'Every day' : DAY_NAMES[first.parsed.day]}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {formatMinutesWithPeriod(first.parsed.start)}-
                            {formatMinutesWithPeriod(first.parsed.start + first.parsed.durationMin)}
                          </td>
                          <td>{first.parsed.studentDisplayIds.join(', ')}</td>
                          <td>
                            {clashing.length > 0 ? (
                              <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                                <span style={{ color: allForced ? '#8a6d1d' : 'var(--danger)', fontWeight: 600 }}>
                                  {allForced && '⚠ '}
                                  {conflictText}
                                  {partial &&
                                    ` (${clashing.map((m) => DAY_NAMES[m.parsed.day]).join('/')} only)`}
                                  {allForced ? ' - importing anyway' : ' - skipped'}
                                </span>
                                <button
                                  className="btn ghost small"
                                  title={
                                    allForced
                                      ? 'Skip after all'
                                      : 'Import anyway - the conflict stays visible on the calendars'
                                  }
                                  onClick={() => {
                                    const next = new Set(overrides);
                                    for (const m of clashing) {
                                      if (allForced) next.delete(m.key);
                                      else next.add(m.key);
                                    }
                                    setOverrides(next);
                                  }}
                                >
                                  {allForced ? 'Undo' : 'Add anyway'}
                                </button>
                              </span>
                            ) : softText ? (
                              <span style={{ color: '#8a6d1d', fontWeight: 600 }}>
                                ⚠ {softText} - imports anyway
                              </span>
                            ) : (
                              <span style={{ color: 'var(--gap-ink)', fontWeight: 700 }}>✓ ready</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {blockedRows.length > 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
                  {blockedRows.length} session(s) clash with blocked time or another
                  booking. Real schedules do overlap - use "Add anyway" on any row you
                  want imported despite the clash, or{' '}
                  <button
                    className="btn ghost small"
                    onClick={() => setOverrides(new Set([...overrides, ...blockedRows.map((r) => r.key)]))}
                  >
                    Add all {blockedRows.length} anyway
                  </button>
                </p>
              )}
              {anyOffSite && (
                <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
                  Note: some sessions are outside {provider.name}'s current on-site
                  availability - they'll import anyway; update availability afterwards.
                </p>
              )}
            </>
          )}

          {parsed && rows.length === 0 && parsed.issues.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Nothing recognized yet - make sure the day header row came along with the paste.
            </p>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            {existingCount > 0 ? (
              <label className="rail-check" style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
                Replace {provider.name}'s {existingCount} existing session(s)
              </label>
            ) : (
              <span />
            )}
            <div className="row">
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary" disabled={importable.length === 0} onClick={runImport}>
                Import {importable.length} session(s)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
