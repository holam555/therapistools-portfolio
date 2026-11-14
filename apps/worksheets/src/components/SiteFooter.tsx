import { Link } from 'react-router-dom';
import { GOAL_COPY, GOAL_SLUGS } from '@/data/goalCopy';
import { GUIDES } from '@/data/guides';
import { APP_BASE } from "@/lib/site";
import { FEEDBACK_URL, PRIVACY_PATH } from "../../../../shared/brand.js";

export default function SiteFooter() {
  return (
    <footer className="no-print mt-14">
      {/* The tracing-path motif closes every page. */}
      <div className="dotted-divider max-w-7xl mx-auto" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand block: who we are + the product thesis, signed by hand. */}
          <div className="lg:pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true">
                  {/* The Therapistools mark (shared/logo.svg): a T whose stem is a pencil. */}
                  <rect x="13" y="12" width="38" height="10" rx="5" fill="#fff" />
                  <rect x="27" y="21" width="10" height="4" fill="#ee7c2b" />
                  <rect x="27" y="25" width="10" height="21" fill="#fff" />
                  <path d="M27 46h10l-5 9z" fill="#f4e3c4" />
                  <path d="M30 51.2h4L32 55z" fill="#1b5b54" />
                </svg>
              </div>
              <p className="font-display text-base font-extrabold text-foreground">Therapistools Worksheets</p>
            </div>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Printable practice sheets for growing hands and sharp little eyes.
              Free to print, always. No accounts, no paywalls.
            </p>
            <p className="font-hand text-xl text-secondary mt-3 -rotate-2">made with care ✎</p>
          </div>

          {/* Browse-by-goal links: internal linking so search engines discover the
              content pages, and a real navigation aid for parents. */}
          <nav aria-label="Browse worksheets by goal">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Browse by goal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {GOAL_SLUGS.map((slug) => (
                <li key={slug}>
                  <Link to={`/goals/${slug}`} className="hover:text-foreground transition-colors">
                    {GOAL_COPY[slug].navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Learn: the guides content space. */}
          <nav aria-label="Guides for parents">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Learn</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/guides" className="hover:text-foreground transition-colors font-semibold">All guides</Link></li>
              {GUIDES.slice(0, 6).map((g) => (
                <li key={g.slug}>
                  <Link to={`/guides/${g.slug}`} className="hover:text-foreground transition-colors">
                    {g.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="About these worksheets">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">About</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href={`${APP_BASE}/#about`} className="hover:text-foreground transition-colors">About these worksheets</a></li>
              <li><a href={`${PRIVACY_PATH}#worksheets`} className="hover:text-foreground transition-colors">Privacy</a></li>
              <li><a href={FEEDBACK_URL} target="_blank" rel="noopener" className="hover:text-foreground transition-colors">Contact and feedback</a></li>
              <li>
                {/* TODO: replace with real Buy Me a Coffee link */}
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-secondary/25 transition-colors"
                >
                  ☕ Buy Me a Coffee
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-5">
          © Therapistools · Made with care for little learners.
        </p>
      </div>
    </footer>
  );
}
