import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TemplateCard from '@/components/gallery/TemplateCard';
import { usePageMeta } from '@/hooks/use-page-meta';
import { TEMPLATES } from '@/data/templates';
import { GOAL_COPY } from '@/data/goalCopy';
import { getGuide } from '@/data/guides';
import NotFound from '@/pages/NotFound';
import { APP_URL } from '@/lib/site';

const SITE = APP_URL;

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getGuide(slug) : undefined;

  const relatedTemplates = useMemo(
    () => (guide ? guide.relatedTemplates.map((id) => TEMPLATES.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t) : []),
    [guide]
  );

  usePageMeta(guide?.title, guide?.metaDescription);

  if (!guide) return <NotFound />;

  const url = `${SITE}/guides/${guide.slug}`;
  // Article + FAQPage + Breadcrumb — prerendered so search + AI can parse it.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description: guide.metaDescription,
        dateModified: guide.updated,
        author: { '@type': 'Organization', name: 'Therapistools' },
        publisher: { '@type': 'Organization', name: 'Therapistools' },
        mainEntityOfPage: url,
        about: 'Pediatric occupational therapy, children’s handwriting and visual-motor skills',
      },
      {
        '@type': 'FAQPage',
        mainEntity: guide.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Therapistools', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}/guides` },
          { '@type': 'ListItem', position: 3, name: guide.navLabel, item: url },
        ],
      },
    ],
  };

  const templateStrip = relatedTemplates.length > 0 && (
    <section aria-label="Try a worksheet" className="rounded-2xl bg-primary/5 border border-primary/15 p-4 sm:p-5">
      <h2 className="font-display text-lg font-bold text-foreground mb-1 flex items-center gap-2">
        <Printer className="w-5 h-5 text-primary" /> Try it now: print one of these
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Free, customizable, no signup.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {relatedTemplates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader
        right={
          <Link to="/guides" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> All guides
          </Link>
        }
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <article className="space-y-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Guide</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight mt-1">{guide.title}</h1>
            <p className="text-xs text-muted-foreground mt-2">Reviewed {new Date(guide.updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
          </header>

          {guide.sections.map((s, i) => (
            <div key={i} className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-foreground/90 leading-relaxed">{p}</p>
              ))}
              {/* Milestones table drops in after the "what's typical by age" section. */}
              {i === 2 && guide.milestones && (
                <div className="overflow-hidden rounded-xl border border-border mt-2">
                  <table className="w-full text-sm">
                    <tbody>
                      {guide.milestones.map((m, k) => (
                        <tr key={k} className={k % 2 ? 'bg-muted/40' : ''}>
                          <th scope="row" className="text-left align-top font-display font-bold text-foreground px-3 py-2.5 whitespace-nowrap w-28">{m.age}</th>
                          <td className="text-muted-foreground px-3 py-2.5 leading-relaxed">{m.expect}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Mid-article: surface the worksheets after the reader has context. */}
              {i === 1 && templateStrip}
            </div>
          ))}
        </article>

        <section aria-label="Frequently asked questions" className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Frequently asked questions</h2>
          {guide.faq.map((f, i) => (
            <div key={i}>
              <h3 className="font-display font-semibold text-foreground">{f.q}</h3>
              <p className="text-muted-foreground mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </section>

        {guide.relatedGoals.length > 0 && (
          <section aria-label="Related worksheet collections" className="border-t border-border pt-6">
            <p className="text-sm font-semibold text-foreground mb-2">More printable worksheets</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {guide.relatedGoals.map((g) => (
                <li key={g}>
                  <Link to={`/goals/${g}`} className="text-primary hover:underline">{GOAL_COPY[g].navLabel}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          General educational information, not medical advice. Every child develops differently. If you have concerns, talk to your pediatrician or an occupational therapist.
        </p>
      </main>

      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
