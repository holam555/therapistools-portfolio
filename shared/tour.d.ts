export interface TourStep {
  /** The value of the data-tour attribute on the element to spotlight. */
  target: string;
  title: string;
  text: string;
}

export interface TourHandle {
  /** Remove the tour without calling onDone (the page is going away). */
  stop(): void;
}

/** Start a tour over the steps whose targets are on the page. Escape, Skip and Done call onDone. */
export function startTour(steps: TourStep[], options?: { onDone?: () => void }): TourHandle;

/** Whether the tour under this storage key was finished or skipped before. */
export function tourSeen(key: string): boolean;

export function markTourSeen(key: string): void;
