import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function WeekParityToggle() {
  const parity = useWorkspaceStore((s) => s.parity);
  const currentParity = useWorkspaceStore((s) => s.currentParity);
  const setParity = useWorkspaceStore((s) => s.setParity);

  return (
    <div
      className="segmented"
      title="Every week shows both weeks at once - biweekly sessions carry a wk A/B tag. Pick a single week to see exactly that week."
    >
      <button className={parity === 'both' ? 'on' : ''} onClick={() => setParity('both')}>
        Every week
      </button>
      {(['A', 'B'] as const).map((p) => (
        <button key={p} className={parity === p ? 'on' : ''} onClick={() => setParity(p)}>
          Week {p}
          {currentParity === p ? ' · now' : ''}
        </button>
      ))}
    </div>
  );
}
