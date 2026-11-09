import { useCallback, useEffect, useRef } from 'react';
import { markTourSeen, startTour, tourSeen, type TourHandle, type TourStep } from '../../../../shared/tour.js';

/**
 * Runs a page's guided tour (shared/tour.js) once, a moment after the page
 * mounts, and returns a function that replays it. The flag under `key` holds
 * nothing but "done" (keys follow the otsheet: prefix).
 */
export function useTour(key: string, steps: TourStep[], enabled = true): () => void {
  const handle = useRef<TourHandle | null>(null);
  const start = useCallback(() => {
    handle.current?.stop();
    handle.current = startTour(steps, {
      onDone: () => {
        markTourSeen(key);
        handle.current = null;
      },
    });
  }, [key, steps]);
  useEffect(() => {
    if (!enabled || tourSeen(key)) return;
    const t = window.setTimeout(start, 400);
    return () => {
      window.clearTimeout(t);
      handle.current?.stop();
      handle.current = null;
    };
  }, [enabled, key, start]);
  return start;
}

export const GALLERY_TOUR_KEY = 'otsheet:tour:gallery:v1';
export const GALLERY_TOUR: TourStep[] = [
  { target: 'profile', title: 'A child, by nickname', text: 'Add a child with a nickname such as “Fox”, never a real name. Their worksheet settings are remembered.' },
  { target: 'filters', title: 'Find the right worksheet', text: 'Narrow the list by age, goal and language.' },
  { target: 'gallery', title: 'Open any worksheet', text: 'Preview it, adjust it and print it on A4. No sign-up, and nothing leaves your browser.' },
  { target: 'guides', title: 'Guides for parents', text: 'Short reads on what each skill is for and how to practise it at home.' },
];

export const EDITOR_TOUR_KEY = 'otsheet:tour:editor:v1';
export const EDITOR_TOUR: TourStep[] = [
  { target: 'preview', title: 'The sheet as it prints', text: 'An A4 page. What you see here is what comes out of the printer.' },
  { target: 'regenerate', title: 'A fresh version', text: 'Regenerate makes a new version of the same worksheet, so practice never repeats.' },
  { target: 'customize', title: 'Make it fit the child', text: 'Customize changes size, difficulty, shapes, theme and font. Settings are kept for the chosen child.' },
  { target: 'print', title: 'Print', text: 'Print one, or five varied copies at once. A name typed onto the sheet is used for that printout only and never saved.' },
];
