import { SESSION_LENGTHS, groupKey } from '../domain/types';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

/** Editor for "these students go together" sets of two or more. */
export function StudentGroupEditor({
  groups,
  lens = {},
  onChange,
  onLensChange,
}: {
  groups: string[][];
  /** Chosen session length per group (groupKey -> minutes); absent = auto. */
  lens?: Record<string, number>;
  onChange: (groups: string[][]) => void;
  onLensChange?: (lens: Record<string, number>) => void;
}) {
  const ws = useWorkspaceStore((s) => s.ws);
  const students = [...ws.students].sort((a, b) =>
    a.displayId.localeCompare(b.displayId, undefined, { numeric: true }),
  );
  if (students.length < 2) return null;

  const firstUnused = (group: string[]) =>
    students.find((s) => !group.includes(s.id))?.id;

  return (
    <div className="stack" style={{ gap: 8 }}>
      {groups.map((group, gi) => (
        <div className="row" key={gi} style={{ gap: 6, alignItems: 'center' }}>
          {group.map((memberId, mi) => (
            <span className="row" key={mi} style={{ gap: 2, flexWrap: 'nowrap' }}>
              <select
                value={memberId}
                onChange={(e) =>
                  onChange(groups.map((g, i) => (i === gi ? g.map((m, j) => (j === mi ? e.target.value : m)) : g)))
                }
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    Student {s.displayId}
                  </option>
                ))}
              </select>
              {group.length > 2 && (
                <button
                  className="btn ghost small"
                  style={{ padding: '0 4px' }}
                  title="Remove from group"
                  onClick={() =>
                    onChange(groups.map((g, i) => (i === gi ? g.filter((_, j) => j !== mi) : g)))
                  }
                >
                  ✕
                </button>
              )}
              {mi < group.length - 1 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>+</span>}
            </span>
          ))}
          <button
            className="btn small"
            disabled={firstUnused(group) === undefined}
            title="Add another student to this group"
            onClick={() =>
              onChange(groups.map((g, i) => (i === gi ? [...g, firstUnused(group)!] : g)))
            }
          >
            +
          </button>
          {onLensChange && (
            <select
              value={lens[groupKey(group)] ?? ''}
              title="Session length for this group. Auto = the shortest member's need; pick a length to run it longer and cover a bigger member inside the group."
              onChange={(e) => {
                const next = { ...lens };
                if (e.target.value === '') delete next[groupKey(group)];
                else next[groupKey(group)] = Number(e.target.value);
                onLensChange(next);
              }}
            >
              <option value="">auto</option>
              {SESSION_LENGTHS.map((len) => (
                <option key={len} value={len}>
                  {len} min
                </option>
              ))}
            </select>
          )}
          <button
            className="btn ghost small"
            title="Delete this group"
            onClick={() => onChange(groups.filter((_, i) => i !== gi))}
          >
            ✕ group
          </button>
        </div>
      ))}
      <div>
        <button
          className="btn small"
          onClick={() => onChange([...groups, [students[0].id, students[1].id]])}
        >
          + group
        </button>
      </div>
    </div>
  );
}
