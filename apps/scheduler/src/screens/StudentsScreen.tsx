import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImportCaseloadModal } from '../components/ImportCaseloadModal';
import { buildStudentCards } from '../domain/studentCards';
import type { Student } from '../domain/types';
import { downloadStudentCardsDocx } from '../storage/exportStudentCardsDocx';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';

export function StudentsScreen() {
  const navigate = useNavigate();
  const ws = useWorkspaceStore((s) => s.ws);
  const upsertStudent = useWorkspaceStore((s) => s.upsertStudent);
  const [importing, setImporting] = useState(false);

  // Numbers are assigned automatically - the user never types an ID, so
  // there is never a temptation to type a name or a real student ID.
  function addStudent() {
    const next = ws.students.reduce((m, s) => Math.max(m, Number(s.displayId) || 0), 0) + 1;
    const s: Student = {
      id: newId(),
      displayId: String(next),
      gradeId: ws.grades[0]?.id ?? '',
      serviceGoals: [],
      overrides: [],
    };
    upsertStudent(s);
    navigate(`/students/${s.id}`);
  }

  const cards = buildStudentCards(ws);

  function exportCards() {
    downloadStudentCardsDocx(cards, `student-cards-${new Date().toISOString().slice(0, 10)}.docx`);
  }

  const gradeName = (id: string) => ws.grades.find((g) => g.id === id)?.name ?? '-';

  return (
    <div className="stack" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-head">
        <h1>Students</h1>
        <div className="row">
          <button
            className="btn small"
            title="Upload a caseload Excel (Case # | Grade | Service) and create every student at once"
            onClick={() => setImporting(true)}
          >
            Import caseload
          </button>
          <button
            className="btn small"
            disabled={cards.length === 0}
            title={
              cards.length === 0
                ? 'No sessions are booked yet, so there is nothing to put on a card'
                : `Word file: one printable card per student showing who sees them and when (${cards.length} ready)`
            }
            onClick={exportCards}
          >
            Print cards (Word)
          </button>
          <button className="btn primary small" onClick={addStudent}>
            + Add student
          </button>
        </div>
      </div>
      <div className="warn-flag">
        <strong>NEVER enter personal information.</strong> No names, no real student IDs,
        no birthdays - in any field, note, or label. Students are numbered automatically
        (Student 1, 2, 3...); keep your own name list outside this app and match it to
        these numbers yourself.
      </div>
      {importing && <ImportCaseloadModal onClose={() => setImporting(false)} />}
      <div className="card">
        {ws.students.length === 0 ? (
          <div className="empty-state">
            <h2>No students yet</h2>
            Click + Add student and numbers are assigned for you.
          </div>
        ) : (
          <table className="list-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade</th>
                <th>Service goals</th>
                <th>Booked sessions</th>
              </tr>
            </thead>
            <tbody>
              {[...ws.students]
                .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true }))
                .map((s) => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/students/${s.id}`)}>
                    <td>
                      <strong>Student {s.displayId}</strong>
                    </td>
                    <td>{gradeName(s.gradeId)}</td>
                    <td>
                      {s.serviceGoals.length === 0
                        ? '-'
                        : s.serviceGoals
                            .map((g) => {
                              const p = ws.providers.find((p) => p.id === g.providerId);
                              return g.type === 'indirect'
                                ? `${p?.name ?? '?'} indirect`
                                : `${p?.name ?? '?'} ${g.minutes} min/${(g.period ?? 'monthly').replace('ly', '')}`;
                            })
                            .join(' · ')}
                    </td>
                    <td>{ws.sessions.filter((x) => x.studentIds.includes(s.id)).length}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
