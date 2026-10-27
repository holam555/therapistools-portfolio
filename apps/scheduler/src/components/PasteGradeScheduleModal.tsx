import { useMemo, useState } from 'react';
import {
  defaultMasterAction,
  parseGradeScheduleText,
  type MasterAction,
} from '../domain/importMaster';
import type { Grade } from '../domain/types';
import { formatMinutesWithPeriod } from '../domain/types';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useEscapeToClose } from './useEscapeToClose';

/**
 * Paste ONE grade's schedule straight from Excel: a single column of
 * periods, each carrying its own time range. Every period chooses whether
 * it blocks everyone, only opted-in students, or is left out entirely.
 */
export function PasteGradeScheduleModal({
  grade,
  onClose,
}: {
  grade: Grade;
  onClose: () => void;
}) {
  const ws = useWorkspaceStore((s) => s.ws);
  const upsertGrade = useWorkspaceStore((s) => s.upsertGrade);
  const updateSettings = useWorkspaceStore((s) => s.updateSettings);
  const [text, setText] = useState('');
  const [overrides, setOverrides] = useState<Map<string, MasterAction>>(new Map());
  const [replace, setReplace] = useState(true);
  const [applied, setApplied] = useState<number | null>(null);
  useEscapeToClose(onClose);

  const parsed = useMemo(() => (text.trim() ? parseGradeScheduleText(text) : null), [text]);
  const actionFor = (label: string): MasterAction =>
    overrides.get(label) ?? (defaultMasterAction(label) === 'optional' ? 'optional' : 'block');

  function apply() {
    if (!parsed) return;
    const kept = parsed.blocks.filter((b) => actionFor(b.label) !== 'open');
    const blocks = kept.flatMap((b) =>
      ([0, 1, 2, 3, 4] as const).map((day) => ({
        day,
        start: b.start,
        end: b.end,
        label: b.label,
        optional: actionFor(b.label) === 'optional' ? true : undefined,
      })),
    );
    upsertGrade({
      ...grade,
      templatePolarity: 'blocked',
      templateBlocks: replace ? blocks : [...grade.templateBlocks, ...blocks],
    });
    const newCategories = [...new Set(kept.map((b) => b.label))].filter(
      (l) => !ws.settings.avoidCategories.includes(l),
    );
    if (newCategories.length > 0) {
      updateSettings({ avoidCategories: [...ws.settings.avoidCategories, ...newCategories] });
    }
    setApplied(kept.length);
  }

  const keptCount = parsed?.blocks.filter((b) => actionFor(b.label) !== 'open').length ?? 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 620, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Paste {grade.name}'s schedule</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0, fontSize: 13 }}>
          Copy this grade's column straight out of Excel and paste it below. Each period
          needs its name and its own time range ("Math 11:25 - 12:25"); blank rows,
          duration text, and notes in brackets are ignored. Rows apply Monday through
          Friday.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'Kindergarten\nDo Now 7:40 - 7:50 10 min.\nMorning Meeting 7:50 - 8:00 10 min.\nMath 11:25 - 12:25 60 min.'}
          style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
        />

        {parsed && parsed.issues.length > 0 && (
          <ul style={{ color: 'var(--muted)', fontSize: 12, paddingLeft: 18, margin: '8px 0' }}>
            {parsed.issues.map((i, x) => (
              <li key={x}>{i.message}</li>
            ))}
          </ul>
        )}

        {parsed && parsed.blocks.length > 0 && (
          <>
            {parsed.gradeName && parsed.gradeName.toLowerCase() !== grade.name.toLowerCase() && (
              <p style={{ color: '#8a6d1d', fontSize: 12, fontWeight: 600, margin: '4px 0' }}>
                This paste is headed "{parsed.gradeName}" but you are editing {grade.name}.
              </p>
            )}
            <table className="list-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Time</th>
                  <th>Treat as</th>
                </tr>
              </thead>
              <tbody>
                {parsed.blocks.map((b, i) => (
                  <tr key={i}>
                    <td>{b.label}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatMinutesWithPeriod(b.start)}-{formatMinutesWithPeriod(b.end)}
                    </td>
                    <td>
                      <select
                        value={actionFor(b.label)}
                        onChange={(e) => {
                          const next = new Map(overrides);
                          next.set(b.label, e.target.value as MasterAction);
                          setOverrides(next);
                        }}
                      >
                        <option value="block">Blocks everyone</option>
                        <option value="optional">Only students who need it</option>
                        <option value="open">Do not add</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="rail-check" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Replace {grade.name}'s current schedule ({grade.templateBlocks.length} block(s))
            </label>
          </>
        )}

        {applied !== null && (
          <p style={{ color: 'var(--gap-ink)', fontWeight: 700, fontSize: 13 }}>
            ✓ {applied} period(s) saved to {grade.name}, Monday through Friday.
          </p>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={onClose}>
            {applied !== null ? 'Done' : 'Cancel'}
          </button>
          {parsed && parsed.blocks.length > 0 && applied === null && (
            <button className="btn primary" onClick={apply}>
              Add {keptCount} period(s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
