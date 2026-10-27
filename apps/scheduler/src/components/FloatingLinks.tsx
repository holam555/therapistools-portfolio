/*
 * Two small links that sit above every page, bottom right.
 *
 * These point at Tally-hosted forms, opened in a new tab so nothing is
 * embedded in the app itself. Blanking a URL disables its button rather
 * than removing it, so the layout stays the same either way.
 */
// Form addresses live in shared/brand.js so every tool and the privacy page agree.
import { FEEDBACK_URL, UPDATES_URL } from '../../../../shared/brand.js';

interface FloatingLinkProps {
  href: string;
  label: string;
  short: string;
  title: string;
}

function FloatingLink({ href, label, short, title }: FloatingLinkProps) {
  if (!href) {
    return (
      <button className="floating-link" disabled title={`${title} (link not added yet)`}>
        <span className="floating-full">{label}</span>
        <span className="floating-short">{short}</span>
      </button>
    );
  }
  return (
    <a
      className="floating-link"
      href={href}
      target="_blank"
      // noreferrer keeps the form from learning which page sent you.
      rel="noopener noreferrer"
      title={title}
    >
      <span className="floating-full">{label}</span>
      <span className="floating-short">{short}</span>
    </a>
  );
}

export function FloatingLinks() {
  return (
    <div className="floating-links">
      <FloatingLink
        href={FEEDBACK_URL}
        label="Give feedback"
        short="Feedback"
        title="Tell me what is broken, confusing, or missing"
      />
      <FloatingLink
        href={UPDATES_URL}
        label="Get updates"
        short="Updates"
        title="Hear about new versions"
      />
    </div>
  );
}
