import { CSSProperties, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/use-page-meta';
import { GUIDES } from '@/data/guides';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SectionHeading from '@/components/SectionHeading';
import AboutStrip from '@/components/gallery/AboutStrip';
import TemplateCard from '@/components/gallery/TemplateCard';
import WorksheetPreview from '@/components/WorksheetPreview';
import { TEMPLATES, GOALS, LANGUAGES, Goal, Language, templateConfig, getTemplate } from '@/data/templates';
import { AGE_BANDS, AgeBand } from '@/lib/defaultConfig';
import { WorksheetMode } from '@/lib/shapes';
import { generateWorksheetSeeded, hashSeed } from '@/lib/seededGenerate';
import { useProfiles } from '@/hooks/use-profiles';
import { loadHistory, encodeConfig } from '@/lib/persistence';

/** Fanned stack of three real worksheet previews for the hero. */
function HeroFan() {
  const sheets = useMemo(() => {
    return ['find-animals', 'trace-name', 'maze']
      .map((id) => getTemplate(id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ t, config: templateConfig(t), data: generateWorksheetSeeded(templateConfig(t), hashSeed(t.id)) }));
  }, []);
  const rot = [-7, 0, 7];
  const tape = ['rgba(59,130,246,0.30)', 'rgba(139,92,246,0.30)', 'rgba(34,197,94,0.30)'];
  return (
    <div className="relative h-[340px]" aria-hidden="true">
      {/* Soft shadow pooling under the fan — sheets resting on the desk. */}
      <div className="absolute left-1/2 bottom-4 -translate-x-1/2 w-[340px] h-10 rounded-[50%] bg-foreground/10 blur-xl" />
      {sheets.map((s, i) => (
        <div
          key={s.t.id}
          className="absolute top-1/2 left-1/2 w-[210px] rounded-lg shadow-paper ring-1 ring-black/5 bg-white transition-transform"
          style={{ transform: `translate(-50%,-50%) translateX(${(i - 1) * 96}px) rotate(${rot[i]}deg)`, zIndex: i === 1 ? 2 : 1 }}
        >
          <span className="washi-tape !w-14 !h-4" style={{ '--tape': tape[i] } as CSSProperties} />
          <WorksheetPreview config={s.config} data={s.data} variant="thumb" sheetTitle={s.t.title} />
        </div>
      ))}
    </div>
  );
}

type AgeFilter = AgeBand | 'all';
type GoalFilter = Goal | 'all';
type LangFilter = Language | 'all';
type ModeFilter = WorksheetMode | 'all';

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border-2 shadow-sm transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow'
          : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function Gallery() {
  usePageMeta();
  const { effectiveProfileId, activeProfile } = useProfiles();
  const [age, setAge] = useState<AgeFilter>('all');
  const [goal, setGoal] = useState<GoalFilter>('all');
  const [lang, setLang] = useState<LangFilter>('all');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [showClinical, setShowClinical] = useState(false);

  // Distinct clinical types for the professional "All worksheet types" filter.
  const clinicalTypes = useMemo(() => {
    const seen = new Map<WorksheetMode, string>();
    for (const t of TEMPLATES) if (!seen.has(t.mode)) seen.set(t.mode, t.clinicalName);
    return Array.from(seen, ([mode, clinicalName]) => ({ mode, clinicalName }));
  }, []);

  const filtered = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (age === 'all' || t.ageBand === age) &&
          (goal === 'all' || t.goals.includes(goal)) &&
          (lang === 'all' || t.language === lang) &&
          (mode === 'all' || t.mode === mode)
      ),
    [age, goal, lang, mode]
  );

  const anyFilter = age !== 'all' || goal !== 'all' || lang !== 'all' || mode !== 'all';
  const clearAll = () => { setAge('all'); setGoal('all'); setLang('all'); setMode('all'); };

  // Most-recently-printed worksheets for the active child (distinct templates,
  // up to 4). Each links back to the exact sheet that was printed (diff + seed).
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: { template: typeof TEMPLATES[number]; to: string }[] = [];
    for (const h of loadHistory()) {
      if (h.profileId !== effectiveProfileId || seen.has(h.templateId)) continue;
      seen.add(h.templateId);
      const template = TEMPLATES.find((x) => x.id === h.templateId);
      if (template) out.push({ template, to: `/edit/${template.id}?c=${encodeConfig(h.diff, h.seed)}` });
      if (out.length >= 4) break;
    }
    return out;
  }, [effectiveProfileId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-8 items-center pt-2">
          <div className="text-center lg:text-left">
            {activeProfile && (
              <p className="font-hand text-2xl text-secondary -rotate-2 mb-1">for {activeProfile.label} ✎</p>
            )}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.9rem] font-bold text-foreground leading-[1.1]">
              Print a worksheet made for{' '}
              <span className="relative inline-block text-primary">
                your
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 8 Q 30 2 60 7 T 117 6" stroke="hsl(var(--secondary))" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>{' '}
              kid
            </h1>
            <p className="text-muted-foreground mt-4 text-base sm:text-lg max-w-md mx-auto lg:mx-0">
              Occupational-therapy practice sheets you can tune to the child in front of you:
              handwriting, visual perception, fine motor. Free, no signup.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
              <a href="#gallery" className="rounded-full bg-primary text-primary-foreground font-display font-bold px-6 py-3 shadow-paper hover:-translate-y-0.5 transition-transform">
                Browse worksheets
              </a>
              <button
                type="button"
                onClick={() => document.getElementById('filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="rounded-full bg-card border-2 border-border text-foreground font-display font-bold px-6 py-3 shadow-sm hover:border-primary/50 transition-colors"
              >
                Browse by goal
              </button>
            </div>
          </div>
          <HeroFan />
        </section>

        <AboutStrip />

        {/* Recently printed for the active child */}
        {recent.length > 0 && (
          <section aria-label="Recently printed">
            <SectionHeading>
              {activeProfile ? `${activeProfile.label}'s desk` : 'Recently printed'}
            </SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {recent.map(({ template, to }) => (
                <TemplateCard key={template.id} template={template} to={to} />
              ))}
            </div>
          </section>
        )}

        {/* Browse filters */}
        <div id="filters" className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 space-y-3 scroll-mt-20">
          <FilterRow label="By age">
            <Chip active={age === 'all'} onClick={() => setAge('all')}>All ages</Chip>
            {AGE_BANDS.map((b) => (
              <Chip key={b.value} active={age === b.value} onClick={() => setAge(b.value)}>{b.label}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="By goal">
            <Chip active={goal === 'all'} onClick={() => setGoal('all')}>All goals</Chip>
            {GOALS.map((g) => (
              <Chip key={g.value} active={goal === g.value} onClick={() => setGoal(g.value)}>{g.label}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="By language">
            <Chip active={lang === 'all'} onClick={() => setLang('all')}>All</Chip>
            {LANGUAGES.map((l) => (
              <Chip key={l.value} active={lang === l.value} onClick={() => setLang(l.value)}>{l.label}</Chip>
            ))}
          </FilterRow>

          <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowClinical((s) => !s)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {showClinical ? 'Hide' : 'All worksheet types (clinical)'}
            </button>
            {anyFilter && (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-primary hover:underline">
                Clear filters
              </button>
            )}
          </div>

          {showClinical && (
            <FilterRow label="Type">
              <Chip active={mode === 'all'} onClick={() => setMode('all')}>All types</Chip>
              {clinicalTypes.map((c) => (
                <Chip key={c.mode} active={mode === c.mode} onClick={() => setMode(c.mode)}>{c.clinicalName}</Chip>
              ))}
            </FilterRow>
          )}
        </div>

        {/* Gallery grid */}
        <section id="gallery" aria-label="All worksheets" className="scroll-mt-20">
          <SectionHeading>
            {anyFilter ? `${filtered.length} matching ${filtered.length === 1 ? 'worksheet' : 'worksheets'}` : `All ${TEMPLATES.length} worksheets`}
          </SectionHeading>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No worksheets match those filters yet. Try clearing some.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </section>

        {/* Parent guides — surfaces the content + builds trust ("we know the
            why behind the practice"), and gives the guides a home on the
            highest-traffic page. */}
        {GUIDES.length > 0 && (
          <section aria-label="Guides for parents" className="pt-2">
            <div className="dotted-divider mb-8" aria-hidden="true" />
            <SectionHeading
              sub="Therapist-informed answers to the questions parents actually ask, with free printables to practise."
              right={<Link to="/guides" className="text-sm font-semibold text-primary hover:underline whitespace-nowrap">All guides →</Link>}
            >
              Guides for parents
            </SectionHeading>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GUIDES.slice(0, 3).map((g) => (
                <li key={g.slug}>
                  <Link
                    to={`/guides/${g.slug}`}
                    className="group block h-full rounded-2xl border border-border bg-card p-4 shadow-paper hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold">Guide</span>
                    <h3 className="font-display font-bold text-foreground mt-2 leading-snug group-hover:text-primary transition-colors">{g.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5">{g.metaDescription}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
