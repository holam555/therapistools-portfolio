import { useEffect, useRef, useState, type KeyboardEvent } from "react";

/** Text that turns into an input when clicked. Enter saves, Esc cancels. */
export function InlineEdit({
  value,
  onSave,
  label,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);
  if (!editing)
    return (
      <button
        type="button"
        className={`inline-edit ${className}`}
        title={`Rename ${label}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {value}
      </button>
    );
  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
  };
  return (
    <input
      ref={ref}
      className={`inline-input ${className}`}
      aria-label={`Rename ${label}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

/** A "+ Add …" button that turns into a text field. */
export function AddInline({ label, placeholder, onAdd, className = "" }: { label: string; placeholder: string; onAdd: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open)
    return (
      <button type="button" className={`btn btn-ghost ${className}`} onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  const commit = () => {
    if (draft.trim()) onAdd(draft.trim());
    setDraft("");
    setOpen(false);
  };
  return (
    <span className={`add-inline ${className}`}>
      <input
        ref={ref}
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft("");
            setOpen(false);
          }
        }}
      />
      <button type="button" className="btn btn-sm" onClick={commit}>
        Add
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={() => {
          setDraft("");
          setOpen(false);
        }}
      >
        Cancel
      </button>
    </span>
  );
}

export function confirmAction(message: string): boolean {
  return window.confirm(message);
}

/** Save a text file through the browser's normal download flow. No network involved. */
export function downloadText(filename: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Modal dialog; Escape closes it. */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** What the highlight colors mean. Shown wherever tokens are displayed. */
export function TokenLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`legend ${compact ? "legend-compact" : ""}`} aria-label="What the colors mean">
      <span><span className="tok tok-reserved">blue</span> filled in for you (student, he/she)</span>
      <span><span className="tok tok-var">yellow</span> a blank you fill in when building an IEP</span>
      <span><span className="tok tok-unknown">pink</span> a blank with no preset choices yet (free text)</span>
    </div>
  );
}
