import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { isCaseDone, isDueSoon, isOverdue, newIepCase, serviceSummary, sortCases } from '../domain/iepTracker';
import type { IepCase, IepKind } from '../domain/types';
import { IEP_KINDS, IEP_STEPS } from '../domain/types';
import { goalProgress, isoDate, owedMakeups } from '../domain/serviceLog';
import { exportIepXlsx } from '../storage/exportTrackerXlsx';
import { AllSchoolsTab } from './TrackerAllSchools';
import { TodayTab } from './TrackerToday';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

type TrackerTab = 'today' | 'iep' | 'all';

export function TrackerScreen() {
  const [tab, setTab] = useState<TrackerTab>('today');
  const wide = tab === 'iep' || tab === 'all';
  return (
    <div className="stack" style={{ maxWidth: wide ? 1150 : 800, margin: '0 auto' }}>
      <div className="page-head">
        <h1>Tracker</h1>
        <div className="segmented">
          <button className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>
            Today
          </button>
          <button className={tab === 'iep' ? 'on' : ''} onClick={() => setTab('iep')}>
            IEP cases
          </button>
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
            All schools
          </button>
        </div>
      </div>
      {tab === 'today' && <TodayTab />}
      {tab === 'iep' && <IepTab />}
      {tab === 'all' && <AllSchoolsTab onOpenSchool={() => setTab('iep')} />}
    </div>
  );
}

/* ------------------------------ IEP cases ------------------------------ */

function IepTab() {
  const ws = useWorkspaceStore((s) => s.ws);
  const schools = useWorkspaceStore((s) => s.schools);
  const activeSchoolId = useWorkspaceStore((s) => s.activeSchoolId);
  const upsertIepCase = useWorkspaceStore((s) => s.upsertIepCase);
  const deleteIepCase = useWorkspaceStore((s) => s.deleteIepCase);

  const [addingFor, setAddingFor] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<IepCase | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const today = isoDate(new Date());
  const schoolName = schools.find((s) => s.id === activeSchoolId)?.name ?? '';
  const studentNumber = (id: string) => Number(ws.students.find((s) => s.id === id)?.displayId) || 0;
  const cases = sortCases(ws.iepCases, studentNumber);
  const overdue = cases.filter((c) => isOverdue(c, today)).length;
  const dueSoon = cases.filter((c) => isDueSoon(c, today)).length;

  const patch = (c: IepCase, p: Partial<IepCase>) => upsertIepCase({ ...c, ...p });

  // Students not yet on the tracker - the bulk add only ever fills the gap,
  // so pressing it again after new students arrive adds just the new ones.
  const untracked = ws.students.filter((s) => !ws.iepCases.some((c) => c.studentId === s.id));

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div className="row" style={{ gap: 6 }}>
            <select value={addingFor} onChange={(e) => setAddingFor(e.target.value)}>
              <option value="">Add a case for...</option>
              {ws.students.map((s) => (
                <option key={s.id} value={s.id}>
                  Student {s.displayId}
                </option>
              ))}
            </select>
            <button
              className="btn primary small"
              disabled={!addingFor}
              onClick={() => {
                upsertIepCase(newIepCase(addingFor));
                setAddingFor('');
              }}
            >
              + Add case
            </button>
            <button
              className="btn small"
              disabled={untracked.length === 0}
              title={
                untracked.length === 0
                  ? 'Every student already has a case'
                  : 'One Annual case per student that has none yet - students already tracked are skipped'
              }
              onClick={() => setConfirmBulk(true)}
            >
              + Add all students ({untracked.length})
            </button>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            {(overdue > 0 || dueSoon > 0) && (
              <span style={{ fontSize: 13 }}>
                {overdue > 0 && <strong style={{ color: 'var(--danger, #b3261e)' }}>{overdue} overdue</strong>}
                {overdue > 0 && dueSoon > 0 && ' · '}
                {dueSoon > 0 && <span style={{ color: 'var(--gap-ink)' }}>{dueSoon} due soon</span>}
              </span>
            )}
            <button
              className="btn small"
              disabled={cases.length === 0}
              title="Excel file in the same layout as a paper IEP tracker, student numbers only"
              onClick={() => void exportIepXlsx(ws, cases, schoolName)}
            >
              Export (Excel)
            </button>
          </div>
        </div>
        {ws.students.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
            Add students on the <Link to="/students">Students page</Link> first - cases attach to a student number.
          </p>
        )}
      </div>

      {cases.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="list-table iep-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade</th>
                <th>Due</th>
                <th>Type</th>
                <th>Services</th>
                <th>Indirect</th>
                <th>Booked/wk</th>
                <th title="Delivered vs mandate in the period each goal is written in, from the Today log">
                  Progress
                </th>
                {IEP_STEPS.map(([key, label]) => (
                  <th key={key} className="rot">
                    {label}
                  </th>
                ))}
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const student = ws.students.find((s) => s.id === c.studentId);
                const grade = ws.grades.find((g) => g.id === student?.gradeId);
                const services = serviceSummary(ws, c.studentId);
                const late = isOverdue(c, today);
                const soon = isDueSoon(c, today);
                return (
                  <tr key={c.id} className={isCaseDone(c) ? 'iep-done' : ''}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {student ? <Link to={`/students/${student.id}`}>Student {student.displayId}</Link> : '?'}
                    </td>
                    <td>{grade?.name ?? ''}</td>
                    <td>
                      <input
                        type="date"
                        value={c.dateDue}
                        className={late ? 'iep-late' : soon ? 'iep-soon' : ''}
                        onChange={(e) => patch(c, { dateDue: e.target.value })}
                      />
                    </td>
                    <td>
                      <select value={c.kind} onChange={(e) => patch(c, { kind: e.target.value as IepKind })}>
                        {IEP_KINDS.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{services.direct}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{services.indirect}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {services.bookedPerWeek ? `${services.bookedPerWeek} min` : ''}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {goalProgress(ws, c.studentId, today).map((g) => (
                        <div key={g.label} className={g.met ? 'prog met' : 'prog'}>
                          {g.met ? '✓ ' : ''}
                          {g.delivered}/{g.target} {g.label.split('/')[1]}
                        </div>
                      ))}
                      {(() => {
                        const owedMin = owedMakeups(ws, c.studentId).reduce((sum, l) => sum + l.minutes, 0);
                        return owedMin > 0 ? <div className="prog owed">owed {owedMin}m</div> : null;
                      })()}
                    </td>
                    {IEP_STEPS.map(([key]) => (
                      <td key={key} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={c[key]}
                          onChange={(e) => patch(c, { [key]: e.target.checked })}
                        />
                      </td>
                    ))}
                    <td>
                      <input
                        value={c.notes}
                        placeholder="teacher / notes (no names)"
                        style={{ minWidth: 140 }}
                        onChange={(e) => patch(c, { notes: e.target.value })}
                      />
                    </td>
                    <td>
                      <button className="btn ghost small" title="Delete case" onClick={() => setConfirmDelete(c)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmBulk && (
        <ConfirmModal
          title={`Add ${untracked.length} IEP case${untracked.length === 1 ? '' : 's'}?`}
          message={`Every student without a case gets one Annual case with no due date - ${untracked
            .slice(0, 8)
            .map((s) => s.displayId)
            .join(', ')}${untracked.length > 8 ? '...' : ''}. Set each due date and type after.`}
          confirmLabel="Add cases"
          onConfirm={() => untracked.forEach((s) => upsertIepCase(newIepCase(s.id)))}
          onClose={() => setConfirmBulk(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete this IEP case?"
          message={`The ${confirmDelete.kind} case for Student ${
            ws.students.find((s) => s.id === confirmDelete.studentId)?.displayId ?? '?'
          } and its checklist will be removed. This cannot be undone.`}
          confirmLabel="Delete case"
          onConfirm={() => deleteIepCase(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
