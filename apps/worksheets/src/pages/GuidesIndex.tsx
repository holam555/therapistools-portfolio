import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { usePageMeta } from '@/hooks/use-page-meta';
import { GUIDES } from '@/data/guides';

export default function GuidesIndex() {
  usePageMeta(
    'Guides: Helping Kids with Handwriting & Fine Motor',
    'Practical, therapist-informed guides for parents: letter reversals, scissor skills, pre-writing, handwriting readiness and more, each with free printables.'
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader
        right={
          <Link to="/" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Worksheets
          </Link>
        }
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">Guides for parents</h1>
          <p className="text-muted-foreground mt-3 text-base max-w-2xl">
            Plain-language, therapist-informed answers to the questions parents actually ask, plus the free
            printables to practise with. General educational information, not medical advice.
          </p>
        </div>

        <ul className="space-y-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                to={`/guides/${g.slug}`}
                className="group block rounded-2xl border border-border bg-card p-5 shadow-paper hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                <h2 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">{g.title}</h2>
                <p className="text-sm text-muted-foreground mt-1.5">{g.metaDescription}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-3">
                  Read guide <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
