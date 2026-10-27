import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockListEditor } from '../components/BlockListEditor';
import { BookingModal, type BookingModalProps } from '../components/BookingModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ImportScheduleModal } from '../components/ImportScheduleModal';
import { InlineAdd } from '../components/InlineAdd';
import { WeekGrid } from '../components/WeekGrid';
import { WeekParityToggle } from '../components/WeekParityToggle';
import { computeProviderWeek, computeProviderWeekAll, sessionOccursIn, type ScheduleInterval } from '../domain/schedule';
import type { AvailabilityBlock, DayOfWeek, Provider, Session, Workspace } from '../domain/types';
import { DAY_NAMES } from '../domain/types';
import { newId, useWorkspaceStore, type ParityView } from '../store/useWorkspaceStore';

/**
 * One collapsed "every day" column: Monday's availability as the backdrop,
 * plus each unique session pattern once. Patterns not present on all five
 * days carry a which-days tag.
 */
function dailyProviderIntervals(
  provider: Provider,
  parity: ParityView,
  ws: Workspace,
): ScheduleInterval[] {
  const backdropSource =
    parity === 'both'
      ? computeProviderWeekAll(provider.id, ws)
      : computeProviderWeek(provider.id, parity, ws);
  const backdrop = backdropSource.filter((i) => i.day === 0 && i.kind !== 'session');
  const sessions = ws.sessions.filter(
    (s) => s.providerId === provider.id && (parity === 'both' || sessionOccursIn(s, parity)),
  );
  const groups = new Map<string, { members: Session[]; days: DayOfWeek[] }>();
  for (const s of sessions) {
    const key = [s.start, s.durationMin, [...s.studentIds].sort().join(','), s.note ?? '', s.recurrence, s.weekParity ?? ''].join('|');
    const g = groups.get(key);
    if (g) {
      g.members.push(s);
      g.days.push(s.day);
    } else {
      groups.set(key, { members: [s], days: [s.day] });
    }
  }
  const out: ScheduleInterval[] = [...backdrop];
  for (const g of groups.values()) {
    const first = g.members[0];
    out.push({
      day: 0,
      start: first.start,
      end: first.start + first.durationMin,
      kind: 'session',
      sessionId: first.id,
      verified: g.members.every((s) => s.verified),
      label: g.days.length === 5 ? undefined : [...g.days].sort().map((d) => DAY_NAMES[d]).join('/'),
    });
  }
  return out;
}

const PROVIDER_COLORS = ['#c75b39', '#3d7a6e', '#7b5ea7', '#b98a2c', '#42709e', '#a75e79'];

export function ProvidersScreen() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const ws = useWorkspaceStore((s) => s.ws);
  const parity = useWorkspaceStore((s) => s.parity);
  const upsertProvider = useWorkspaceStore((s) => s.upsertProvider);
  const moveProvider = useWorkspaceStore((s) => s.moveProvider);
  const setMeProvider = useWorkspaceStore((s) => s.setMeProvider);
  const deleteProvider = useWorkspaceStore((s) => s.deleteProvider);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingSessionsDelete, setConfirmingSessionsDelete] = useState(false);
  const [importing, setImporting] = useState(false);
  const deleteSessionsForProvider = useWorkspaceStore((s) => s.deleteSessionsForProvider);
  const [booking, setBooking] = useState<Omit<BookingModalProps, 'onClose'> | null>(null);

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

  const provider = ws.providers.find((p) => p.id === providerId) ?? null;
  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };

  function addProvider(name: string): string | undefined {
    if (ws.providers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return `"${name}" already exists.`;
    }
    const p: Provider = {
      id: newId(),
      name,
      color: PROVIDER_COLORS[ws.providers.length % PROVIDER_COLORS.length],
      availability: [],
    };
    upsertProvider(p);
    navigate(`/providers/${p.id}`);
    return undefined;
  }

  if (!provider) {
    return (
      <div className="stack" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="page-head">
          <h1>Providers</h1>
          <InlineAdd placeholder='e.g. "Speech", "PT"' buttonLabel="Add provider" onAdd={addProvider} />
        </div>
        <div className="card">
          {ws.providers.length === 0 ? (
            <div className="empty-state">
              <h2>No providers yet</h2>
              Add each member of the team - OT, Speech, PT - with the days they're on site.
            </div>
          ) : (
            <table className="list-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th title="Whose sessions feed the Tracker's Today checklist">Me</th>
                  <th>Discipline</th>
                  <th>On-site blocks</th>
                  <th>Students served</th>
                  <th style={{ width: 70 }}>Order</th>
                </tr>
              </thead>
              <tbody>
                {ws.providers.map((p, idx) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/providers/${p.id}`)}>
                    <td>
                      <span className="color-dot" style={{ background: p.color }} />
                      <strong>{p.name}</strong>
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ cursor: 'default' }}>
                      <input
                        type="radio"
                        name="me-provider"
                        title="This is me - my sessions appear in the Tracker's Today checklist"
                        checked={p.isMe ?? false}
                        onChange={() => setMeProvider(p.id)}
                      />
                    </td>
                    <td>{p.discipline ?? '-'}</td>
                    <td>{p.availability.length}</td>
                    <td>{ws.students.filter((s) => s.serviceGoals.some((g) => g.providerId === p.id)).length}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ cursor: 'default', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn ghost small"
                        disabled={idx === 0}
                        title="Move up"
                        onClick={() => moveProvider(p.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="btn ghost small"
                        disabled={idx === ws.providers.length - 1}
                        title="Move down"
                        onClick={() => moveProvider(p.id, 1)}
                      >
                        ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-head">
        <h1>
          <span className="color-dot" style={{ background: provider.color, width: 16, height: 16 }} />
          {provider.name}
        </h1>
        <div className="row">
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
          <button className="btn small" onClick={() => setImporting(true)}>
            Import schedule
          </button>
          <button className="btn ghost small" onClick={() => navigate('/providers')}>
            ← All providers
          </button>
          <button
            className="btn ghost small danger"
            title="Remove every booked session for this provider - the provider, their availability, and all service goals stay"
            onClick={() => setConfirmingSessionsDelete(true)}
          >
            Delete all sessions
          </button>
          <button
            className="btn ghost small danger"
            title="Remove the provider entirely - including their sessions AND their service goals on every student"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete provider
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div className="card side-card">
          <div className="stack">
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Name
                <input
                  value={provider.name}
                  onChange={(e) => upsertProvider({ ...provider, name: e.target.value })}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                Discipline
                <input
                  value={provider.discipline ?? ''}
                  placeholder="Occupational Therapy"
                  onChange={(e) => upsertProvider({ ...provider, discipline: e.target.value })}
                />
              </label>
              <label className="field">
                Color
                <input
                  type="color"
                  value={provider.color}
                  onChange={(e) => upsertProvider({ ...provider, color: e.target.value })}
                  style={{ width: 44, height: 34, padding: 2 }}
                />
              </label>
            </div>
            <label className="rail-check" title="For rows like an LS or para team where several people share one provider color - their sessions may overlap each other, with a warning instead of a block.">
              <input
                type="checkbox"
                checked={provider.isTeam ?? false}
                onChange={(e) => upsertProvider({ ...provider, isTeam: e.target.checked || undefined })}
              />
              Team row - several people share this provider, sessions may overlap
            </label>
            <div>
              <h2 style={{ fontSize: 16, marginBottom: 6 }}>On-site availability</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
                When is {provider.name} at this school? Use "Week A/B only" for alternating
                weeks.
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
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="legend">
              <span>
                <span className="swatch" style={{ background: 'var(--unavail-bg)' }} /> Off site
              </span>
              <span>
                <span className="swatch" style={{ background: 'var(--gap-bg)' }} /> Open
              </span>
              <span>
                <span className="swatch" style={{ background: provider.color }} /> Sessions
              </span>
            </div>
            <div className="segmented" title="Every day collapses identical daily sessions into one column">
              <button
                className={(provider.viewMode ?? 'week') === 'week' ? 'on' : ''}
                onClick={() => upsertProvider({ ...provider, viewMode: 'week' })}
              >
                Week
              </button>
              <button
                className={provider.viewMode === 'daily' ? 'on' : ''}
                onClick={() => upsertProvider({ ...provider, viewMode: 'daily' })}
              >
                Every day
              </button>
            </div>
          </div>
          {provider.viewMode === 'daily' ? (
            <WeekGrid
              window={win}
              intervals={dailyProviderIntervals(provider, parity, ws)}
              pxPerMinute={1.0}
              days={[0]}
              headerLabels={['Every day']}
              sessionColor={() => provider.color}
              onSessionClick={openSession}
              sessionContent={(i) => {
                const sess = ws.sessions.find((s) => s.id === i.sessionId);
                if (!sess) return null;
                const ids = sess.studentIds
                  .map((id) => ws.students.find((s) => s.id === id)?.displayId ?? '?')
                  .join(', ');
                const tag = sess.recurrence === 'biweekly' ? ` (${sess.weekParity})` : '';
                return (
                  <span title={`Student${sess.studentIds.length > 1 ? 's' : ''} ${ids}${tag}${sess.note ? ` · ${sess.note}` : ''}${i.label ? ` · ${i.label} only` : ''}`}>
                    {ids}
                    {tag}
                    {sess.note ? ` · ${sess.note}` : ''}
                    {i.label ? <div className="interval-time">{i.label} only</div> : null}
                  </span>
                );
              }}
              tickMinutes={30}
            />
          ) : (
            <WeekGrid
              window={win}
              intervals={parity === 'both' ? computeProviderWeekAll(provider.id, ws) : computeProviderWeek(provider.id, parity, ws)}
              pxPerMinute={1.0}
              sessionColor={() => provider.color}
              onSessionClick={openSession}
              sessionContent={(i) => {
                const sess = ws.sessions.find((s) => s.id === i.sessionId);
                if (!sess) return null;
                const ids = sess.studentIds
                  .map((id) => ws.students.find((s) => s.id === id)?.displayId ?? '?')
                  .join(', ');
                const tag = sess.recurrence === 'biweekly' ? ` (${sess.weekParity})` : '';
                return <span title={`Student${sess.studentIds.length > 1 ? 's' : ''} ${ids}${tag}`}>{ids}{tag}</span>;
              }}
              tickMinutes={30}
            />
          )}
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
            {provider.viewMode === 'daily'
              ? 'One column = the daily pattern. Click a session to edit - changes can apply to all its days at once; switch to Week for single-day edits.'
              : 'Click a session to change its students, day, or time.'}
          </p>
        </div>
      </div>

      {importing && <ImportScheduleModal provider={provider} onClose={() => setImporting(false)} />}

      {booking && <BookingModal {...booking} onClose={() => setBooking(null)} />}

      {confirmingSessionsDelete && (
        <ConfirmModal
          title={`Delete all of ${provider.name}'s sessions?`}
          message={`Removes ${ws.sessions.filter((s) => s.providerId === provider.id).length} session(s) from all calendars. The provider, their availability, and every student's service goals are kept.`}
          confirmLabel="Delete sessions"
          onConfirm={() => deleteSessionsForProvider(provider.id)}
          onClose={() => setConfirmingSessionsDelete(false)}
        />
      )}

      {confirmingDelete && (
        <ConfirmModal
          title={`Delete provider ${provider.name}?`}
          message={`This removes EVERYTHING about ${provider.name}: the provider, their ${ws.sessions.filter((s) => s.providerId === provider.id).length} session(s), AND their service goals on every student. To clear only the calendar, use "Delete all sessions" instead.`}
          confirmLabel="Delete provider"
          onConfirm={() => {
            deleteProvider(provider.id);
            navigate('/providers');
          }}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
