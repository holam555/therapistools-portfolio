import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlockListEditor } from '../components/BlockListEditor';
import { BookingModal, type BookingModalProps } from '../components/BookingModal';
import { WeekGrid } from '../components/WeekGrid';
import { WeekParityToggle } from '../components/WeekParityToggle';
import { computeProviderWeek, computeProviderWeekAll } from '../domain/schedule';
import type { AvailabilityBlock } from '../domain/types';
import { exportPlanXlsx } from '../storage/exportScheduleXlsx';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function ProviderScheduleScreen() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const ws = useWorkspaceStore((s) => s.ws);
  const parity = useWorkspaceStore((s) => s.parity);
  const [booking, setBooking] = useState<Omit<BookingModalProps, 'onClose'> | null>(null);
  const [editingAvailability, setEditingAvailability] = useState(false);
  const upsertProvider = useWorkspaceStore((s) => s.upsertProvider);

  const provider = ws.providers.find((p) => p.id === providerId) ?? ws.providers[0];
  // A provider with no on-site time yet gets the editor opened for them -
  // that's the very next thing a new user has to fill in.
  const providerKey = provider?.id;
  const noAvailability = (provider?.availability.length ?? 0) === 0;
  useEffect(() => {
    if (providerKey && noAvailability) setEditingAvailability(true);
  }, [providerKey, noAvailability]);
  if (!provider) {
    return (
      <div className="empty-state">
        <h2>No providers yet</h2>
        <p style={{ margin: '6px 0 12px' }}>Add yourself first, then your colleagues.</p>
        <Link to="/providers" className="btn primary">
          Go to Providers
        </Link>
      </div>
    );
  }

  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };
  const week = parity === 'both' ? computeProviderWeekAll(provider.id, ws) : computeProviderWeek(provider.id, parity, ws);
  const totalMin = ws.sessions
    .filter((s) => s.providerId === provider.id)
    .reduce((sum, s) => sum + s.durationMin * (s.recurrence === 'weekly' ? 1 : 0.5), 0);

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

  return (
    <div className="stack" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-head">
        <h1>
          <span className="color-dot" style={{ background: provider.color, width: 16, height: 16 }} />
          {provider.name}'s week
        </h1>
        <div className="row no-print">
          <select value={provider.id} onChange={(e) => navigate(`/my-schedule/${e.target.value}`)}>
            {ws.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <WeekParityToggle />
          <button
            className="btn primary small"
            onClick={() =>
              setBooking({
                initial: {
                  providerId: provider.id,
                  studentIds: [],
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
          <button
            className={`btn small${editingAvailability ? ' primary' : ''}`}
            onClick={() => setEditingAvailability((v) => !v)}
          >
            {editingAvailability ? 'Done editing' : 'Edit availability'}
          </button>
          <button
            className="btn small"
            onClick={() => void exportPlanXlsx({ provider, ws })}
            title="Download this week as a formatted Excel grid - merged cells, colors, exact times"
          >
            Download Excel
          </button>
        </div>
      </div>

      {editingAvailability && (
        <div className="card no-print">
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>On-site availability</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
            When is {provider.name} at this school? Use "Week A/B only" for alternating
            weeks. The calendar below updates as you edit.
          </p>
          <BlockListEditor
            blocks={provider.availability}
            window={win}
            showWeeks
            fullWindowDefault
            quickAddWeek
            addLabel="on-site time"
            onChange={(blocks) =>
              upsertProvider({
                ...provider,
                availability: blocks.map((b) => ({ ...b, weeks: b.weeks ?? 'both' }) as AvailabilityBlock),
              })
            }
          />
        </div>
      )}

      <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>
        {ws.sessions.filter((s) => s.providerId === provider.id).length} session(s) booked ·
        ≈{Math.round(totalMin)} min/week of service · {parity === 'both' ? 'every week' : `Week ${parity}`}
      </p>

      <WeekGrid
        window={win}
        intervals={week}
        pxPerMinute={1.0}
        tickMinutes={30}
        onSessionClick={openSession}
        sessionColor={() => provider.color}
        sessionContent={(i) => {
          const sess = ws.sessions.find((s) => s.id === i.sessionId);
          if (!sess) return null;
          const ids = sess.studentIds
            .map((id) => ws.students.find((s) => s.id === id)?.displayId ?? '?')
            .join(', ');
          return (
            <span title={`Student${sess.studentIds.length > 1 ? 's' : ''} ${ids}${sess.note ? ` · ${sess.note}` : ''}`}>
              {ids}
              {sess.recurrence === 'biweekly' ? ` (wk ${sess.weekParity})` : ''}
              {sess.note ? <div className="interval-time">{sess.note}</div> : null}
            </span>
          );
        }}
      />

      {booking && <BookingModal {...booking} onClose={() => setBooking(null)} />}
    </div>
  );
}
