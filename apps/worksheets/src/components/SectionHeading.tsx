import { ReactNode } from 'react';

/** Hand-drawn outline star — the worksheet reward-row motif, reused as the
 * section marker so headings read "crayon sticker", not emoji. */
function CrayonStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.2 14.6 8.9 20.8 9.6 16.2 13.8 17.5 20 12 16.9 6.5 20 7.8 13.8 3.2 9.6 9.4 8.9 Z" />
    </svg>
  );
}

interface Props {
  children: ReactNode;
  /** Optional right-aligned slot (e.g. an "All guides →" link). */
  right?: ReactNode;
  /** Optional one-line muted subtitle under the heading. */
  sub?: ReactNode;
  as?: 'h2' | 'h3';
  id?: string;
}

/** The site-wide section heading: crayon star + Fredoka title, one visual
 * voice for every content strip (gallery, goal pages, guides, FAQ). */
export default function SectionHeading({ children, right, sub, as: Tag = 'h2', id }: Props) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <Tag id={id} className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <CrayonStar className="w-5 h-5 text-secondary shrink-0" />
          {children}
        </Tag>
        {sub && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
