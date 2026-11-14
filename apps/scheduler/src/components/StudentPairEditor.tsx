import { useWorkspaceStore } from '../store/useWorkspaceStore';

/** Rows of student pairs (prefer-together or cannot-group), add/remove/edit. */
export function StudentPairEditor({
  pairs,
  onChange,
  addLabel,
}: {
  pairs: Array<[string, string]>;
  onChange: (pairs: Array<[string, string]>) => void;
  addLabel: string;
}) {
  const ws = useWorkspaceStore((s) => s.ws);
  const students = [...ws.students].sort((a, b) =>
    a.displayId.localeCompare(b.displayId, undefined, { numeric: true }),
  );
  if (students.length < 2) return null;

  const select = (value: string, set: (id: string) => void) => (
    <select value={value} onChange={(e) => set(e.target.value)}>
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          Student {s.displayId}
        </option>
      ))}
    </select>
  );

  return (
    <div className="stack" style={{ gap: 6 }}>
      {pairs.map(([a, b], i) => (
        <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
          {select(a, (id) => onChange(pairs.map((p, pi) => (pi === i ? [id, p[1]] : p))))}
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>+</span>
          {select(b, (id) => onChange(pairs.map((p, pi) => (pi === i ? [p[0], id] : p))))}
          <button className="btn ghost small" onClick={() => onChange(pairs.filter((_, pi) => pi !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div>
        <button
          className="btn small"
          onClick={() => onChange([...pairs, [students[0].id, students[1].id]])}
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}
