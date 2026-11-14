import { useEffect } from 'react';

const DEFAULT_TITLE = 'Free Printable OT Worksheets for Kids (Handwriting & Visual Perception) · Therapistools';

/**
 * Per-route <title> + meta description. This only helps crawlers that execute
 * JS (Google does; most AI answer engines don't) — build-time prerendering of
 * these routes is the real fix and is specified in ROADMAP.md.
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Therapistools` : DEFAULT_TITLE;
    if (description) {
      const el = document.querySelector('meta[name="description"]');
      const prev = el?.getAttribute('content') ?? null;
      el?.setAttribute('content', description);
      return () => {
        document.title = DEFAULT_TITLE;
        if (prev !== null) el?.setAttribute('content', prev);
      };
    }
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description]);
}
