import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookingModal, type BookingModalProps } from '../components/BookingModal';
import { WeekGrid } from '../components/WeekGrid';
import { WeekParityToggle } from '../components/WeekParityToggle';
import { computeStudentWeek, computeStudentWeekAll } from '../domain/schedule';
import type { DayOfWeek, Minutes } from '../domain/types';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function GapBoardScreen() {
  const ws = useWorkspaceStore((s) => s.ws);
  const parity = useWorkspaceStore((s) => s.parity);
  // Starts on the first four students; the checkboxes below are the only
  // thing that decides who is shown.
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() =>
    [...ws.students]
      .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true }))
      .slice(0, 4)
      .map((s) => s.id),
  );
  const [booking, setBooking] = useState<Omit<BookingModalProps, 'onClose'> | null>(null);

  // Switching schools (or arriving before students existed) leaves the
  // selection pointing at ids that are gone: fall back to the first four.
  const noneShown =
    ws.students.length > 0 && !selectedStudentIds.some((id) => ws.students.some((s) => s.id === id));
  useEffect(() => {
    if (noneShown) {
      setSelectedStudentIds(
        [...ws.students]
          .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true }))
          .slice(0, 4)
          .map((s) => s.id),
      );
    }
  }, [noneShown, ws.students]);

  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  const providerById = (id: string) => ws.providers.find((p) => p.id === id);

  const shownStudents = useMemo(
    () =>
      ws.students
        .filter((s) => selectedStudentIds.includes(s.id))
        .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true })),
    [ws.students, selectedStudentIds],
  );

  function toggleStudent(id: string) {
    setSelectedStudentIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  function openBooking(studentId: string, day: DayOfWeek, minutes: Minutes) {
    setBooking({
      initial: {
        providerId: ws.providers[0]?.id ?? '',
        studentIds: [studentId],
        day,
        start: minutes,
        durationMin: 30,
        recurrence: 'weekly',
      },
    });
  }

  function openSession(sessionId: string) {
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
  }

  if (ws.students.length === 0) {
    return (
      <div className="empty-state">
        <h2>Welcome to the Gap Board</h2>
        <p>
          Set up your school first: add <Link to="/setup">grade schedules</Link>,{' '}
          <Link to="/providers">providers</Link>, and <Link to="/students">students</Link>.
          Then this board shows every student's open gaps side by side.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="board-rail">
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Students shown</h2>
          <div className="rail-list">
            {[...ws.students]
              .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true }))
              .map((s) => (
                <label key={s.id} className="rail-check">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                  />
                  Student {s.displayId}
                  {s.serviceGoals
                    .filter((g) => g.type === 'direct')
                    .map((g, gi) => (
                      <span
                        key={gi}
                        title={`${providerById(g.providerId)?.name ?? 'Provider'} direct service`}
                        style={{ color: providerById(g.providerId)?.color, fontSize: 11 }}
                      >
                        ●
                      </span>
                    ))}
                </label>
              ))}
          </div>
        </div>

        <div className="card">
          <WeekParityToggle />
          <div className="legend" style={{ marginTop: 12, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <span>
              <span className="swatch" style={{ background: 'var(--gap-bg)' }} /> Gap - bookable
            </span>
            <span>
              <span className="swatch" style={{ background: 'var(--blocked-bg)' }} /> Blocked
            </span>
            {ws.providers.map((p) => (
              <span key={p.id}>
                <span className="swatch" style={{ background: p.color }} /> {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="board-columns">
        {shownStudents.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <h2>No students selected</h2>
            Tick students on the left to compare their calendars side by side.
          </div>
        ) : (
          shownStudents.map((student) => {
            const grade = ws.grades.find((g) => g.id === student.gradeId);
            return (
              <div className="student-col" key={student.id}>
                <div className="student-col-head">
                  <h3>
                    <Link to={`/students/${student.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      Student {student.displayId}
                    </Link>
                  </h3>
                  <span className="grade-tag">{grade?.name ?? ''}</span>
                </div>
                <WeekGrid
                  window={win}
                  intervals={parity === 'both' ? computeStudentWeekAll(student.id, ws) : computeStudentWeek(student.id, parity, ws)}
                  pxPerMinute={1.0}
                  onGapClick={(day, minutes) => openBooking(student.id, day, minutes)}
                  onSessionClick={openSession}
                  sessionColor={(id) =>
                    providerById(ws.sessions.find((s) => s.id === id)?.providerId ?? '')?.color ??
                    'var(--ink)'
                  }
                  sessionContent={(i) => {
                    const sess = ws.sessions.find((s) => s.id === i.sessionId);
                    const p = providerById(sess?.providerId ?? '');
                    return (
                      <>
                        {p?.name ?? 'Session'}
                        {sess && sess.studentIds.length > 1 ? ` ·${sess.studentIds.length}` : ''}
                        {sess?.recurrence === 'biweekly' ? ` (${sess.weekParity})` : ''}
                      </>
                    );
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {booking && <BookingModal {...booking} onClose={() => setBooking(null)} />}
    </div>
  );
}
