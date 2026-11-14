import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, PenLine, Scissors, Waves, LucideIcon } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SectionHeading from '@/components/SectionHeading';
import TemplateCard from '@/components/gallery/TemplateCard';
import { usePageMeta } from '@/hooks/use-page-meta';
import { TEMPLATES, ageBandLabel } from '@/data/templates';
import { GOAL_COPY } from '@/data/goalCopy';
import { guidesForGoal } from '@/data/guides';
import { categoryForGoal, CATEGORY_STYLES, Category } from '@/lib/categoryColors';
import NotFound from '@/pages/NotFound';
import { APP_URL } from '@/lib/site';

/** Line-art icon per skill family — same visual language as the worksheet
 * instruction icons (eye = scan, pencil = write, scissors = cut, waves =
 * pre-writing strokes). */
const CATEGORY_ICON: Record<Category, LucideIcon> = {
  perception: Eye,
  handwriting: PenLine,
  'fine-motor': Scissors,
  'pre-writing': Waves,
};

export default function GoalPage() {
  const { goalSlug } = useParams<{ goalSlug: string }>();
  const copy = goalSlug && goalSlug in GOAL_COPY ? GOAL_COPY[goalSlug as keyof typeof GOAL_COPY] : undefined;

  const templates = useMemo(
    () => (copy ? TEMPLATES.filter((t) => t.goals.includes(copy.slug)) : []),
    [copy]
  );

  usePageMeta(copy?.heading, copy?.metaDescription);

  if (!copy) return <NotFound />;

  const category = categoryForGoal(copy.slug);
  const cat = CATEGORY_STYLES[category];
  const CatIcon = CATEGORY_ICON[category];
  // The age range this goal actually covers, from its real templates.
  const ages = Array.from(new Set(templates.map((t) => t.ageBand)));
  const [leadPara, ...restParas] = copy.intro;

  // FAQPage + Breadcrumb structured data — prerendered into the static HTML so
  // search engines can surface the Q&A and the site hierarchy.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: copy.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Therapistools', item: `${APP_URL}/` },
          { '@type': 'ListItem', position: 2, name: copy.heading, item: `${APP_URL}/goals/${copy.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader
        right={
          <Link to="/" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap">
            <ArrowLeft className="w-4 h-4" />
            <span className="sm:hidden">Gallery</span>
            <span className="hidden sm:inline">All worksheets</span>
          </Link>
        }
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Category-tinted header band (DESIGN_STRATEGY A3): the goal's skill
            family at a glance — icon, colour, real age range — with the lead
            paragraph. The rest of the intro stays below for depth (and SEO). */}
        <article>
          <div
            className="relative rounded-3xl border px-5 sm:px-8 pt-8 pb-6 shadow-paper"
            style={{ backgroundColor: cat.tint, borderColor: `${cat.color}33` }}
          >
            <span aria-hidden className="washi-tape" style={{ '--tape': `${cat.color}4D` } as React.CSSProperties} />
            <div className="flex items-start gap-4">
              <div
                className="hidden sm:flex w-12 h-12 shrink-0 rounded-2xl items-center justify-center bg-card border shadow-sm"
                style={{ borderColor: `${cat.color}33`, color: cat.textColor }}
              >
                <CatIcon className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cat.textColor }}>{cat.label}</p>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground leading-tight mt-0.5">{copy.heading}</h1>
                <p className="text-foreground/80 leading-relaxed mt-3 max-w-3xl">{leadPara}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-card border border-border px-3 py-1 text-xs font-bold text-foreground shadow-sm">
                    {templates.length} free {templates.length === 1 ? 'worksheet' : 'worksheets'}
                  </span>
                  {ages.map((a) => (
                    <span key={a} className="rounded-full px-3 py-1 text-xs font-bold shadow-sm" style={{ backgroundColor: 'hsl(var(--card))', color: cat.textColor, border: `1px solid ${cat.color}33` }}>
                      {ageBandLabel[a]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {restParas.length > 0 && (
            <div className="mt-5 space-y-3 max-w-3xl">
              {restParas.map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </article>

        <section aria-label="Worksheets for this goal">
          <SectionHeading>Printable worksheets</SectionHeading>
          {templates.length === 0 ? (
            <p className="text-muted-foreground">No worksheets yet for this goal.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </section>

        <section aria-label="Frequently asked questions">
          <SectionHeading>Frequently asked questions</SectionHeading>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl">
            {copy.faq.map((f, i) => (
              <div key={i} className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-paper">
                <h3 className="font-display font-semibold text-foreground pr-2">{f.q}</h3>
                <div className="dotted-divider my-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {guidesForGoal(copy.slug).length > 0 && (
          <section aria-label="Related guides">
            <SectionHeading>Read more</SectionHeading>
            <ul className="grid sm:grid-cols-2 gap-3 max-w-4xl">
              {guidesForGoal(copy.slug).map((g) => (
                <li key={g.slug}>
                  <Link
                    to={`/guides/${g.slug}`}
                    className="group block h-full rounded-2xl border border-border bg-card p-4 shadow-paper hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold">Guide</span>
                    <p className="font-display font-bold text-foreground mt-2 leading-snug group-hover:text-primary transition-colors">{g.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
