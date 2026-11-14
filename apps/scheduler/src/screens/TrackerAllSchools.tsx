import { migrateWorkspace } from '../domain/migrate';
import { isCaseDone, isDueSoon, isOverdue, sortCases } from '../domain/iepTracker';
import { goalProgress } from '../domain/serviceLog';
import type { IepCase, Workspace } from '../domain/types';
import { isoDate } from '../domain/serviceLog';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

interface SchoolCases {
  schoolId: string;
  schoolName: string;
  ws: Workspace;
  cases: IepCase[];
}

/**
 * Every school's IEP cases in one list, read-only. The active school's data
 * comes from the live store; the others are read straight from their stored
 * workspaces. Editing stays inside the owning school - the Open button
 * switches there - so two schools never write into each other's data.
 */
export function AllSchoolsTab({ onOpenSchool }: { onOpenSchool: () => void }) {
  const ws = useWorkspaceStore((s) => s.ws);
  const schools = useWorkspaceStore((s) => s.schools);
  const activeSchoolId = useWorkspaceStore((s) => s.activeSchoolId);
  const switchSchool = useWorkspaceStore((s) => s.switchSchool);

  const today = isoDate(new Date());

  const perSchool: SchoolCases[] = schools.flatMap((school) => {
    let workspace: Workspace | null = null;
    if (school.id === activeSchoolId) workspace = ws;
    else {
      const raw = localStorage.getItem(school.storageKey);
      if (raw) {
        try {
          workspace = migrateWorkspace(JSON.parse(raw));
        } catch {
          workspace = null;
        }
      }
    }
    if (!workspace || workspace.iepCases.length === 0) return [];
    const number = (id: string) => Number(workspace!.students.find((s) => s.id === id)?.displayId) || 0;
    return [
      {
        schoolId: school.id,
        schoolName: school.name,
        ws: workspace,
        cases: sortCases(workspace.iepCases, number),
      },
    ];
  });

  const rows = perSchool
    .flatMap((s) => s.cases.map((c) => ({ school: s, c })))
    .sort((a, b) => {
      if (a.c.dateDue !== b.c.dateDue) {
        if (!a.c.dateDue) return 1;
        if (!b.c.dateDue) return -1;
        return a.c.dateDue < b.c.dateDue ? -1 : 1;
      }
      return a.school.schoolName.localeCompare(b.school.schoolName);
    });

  const overdue = rows.filter((r) => isOverdue(r.c, today)).length;
  const dueSoon = rows.filter((r) => isDueSoon(r.c, today)).length;

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">No IEP cases in any school yet.</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {rows.length} case{rows.length === 1 ? '' : 's'} across {perSchool.length} school
          {perSchool.length === 1 ? '' : 's'} - read-only here, Open a case's school to edit.
        </span>
        {(overdue > 0 || dueSoon > 0) && (
          <span style={{ fontSize: 13 }}>
            {overdue > 0 && <strong style={{ color: '#b3261e' }}>{overdue} overdue</strong>}
            {overdue > 0 && dueSoon > 0 && ' · '}
            {dueSoon > 0 && <span style={{ color: 'var(--gap-ink)' }}>{dueSoon} due soon</span>}
          </span>
        )}
      </div>
      <table className="list-table iep-table">
        <thead>
          <tr>
            <th>School</th>
            <th>Student</th>
            <th>Due</th>
            <th>Type</th>
            <th title="Delivered vs mandate in the period each goal is written in">Minutes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ school, c }) => {
            const student = school.ws.students.find((s) => s.id === c.studentId);
            const late = isOverdue(c, today);
            const soon = isDueSoon(c, today);
            const progress = goalProgress(school.ws, c.studentId, today);
            return (
              <tr key={c.id} className={isCaseDone(c) ? 'iep-done' : ''}>
                <td>{school.schoolName}</td>
                <td style={{ whiteSpace: 'nowrap' }}>Student {student?.displayId ?? '?'}</td>
                <td className={late ? 'iep-late' : soon ? 'iep-soon' : ''} style={{ whiteSpace: 'nowrap' }}>
                  {c.dateDue || '-'}
                </td>
                <td>{c.kind}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {progress.length === 0 && <span style={{ color: 'var(--muted)' }}>no goal</span>}
                  {progress.map((g) => (
                    <div key={g.label} className={g.met ? 'prog met' : 'prog'}>
                      {g.met ? '✓ ' : ''}
                      {g.delivered}/{g.target} {g.label.split('/')[1]}
                    </div>
                  ))}
                </td>
                <td>
                  {school.schoolId === activeSchoolId ? (
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>this school</span>
                  ) : (
                    <button
                      className="btn ghost small"
                      title={`Switch to ${school.schoolName} to edit this case`}
                      onClick={() => {
                        void switchSchool(school.schoolId).then(onOpenSchool);
                      }}
                    >
                      Open →
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
