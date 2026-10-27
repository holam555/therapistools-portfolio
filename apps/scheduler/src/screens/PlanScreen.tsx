import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudentGroupEditor } from '../components/StudentGroupEditor';
import { StudentPairEditor } from '../components/StudentPairEditor';
import { TimeSelect } from '../components/TimeSelect';
import { WeekGrid } from '../components/WeekGrid';
import { DEFAULT_PLAN_RULES, generatePlan, type PlacementStrategy, type PlanResult, type PlanRules } from '../domain/autoSchedule';
import { computeProviderWeek, computeProviderWeekAll } from '../domain/schedule';
import type { DayOfWeek, Session } from '../domain/types';
import { DAY_NAMES, formatMinutesWithPeriod } from '../domain/types';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';
import { exportPlanXlsx } from '../storage/exportScheduleXlsx';

const fmtMin = (m: number) => (Number.isInteger(m) ? String(m) : m.toFixed(1));

const RULES_KEY = 'gapboard-plan-rules';

const STRATEGIES: Array<{ key: PlacementStrategy; label: string }> = [
  { key: 'earliest', label: 'Mornings first' },
  { key: 'spread', label: 'Spread out' },
  { key: 'latest', label: 'Afternoons first' },
  { key: 'pack-days', label: 'Fewest days' },
  { key: 'shuffle', label: 'Surprise me' },
];

function loadRules(): PlanRules {
  try {
    const stored = JSON.parse(localStorage.getItem(RULES_KEY) ?? '{}');
    // Older saves used a boolean for same-grade auto-pairing.
    if (stored.autoGroup === undefined && stored.autoGroupSameGrade === true) {
      stored.autoGroup = 'same-grade';
    }
    delete stored.autoGroupSameGrade;
    return { ...DEFAULT_PLAN_RULES, ...stored };
  } catch {
    return { ...DEFAULT_PLAN_RULES };
  }
}

export function PlanScreen() {
  const ws = useWorkspaceStore((s) => s.ws);
  const parity = useWorkspaceStore((s) => s.parity);
  const addSessions = useWorkspaceStore((s) => s.addSessions);
  const updateGrouping = useWorkspaceStore((s) => s.updateGrouping);
  const [providerId, setProviderId] = useState(ws.providers[0]?.id ?? '');
  const [plans, setPlans] = useState<PlanResult[] | null>(null);
  const [active, setActive] = useState(0);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [bookedCount, setBookedCount] = useState<number | null>(null);
  const [rules, setRules] = useState<PlanRules>(loadRules);

  useEffect(() => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  }, [rules]);

  const provider = ws.providers.find((p) => p.id === providerId);
  const win = { start: ws.settings.schoolDayStart, end: ws.settings.schoolDayEnd };

  const plan = plans?.[active] ?? null;

  function generate(withRules: PlanRules = rules) {
    const versions = STRATEGIES.map((s) => generatePlan(providerId, ws, withRules, s.key));
    setPlans(versions);
    setActive(0);
    setAccepted(new Set(versions[0].proposals.map((_, i) => i)));
    setBookedCount(null);
  }

  function patchRules(patch: Partial<PlanRules>) {
    const next = { ...rules, ...patch };
    setRules(next);
    if (plan) generate(next);
  }

  function bookAccepted() {
    if (!plan) return;
    const sessions: Session[] = plan.proposals
      .filter((_, i) => accepted.has(i))
      .map((p) => ({
        id: newId(),
        providerId,
        studentIds: p.studentIds,
        day: p.day,
        start: p.start,
        durationMin: p.durationMin,
        recurrence: p.recurrence,
        weekParity: p.weekParity,
        verified: true,
      }));
    addSessions(sessions);
    localStorage.setItem('gapboard-autoplan-used', '1');
    setBookedCount(sessions.length);
    setPlans(null);
  }

  const displayId = (id: string) => ws.students.find((s) => s.id === id)?.displayId ?? '?';

  // Preview: the provider's current week with proposals overlaid in accent color.
  const previewIntervals = useMemo(() => {
    if (!plan || !provider) return [];
    const base = parity === 'both' ? computeProviderWeekAll(provider.id, ws) : computeProviderWeek(provider.id, parity, ws);
    const proposalIntervals = plan.proposals
      .filter((_, i) => accepted.has(i))
      .map((p, i) => ({
        day: p.day,
        start: p.start,
        end: p.start + p.durationMin,
        kind: 'session' as const,
        sessionId: `proposal-${i}`,
      }));
    return [...base, ...proposalIntervals];
  }, [plan, provider, parity, ws, accepted]);

  if (ws.providers.length === 0) {
    return (
      <div className="empty-state">
        <h2>No providers yet</h2>
        Add yourself under <Link to="/providers">Providers</Link> first.
      </div>
    );
  }

  const unmetStudents = plan?.students.filter((s) => s.unmetMin > 0) ?? [];

  /** Human description of the actual sessions proposed for one student. */
  function proposedDescription(studentId: string): string {
    if (!plan) return '';
    const mine = plan.proposals.filter((p) => p.studentIds.includes(studentId));
    if (mine.length === 0) return '-';
    const bySlot = new Map<string, typeof mine>();
    for (const p of mine) {
      const key = `${p.day}:${p.start}`;
      bySlot.set(key, [...(bySlot.get(key) ?? []), p]);
    }
    return [...bySlot.values()]
      .map((slot) => {
        if (slot.length === 2) {
          const a = slot.find((p) => p.weekParity === 'A');
          const b = slot.find((p) => p.weekParity === 'B');
          return `${a?.durationMin}m wk A / ${b?.durationMin}m wk B`;
        }
        const p = slot[0];
        if (p.recurrence === 'biweekly') return `${p.durationMin}m every other wk (${p.weekParity})`;
        return `${p.durationMin}m weekly`;
      })
      .join(' + ');
  }

  return (
    <div className="stack" style={{ maxWidth: 1150, margin: '0 auto' }}>
      <div className="page-head">
        <h1>Auto-Plan</h1>
        <div className="row">
          <select value={providerId} onChange={(e) => { setProviderId(e.target.value); setPlans(null); setBookedCount(null); }}>
            {ws.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn primary" onClick={() => generate()}>
            {plan ? 'Regenerate' : 'Generate schedule'}
          </button>
          {plan && (
            <button
              className="btn"
              onClick={() =>
                void exportPlanXlsx({
                  provider: provider!,
                  ws,
                  proposals: plan.proposals.filter((_, i) => accepted.has(i)),
                  lunches: plan.lunches,
                  lunchMin: rules.lunchMin,
                })
              }
            >
              Download Excel
            </button>
          )}
        </div>
      </div>
      <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
        Fits each student's service-minute goal into their real gaps during{' '}
        {provider?.name ?? 'the provider'}'s on-site time - exactly the mandated minutes,
        never more (fractional goals alternate week A/B lengths in one slot), one session
        per student per day, groups for your prefer-together pairs. Anything that can't
        fit is flagged; nothing is booked until you review and confirm.
      </p>
      <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
        <strong>Have a fixed timeslot for a student?</strong> Book it by hand first - on
        the student's page, the Gap Board, or the provider's page - then Generate. Booked
        minutes count toward the goal, so Auto-Plan only plans what's left, and booked
        sessions show in dark ink on the preview so they're easy to tell from proposals.
      </p>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Rules</h2>
        <div className="row" style={{ gap: 20, alignItems: 'flex-end' }}>
          <label className="field">
            First session
            <TimeSelect
              value={rules.earliestStart}
              min={ws.settings.schoolDayStart}
              max={ws.settings.schoolDayStart + 120}
              onChange={(m) => patchRules({ earliestStart: m })}
            />
          </label>
          <label className="field">
            Last session ends by
            <select
              value={rules.latestEnd ?? ''}
              onChange={(e) =>
                patchRules({ latestEnd: e.target.value === '' ? null : Number(e.target.value) })
              }
            >
              <option value="">end of day</option>
              {Array.from(
                { length: Math.floor((ws.settings.schoolDayEnd - 720) / 15) + 1 },
                (_, i) => 720 + i * 15,
              ).map((m) => (
                <option key={m} value={m}>
                  {formatMinutesWithPeriod(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Between sessions
            <select
              value={rules.bufferMin}
              onChange={(e) => patchRules({ bufferMin: Number(e.target.value) })}
            >
              {[0, 5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Shortest session
            <select
              value={rules.minSessionLen}
              onChange={(e) => patchRules({ minSessionLen: Number(e.target.value) as 10 | 15 })}
            >
              <option value={15}>15 min</option>
              <option value={10}>10 min</option>
            </select>
          </label>
          <label className="field">
            Fractional goals
            <select
              value={rules.roundUpFractional ? 'round-up' : 'exact'}
              onChange={(e) => patchRules({ roundUpFractional: e.target.value === 'round-up' })}
              title="90 min/month = 22.5/wk. Exact alternates week A 25 / week B 20 (exactly 90). Round up books a plain 25-min weekly session (≈100/month, slightly over - no A/B weeks)."
            >
              <option value="exact">Exact (wk A/B alternate)</option>
              <option value="round-up">Round up (simple weekly)</option>
            </select>
          </label>
          <label className="field">
            Other providers' time
            <select
              value={rules.allowProviderOverlap ? 'overlap' : 'clear'}
              onChange={(e) => patchRules({ allowProviderOverlap: e.target.value === 'overlap' })}
              title="'May overlap' lets proposals share time with another provider's session (like para support does). Your own sessions never overlap each other."
            >
              <option value="clear">Keep clear</option>
              <option value="overlap">May overlap</option>
            </select>
          </label>
          <label className="field">
            Lunch
            <select
              value={rules.lunchMin}
              onChange={(e) => patchRules({ lunchMin: Number(e.target.value) })}
              title="Holds ONE break of this length somewhere inside the window below - the rest of the window stays bookable. The planner picks the spot that costs the least student time, and the exact search lets it float anywhere."
            >
              <option value={0}>none</option>
              {[20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
          {rules.lunchMin > 0 && (
            <>
              <label className="field">
                Lunch between
                <TimeSelect
                  value={rules.lunchWindow.start}
                  min={600}
                  max={780}
                  step={15}
                  onChange={(m) =>
                    patchRules({ lunchWindow: { start: m, end: Math.max(rules.lunchWindow.end, m + rules.lunchMin) } })
                  }
                />
              </label>
              <label className="field">
                and
                <TimeSelect
                  value={rules.lunchWindow.end}
                  min={rules.lunchWindow.start + rules.lunchMin}
                  max={840}
                  step={15}
                  onChange={(m) => patchRules({ lunchWindow: { ...rules.lunchWindow, end: m } })}
                />
              </label>
            </>
          )}
          <label className="field">
            Fill days first
            <div
              className="segmented"
              title="Click days in the order you want them filled - 1st, 2nd… Click again to remove. Unmarked days fill afterwards, balanced."
            >
              {DAY_NAMES.map((name, d) => {
                const idx = rules.priorityDays.indexOf(d as DayOfWeek);
                return (
                  <button
                    key={name}
                    className={idx !== -1 ? 'on' : ''}
                    onClick={() => {
                      const next = rules.priorityDays.filter((x) => x !== d);
                      if (idx === -1) next.push(d as DayOfWeek);
                      patchRules({ priorityDays: next });
                    }}
                  >
                    {name}
                    {idx !== -1 && rules.priorityDays.length > 1 ? ` ${idx + 1}` : ''}
                  </button>
                );
              })}
            </div>
          </label>
          <label className="field">
            If stuck, shrink buffer
            <select
              value={rules.fallbackBufferMin ?? ''}
              onChange={(e) =>
                patchRules({ fallbackBufferMin: e.target.value === '' ? null : Number(e.target.value) })
              }
              title="Only when a student can't otherwise fit: allow placements to sit closer to a neighboring session. If even that leaves someone out, the whole plan retries at the smaller spacing. Full buffer stays the norm whenever it works."
            >
              <option value="">never</option>
              <option value={10}>to 10 min</option>
              <option value={5}>to 5 min</option>
              <option value={0}>to 0 min</option>
            </select>
          </label>
          <label className="field">
            If stuck, split sessions
            <select
              value={rules.allowSplitWhenStuck ? 'yes' : 'no'}
              onChange={(e) => patchRules({ allowSplitWhenStuck: e.target.value === 'yes' })}
              title="Only when a student can't otherwise fit: a weekly session may split across two days (30 becomes 15 + 15). Still one session per day."
            >
              <option value="no">never</option>
              <option value="yes">across two days</option>
            </select>
          </label>
          <button
            className="btn ghost small"
            onClick={() => {
              setRules({ ...DEFAULT_PLAN_RULES });
              if (plan) generate({ ...DEFAULT_PLAN_RULES });
            }}
          >
            Reset to my defaults
          </button>
        </div>

        <div className="row" style={{ gap: 28, alignItems: 'flex-start', marginTop: 14 }}>
          <label className="field">
            Grouping
            <select
              value={rules.autoGroup}
              onChange={(e) => patchRules({ autoGroup: e.target.value as PlanRules['autoGroup'] })}
            >
              <option value="none">Prefer individual - only my groups below</option>
              <option value="same-grade">Prefer groups - same grade</option>
              <option value="adjacent-grade">Prefer groups - within ±1 grade</option>
            </select>
          </label>
          <label className="field">
            Group size up to
            <select
              value={rules.maxGroupSize}
              onChange={(e) => patchRules({ maxGroupSize: Number(e.target.value) })}
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} students
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Groups / week
            <select
              value={rules.maxGroups ?? ''}
              onChange={(e) => patchRules({ maxGroups: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">no limit</option>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  up to {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Individual sessions / week
            <select
              value={rules.maxIndividuals ?? ''}
              onChange={(e) => patchRules({ maxIndividuals: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">no limit</option>
              {[2, 4, 6, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  up to {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Group together
            <StudentGroupEditor
              groups={ws.grouping.preferGroups}
              lens={ws.grouping.groupLens ?? {}}
              onChange={(preferGroups) => {
                updateGrouping({ preferGroups });
                if (plan) generate();
              }}
              onLensChange={(groupLens) => {
                updateGrouping({ groupLens });
                if (plan) generate();
              }}
            />
          </label>
          <label className="field">
            Cannot be grouped
            <StudentPairEditor
              pairs={ws.grouping.cannotPairs}
              onChange={(cannotPairs) => {
                updateGrouping({ cannotPairs });
                if (plan) generate();
              }}
              addLabel="pair"
            />
          </label>
          <label className="field">
            Always individual
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {(ws.grouping.soloStudents ?? []).map((id) => (
                <span key={id} className="chip">
                  Student {ws.students.find((s) => s.id === id)?.displayId ?? '?'}
                  <button
                    className="btn ghost small"
                    style={{ padding: '0 2px', marginLeft: 4 }}
                    title="Allow auto-grouping for this student again"
                    onClick={() => {
                      updateGrouping({ soloStudents: (ws.grouping.soloStudents ?? []).filter((x) => x !== id) });
                      if (plan) generate();
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <select
                value=""
                title="Auto-grouping never puts these students in a group. A group you write out above still wins."
                onChange={(e) => {
                  if (!e.target.value) return;
                  updateGrouping({
                    soloStudents: [...(ws.grouping.soloStudents ?? []), e.target.value],
                  });
                  if (plan) generate();
                }}
              >
                <option value="">+ student...</option>
                {ws.students
                  .filter((s) => !(ws.grouping.soloStudents ?? []).includes(s.id))
                  .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true }))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Student {s.displayId}
                    </option>
                  ))}
              </select>
            </div>
          </label>
          <span style={{ color: 'var(--muted)', fontSize: 12, alignSelf: 'flex-end', paddingBottom: 6 }}>
            Your groups can hold any number of students. Auto-grouping matches same-grade
            students with the same need and a shared gap, up to the size above. "Cannot
            be grouped" pairs are always respected.
          </span>
        </div>
      </div>

      {bookedCount !== null && (
        <div className="ok-note">
          ✓ Booked {bookedCount} weekly session(s) - they're on the calendars now, blocked
          both ways, and marked verified. See <Link to={`/my-schedule/${providerId}`}>My Schedule</Link>.
        </div>
      )}

      {plans && plan && (
        <>
          <div className="row" style={{ gap: 12 }}>
            <div className="segmented">
              {STRATEGIES.map((s, i) => (
                <button
                  key={s.key}
                  className={active === i ? 'on' : ''}
                  onClick={() => {
                    setActive(i);
                    setAccepted(new Set(plans[i].proposals.map((_, x) => x)));
                  }}
                >
                  Version {i + 1} · {s.label}
                </button>
              ))}
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              Five ways to meet the same goals - compare, then book the one you like.
              "Surprise me" reshuffles every Regenerate.
            </span>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 17, marginBottom: 10 }}>Service minutes</h2>
            <table className="list-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Goal</th>
                  <th>Already booked</th>
                  <th>Proposed sessions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {plan.students.map((s) => (
                  <tr key={s.studentId}>
                    <td>
                      <strong>Student {s.displayId}</strong>
                    </td>
                    <td>
                      {s.goalLabel}
                      <span style={{ color: 'var(--muted)' }}> (= {fmtMin(s.weeklyGoalMin)}/wk)</span>
                    </td>
                    <td>{fmtMin(s.existingWeeklyMin)} min/wk</td>
                    <td>
                      {proposedDescription(s.studentId)}
                      {s.proposedMin > 0 && (
                        <span style={{ color: 'var(--muted)' }}> (= {fmtMin(s.proposedMin)}/wk)</span>
                      )}
                    </td>
                    <td>
                      {s.unmetMin > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                          ⚠ {fmtMin(s.unmetMin)} min short
                        </span>
                      ) : s.groupShortMin > 0 ? (
                        <span
                          style={{ color: 'var(--muted)', fontWeight: 600 }}
                          title="Their group runs at the shorter member's need, as you chose. This is the difference you cover in your own slot."
                        >
                          ✓ group · {fmtMin(s.groupShortMin * 4)} min/mo to you
                        </span>
                      ) : (
                        <span style={{ color: 'var(--gap-ink)', fontWeight: 700 }}>✓ met</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plan.lunches.length > 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
                Lunch held:{' '}
                {plan.lunches
                  .map((l) => `${DAY_NAMES[l.day]} ${formatMinutesWithPeriod(l.start)}-${formatMinutesWithPeriod(l.start + rules.lunchMin)}`)
                  .join(' · ')}
              </p>
            )}
            {plan.students.some((st) => st.groupShortMin > 0) && (
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
                Yours to place (groups run at the shorter member's need):{' '}
                {plan.students
                  .filter((st) => st.groupShortMin > 0)
                  .map((st) => `Student ${st.displayId} ${fmtMin(st.groupShortMin * 4)} min/month`)
                  .join(' · ')}
                . Log them in the Tracker when you fit them in.
              </p>
            )}
            {plan.groupNotes.length > 0 && (
              <ul className="warning-list" style={{ marginBottom: 0 }}>
                {plan.groupNotes.map((n, i) => (
                  <li key={i}>⚠ {n}</li>
                ))}
              </ul>
            )}
            {unmetStudents.length > 0 && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 0 }}>
                Couldn't fully fit {unmetStudents.map((s) => `Student ${s.displayId}`).join(', ')}.
                Options: try "If stuck" in Rules (shrink the buffer or split sessions),
                open blocked time on their page, add on-site time,
                {(rules.maxGroups !== null || rules.maxIndividuals !== null) &&
                  ' raise the group/individual limits in Rules,'}{' '}
                or book those minutes by hand (their page or the Gap Board) - then
                Regenerate: booked minutes count toward the goal.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div className="card side-card">
              <div className="page-head" style={{ marginBottom: 10 }}>
                <h2 style={{ fontSize: 17 }}>Proposed sessions</h2>
                <button
                  className="btn primary small"
                  disabled={accepted.size === 0}
                  onClick={bookAccepted}
                >
                  Book {accepted.size} session(s)
                </button>
              </div>
              {plan.proposals.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Nothing to propose - every goal is already met by booked sessions.
                </p>
              ) : (
                <div className="stack" style={{ gap: 4 }}>
                  {plan.proposals.map((p, i) => (
                    <label key={i} className="rail-check" style={{ fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={accepted.has(i)}
                        onChange={(e) => {
                          const next = new Set(accepted);
                          if (e.target.checked) next.add(i);
                          else next.delete(i);
                          setAccepted(next);
                        }}
                      />
                      <strong>{DAY_NAMES[p.day]}</strong> {formatMinutesWithPeriod(p.start)}-
                      {formatMinutesWithPeriod(p.start + p.durationMin)}
                      {p.recurrence === 'biweekly' && (
                        <span style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>wk {p.weekParity}</span>
                      )}{' '}
                      · Student{p.studentIds.length > 1 ? 's' : ''}{' '}
                      {p.studentIds.map(displayId).join(', ')}
                      {p.studentIds.length > 1 && (
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>group</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="legend" style={{ marginBottom: 8 }}>
                <span>
                  <span className="swatch" style={{ background: 'var(--ink)' }} /> Already booked
                </span>
                <span>
                  <span className="swatch" style={{ background: 'var(--accent)' }} /> Proposed
                </span>
                <span>
                  <span className="swatch" style={{ background: 'var(--gap-bg)' }} /> Still open
                </span>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
                  side-by-side blocks in one slot = week A / week B alternating
                </span>
              </div>
              <WeekGrid
                window={win}
                intervals={previewIntervals}
                pxPerMinute={1.05}
                tickMinutes={15}
                sessionColor={(id) => (id.startsWith('proposal-') ? 'var(--accent)' : 'var(--ink)')}
                sessionContent={(i) => {
                  if (i.sessionId?.startsWith('proposal-')) {
                    const idx = Number(i.sessionId.slice('proposal-'.length));
                    const visible = plan.proposals.filter((_, x) => accepted.has(x));
                    const p = visible[idx];
                    if (!p) return null;
                    const tag = p.recurrence === 'biweekly' ? ` · wk ${p.weekParity}` : '';
                    return (
                      <span title={`Students ${p.studentIds.map(displayId).join(', ')}${tag}`}>
                        {p.studentIds.map(displayId).join(', ')}
                        {tag}
                      </span>
                    );
                  }
                  const sess = ws.sessions.find((s) => s.id === i.sessionId);
                  if (!sess) return null;
                  const tag = sess.recurrence === 'biweekly' ? ` · wk ${sess.weekParity}` : '';
                  return (
                    <>
                      {sess.studentIds.map(displayId).join(', ')}
                      {tag}
                    </>
                  );
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
