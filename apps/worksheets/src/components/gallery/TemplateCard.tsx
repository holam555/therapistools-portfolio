import { useMemo, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import WorksheetPreview from '@/components/WorksheetPreview';
import { Template, templateConfig, ageBandLabel } from '@/data/templates';
import { generateWorksheetSeeded, hashSeed } from '@/lib/seededGenerate';
import { styleForTemplate } from '@/lib/categoryColors';

export default function TemplateCard({ template, to }: { template: Template; to?: string }) {
  // Generate the preview once, with a stable seed, so the card never flickers
  // or re-randomizes on re-render. Reuses the real rendering engine.
  const { config, data } = useMemo(() => {
    const config = templateConfig(template);
    const data = generateWorksheetSeeded(config, hashSeed(template.id));
    return { config, data };
  }, [template]);

  const cat = styleForTemplate(template);
  // Deterministic tilt per card (−1.5°…+1.5°), so the wall of cards looks
  // hand-pinned, not machine-gridded — but stable across renders.
  const rot = ((hashSeed(template.id) % 31) - 15) / 10;

  return (
    // A real <a href> (not a button+navigate): crawlers discover the template
    // pages from the homepage, and open-in-new-tab works.
    <Link
      to={to ?? `/edit/${template.id}`}
      className="taped-card group block text-left focus:outline-none"
      style={{ '--rot': `${rot}deg` } as CSSProperties}
      aria-label={`${template.title}, ${ageBandLabel[template.ageBand]}`}
    >
      <div className="relative rounded-2xl border border-border bg-card shadow-paper overflow-hidden group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-primary transition-shadow">
        {/* Washi tape across the top-right corner (category-tinted, translucent). */}
        <div
          className="pointer-events-none absolute -top-1.5 -right-4 z-10 h-5 w-16 rotate-[38deg] rounded-[2px]"
          style={{
            backgroundColor: `${cat.color}55`,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
          }}
        />
        <div className="relative bg-muted/30 overflow-hidden">
          <WorksheetPreview config={config} data={data} variant="thumb" sheetTitle={template.title} />
          {/* Age sticker, category-tinted. */}
          <span
            className="absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: cat.tint, color: cat.textColor, backdropFilter: 'blur(2px)' }}
          >
            {ageBandLabel[template.ageBand]}
          </span>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5">
            <span className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-bold shadow-md">
              Open &amp; customize →
            </span>
          </div>
        </div>
        <div className="p-3.5">
          <h3 className="font-display font-bold text-sm text-foreground leading-snug">{template.title}</h3>
          <p className="text-[11px] font-semibold mt-1" style={{ color: cat.textColor }}>{template.skillTag}</p>
        </div>
      </div>
    </Link>
  );
}
