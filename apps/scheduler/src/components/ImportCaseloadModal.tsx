import { useState } from 'react';
import { caseloadGoalsFor, parseCaseloadText, parseCaseloadWorkbook, type CaseloadParse } from '../domain/importCaseload';
import type { Provider, Student } from '../domain/types';
import { readWorkbook } from '../storage/readWorkbook';
import { newId, useWorkspaceStore } from '../store/useWorkspaceStore';
import { useEscapeToClose } from './useEscapeToClose';

/**
 * Upload a service caseload (.xlsx): one row per goal, Case # | Grade |
 * Service [| Setting]. Push-in rows are skipped; the rest create or update
 * students in bulk under the chosen provider.
 */
export function ImportCaseloadModal({ onClose }: { onClose: () => void }) {
  const ws = useWorkspaceStore((s) => s.ws);
  const upsertStudent = useWorkspaceStore((s) => s.upsertStudent);
  const upsertProvider = useWorkspaceStore((s) => s.upsertProvider);
  const upsertGrade = useWorkspaceStore((s) => s.upsertGrade);
  const [parsed, setParsed] = useState<CaseloadParse | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [providerId, setProviderId] = useState(
    ws.providers.find((p) => p.name.toUpperCase() === 'OT')?.id ?? ws.providers[0]?.id ?? 'new-ot',
  );
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ created: number; updated: number } | null>(null);
  useEscapeToClose(onClose);

  async function onFile(file: File) {
    setError(null);
    setApplied(null);
    try {
      const result = parseCaseloadWorkbook(await readWorkbook(file));
      if (result.students.length === 0) {
        setError(result.issues.map((i) => i.message).join(' ') || 'Nothing recognized in that file.');
        setParsed(null);
        return;
      }
      setParsed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    }
  }

  function apply() {
    if (!parsed) return;
    // Resolve (or create) the provider the goals belong to.
    let provider = ws.providers.find((p) => p.id === providerId);
    if (!provider) {
      provider = { id: newId(), name: 'OT', color: '#c75b39', availability: [] } satisfies Provider;
      upsertProvider(provider);
    }
    const pid = provider.id;

    // Grades referenced by level; create bare ones that don't exist yet.
    const gradeFor = new Map<number, string>();
    for (const g of ws.grades) {
      if (g.level !== undefined && !gradeFor.has(g.level)) gradeFor.set(g.level, g.id);
    }
    let created = 0;
    let updated = 0;
    for (const s of parsed.students) {
      let gradeId: string | undefined;
      if (s.gradeLevel !== undefined) {
        gradeId = gradeFor.get(s.gradeLevel);
        if (!gradeId) {
          const g = {
            id: newId(),
            name: s.gradeLevel === 0 ? 'Grade K' : `Grade ${s.gradeLevel}`,
            level: s.gradeLevel,
            templatePolarity: 'blocked' as const,
            templateBlocks: [],
          };
          upsertGrade(g);
          gradeFor.set(s.gradeLevel, g.id);
          gradeId = g.id;
        }
      }
      const existing = ws.students.find((st) => st.displayId === s.displayId);
      if (existing) {
        // Replace this provider's goals; other providers' goals stay.
        upsertStudent({
          ...existing,
          gradeId: gradeId ?? existing.gradeId,
          serviceGoals: [
            ...existing.serviceGoals.filter((g) => g.providerId !== pid),
            ...caseloadGoalsFor(pid, s),
          ],
        });
        updated++;
      } else {
        const student: Student = {
          id: newId(),
          displayId: s.displayId,
          gradeId: gradeId ?? ws.grades[0]?.id ?? '',
          serviceGoals: caseloadGoalsFor(pid, s),
          overrides: [],
        };
        upsertStudent(student);
        created++;
      }
    }
    setApplied({ created, updated });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 620, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h2>Import caseload</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0, fontSize: 13 }}>
          Upload an Excel sheet or paste rows, one per goal. Two layouts are read:
          Case # | Grade | Service ("90 min monthly"), or Case No. | Plan Information.
          Direct push-in rows are skipped - this app schedules pull-out service.
          Student numbers only, names never import.
        </p>
        <div className="row">
          <label className="field">
            Goals belong to
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {ws.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {ws.providers.length === 0 && <option value="new-ot">OT (will be created)</option>}
            </select>
          </label>
          <label className="field">
            File
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        </div>
        <label className="field" style={{ marginTop: 8 }}>
          Or paste rows
          <textarea
            value={pasteText}
            rows={4}
            placeholder={'Case No.\tPlan Information\n1\t8/1/2025 - 8/1/2026 Occupational Therapy (Direct | Outside) 90 minutes monthly\n2\t9/1/2025 - 9/1/2026 Occupational Therapy (Indirect | Inside) 10 minutes monthly'}
            style={{ width: '100%', fontFamily: 'inherit', fontSize: 12 }}
            onChange={(e) => {
              setPasteText(e.target.value);
              setApplied(null);
              setError(null);
              if (e.target.value.trim()) {
                const result = parseCaseloadText(e.target.value);
                setParsed(result.students.length > 0 || result.issues.length > 0 ? result : null);
              } else {
                setParsed(null);
              }
            }}
          />
        </label>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

        {parsed && (
          <>
            {parsed.issues.length > 0 && (
              <ul style={{ color: 'var(--muted)', fontSize: 12, paddingLeft: 18, margin: '8px 0' }}>
                {parsed.issues.map((i, x) => (
                  <li key={x}>{i.message}</li>
                ))}
              </ul>
            )}
            <table className="list-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Grade</th>
                  <th>Goals</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parsed.students.map((s) => (
                  <tr key={s.displayId}>
                    <td>
                      <strong>{s.displayId}</strong>
                    </td>
                    <td>{s.gradeLevel === undefined ? '?' : s.gradeLevel === 0 ? 'K' : s.gradeLevel}</td>
                    <td>
                      {s.goals
                        .map(
                          (g) =>
                            `${g.minutes} min/${g.period.replace('ly', '')}${g.type === 'indirect' ? ' indirect' : ''}`,
                        )
                        .join(' · ')}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>
                      {ws.students.some((st) => st.displayId === s.displayId) ? 'update' : 'new'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {applied && (
          <p style={{ color: 'var(--gap-ink)', fontWeight: 700, fontSize: 13 }}>
            ✓ {applied.created} student{applied.created === 1 ? '' : 's'} created,{' '}
            {applied.updated} updated.
          </p>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={onClose}>
            {applied ? 'Done' : 'Cancel'}
          </button>
          {parsed && !applied && (
            <button className="btn primary" onClick={apply}>
              Import {parsed.students.length} student{parsed.students.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
