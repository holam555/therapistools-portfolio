import { useState } from 'react';

interface InlineAddProps {
  placeholder: string;
  buttonLabel: string;
  /** Return an error message to reject the value, or undefined to accept. */
  onAdd: (value: string) => string | undefined;
  /** Render already expanded (skip the "+ label" button). */
  startOpen?: boolean;
  /** Called whenever the form closes (added or cancelled). */
  onDone?: () => void;
}

/** Small input + button add-form; replaces window.prompt (blocked in some browsers). */
export function InlineAdd({ placeholder, buttonLabel, onAdd, startOpen = false, onDone }: InlineAddProps) {
  const [open, setOpen] = useState(startOpen);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const v = value.trim();
    if (!v) return;
    const err = onAdd(v);
    if (err) {
      setError(err);
      return;
    }
    setValue('');
    setError(null);
    setOpen(false);
    onDone?.();
  }

  if (!open) {
    return (
      <button className="btn small" onClick={() => setOpen(true)}>
        + {buttonLabel}
      </button>
    );
  }

  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <span className="stack" style={{ gap: 2 }}>
        <input
          autoFocus
          value={value}
          placeholder={placeholder}
          style={{ width: 180 }}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setOpen(false);
              setValue('');
              setError(null);
              onDone?.();
            }
          }}
        />
        {error && (
          <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>{error}</span>
        )}
      </span>
      <button className="btn primary small" onClick={submit}>
        Add
      </button>
      <button
        className="btn ghost small"
        onClick={() => {
          setOpen(false);
          setValue('');
          setError(null);
          onDone?.();
        }}
      >
        ✕
      </button>
    </span>
  );
}
