import { useCallback, useState } from 'react';

const KEY = 'otsheet:printCount';
/** After this many prints we show a gentle, non-blocking nudge. Never gates use. */
export const NUDGE_AFTER = 3;

function read(): number {
  try {
    return parseInt(localStorage.getItem(KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Tracks how many worksheets the visitor has printed, purely to power a friendly
 * "enjoying these?" nudge. There is no login wall and nothing is ever blocked —
 * printing always works.
 */
export function usePrintCount() {
  const [count, setCount] = useState<number>(read);

  const increment = useCallback(() => {
    const next = read() + 1;
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* ignore storage failures */
    }
    setCount(next);
    return next;
  }, []);

  return { count, increment, shouldNudge: count >= NUDGE_AFTER };
}
