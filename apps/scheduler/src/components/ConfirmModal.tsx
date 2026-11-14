import { useEscapeToClose } from './useEscapeToClose';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Omit to render an acknowledge-only dialog (single OK button). */
  onConfirm?: () => void;
  onClose: () => void;
}

/** In-app replacement for window.confirm/alert - those are blocked in some browsers. */
export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEscapeToClose(onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>{message}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {onConfirm ? (
            <>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
