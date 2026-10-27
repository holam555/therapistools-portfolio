import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import SiteHeader from '@/components/SiteHeader';
import WorksheetPreview from '@/components/WorksheetPreview';
import EditorToolbar from '@/components/editor/EditorToolbar';
import CustomizeControls from '@/components/editor/CustomizeControls';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePrintCount } from '@/hooks/use-print-count';
import { WorksheetConfig, WorksheetData, Difficulty, WorksheetMode } from '@/lib/shapes';
import { generateWorksheetSeeded } from '@/lib/seededGenerate';
import { getTemplate, templateConfig } from '@/data/templates';
import { defaultConfig, ageBandConfig } from '@/lib/defaultConfig';
import { agePresetForMode } from '@/lib/grading';
import {
  loadTemplateConfig, saveTemplateConfig, clearTemplateConfig,
  addHistory, countPrints, diffConfig, encodeConfig, decodeConfig,
} from '@/lib/persistence';
import { useProfiles } from '@/hooks/use-profiles';
import { usePageMeta } from '@/hooks/use-page-meta';
import { ageBandLabel } from '@/data/templates';
import { styleForTemplate } from '@/lib/categoryColors';

const randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

// Modes whose difficulty is meaningful — the progression nudge only applies here
// (handwriting/pattern/pixelArt/visualScanning don't use the difficulty field).
const DIFFICULTY_MODES: WorksheetMode[] = ['find', 'count', 'copy', 'sequence', 'oddOneOut', 'mirror', 'figureGround', 'closure', 'maze', 'connectDots', 'tracingPaths', 'scissorSkills'];

/** The next harder difficulty allowed for a child of this age, or null. */
function harderDifficulty(difficulty: Difficulty, childAge: number | null): Difficulty | null {
  const order: Difficulty[] = ['easy', 'medium', 'hard'];
  const next = order[order.indexOf(difficulty) + 1];
  if (!next) return null;
  if (childAge !== null) {
    if (childAge <= 3) return null;            // easy only
    if (childAge <= 5 && next === 'hard') return null; // easy/medium only
  }
  return next;
}

// Fields that only affect presentation — the renderer reads them from config
// directly, so changing them must NOT re-roll the puzzle. A parent who found a
// worksheet they like should keep it while typing the child's name or toggling
// the answer key.
const COSMETIC_FIELDS: (keyof WorksheetConfig)[] = [
  // challenge itself is UI provenance — its *effects* (difficulty, presets)
  // are applied eagerly to other fields, which do trigger regeneration.
  'challenge',
  'childAge', 'customInstruction', 'borderStyle', 'headerFontSize', 'headerBold',
  'instructionFontSize', 'instructionBold', 'nameDateFontSize', 'useColor',
  'showAnswerKey', 'showReward', 'cornerDoodles', 'showGridLines', 'mazeShowSolution', 'pixelArtBW',
  'handwritingShowColoredLines', 'handwritingLineColor', 'handwritingHighlightColor',
  'handwritingShowHighlight', 'handwritingShowStartEnd', 'visualScanFontStyle',
  'visualScanCharSize', 'wordBoxDisplayMode',
];

function generativeKey(config: WorksheetConfig): string {
  const clone: Record<string, unknown> = { ...config };
  for (const f of COSMETIC_FIELDS) delete clone[f];
  // childName feeds generation only in the handwriting family (trace-name
  // letters, handwriting fallback text); elsewhere it's header-only.
  if (config.mode !== 'traceName' && config.mode !== 'handwriting') delete clone.childName;
  return JSON.stringify(clone);
}

export default function Editor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { increment } = usePrintCount();
  const { activeProfile, effectiveProfileId } = useProfiles();

  const template = templateId ? getTemplate(templateId) : undefined;

  // Canonical, profile-independent base for diffing/encoding (history + shareable
  // links), so a stored/shared worksheet reproduces the same for anyone.
  const shareBase = useMemo(() => (template ? templateConfig(template) : defaultConfig), [template]);

  // A shared worksheet arrives as ?c=<encoded>. It reproduces exactly and beats
  // both the child profile and any saved customization. Read once per template.
  const initialShare = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const c = new URLSearchParams(window.location.search).get('c');
    return c ? decodeConfig(c) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Profile-aware defaults for this template (no saved overrides yet): the
  // active child's age drives difficulty AND the mode's grading preset (grid
  // size, rows, …), and their first interest sets the emoji theme where the
  // template didn't fix one. Names are never stored, so no name auto-fills.
  const profileBase = useMemo<WorksheetConfig>(() => {
    if (!template) return defaultConfig;
    let base = templateConfig(template);
    if (activeProfile) {
      base = {
        ...base,
        ...ageBandConfig(activeProfile.ageBand),
        ...agePresetForMode(template.mode, activeProfile.ageBand),
      };
      if (activeProfile.interests.length && !('emojiTheme' in template.overrides)) {
        base = { ...base, emojiTheme: activeProfile.interests[0] };
      }
    }
    return base;
  }, [template, activeProfile]);

  const initialConfig = useMemo<WorksheetConfig>(() => {
    if (!template) return defaultConfig;
    // A shared link wins over profile + saved config, so it reproduces exactly.
    if (initialShare) return { ...shareBase, ...initialShare.diff, mode: template.mode };
    // Otherwise this child's saved customization of this template wins over defaults.
    const saved = templateId ? loadTemplateConfig(effectiveProfileId, templateId) : null;
    return saved ? { ...profileBase, ...saved, mode: template.mode } : profileBase;
  }, [template, templateId, profileBase, effectiveProfileId, initialShare, shareBase]);

  usePageMeta(
    template ? `${template.title}: Free Printable Worksheet (${ageBandLabel[template.ageBand]})` : undefined,
    template ? `Free printable ${template.clinicalName.toLowerCase()} worksheet for kids (${ageBandLabel[template.ageBand].toLowerCase()}). Customize difficulty, shapes and theme, then print. No signup.` : undefined
  );

  const [config, setConfig] = useState<WorksheetConfig>(initialConfig);
  const [seed, setSeed] = useState<number>(() => initialShare?.seed ?? randomSeed());
  const [data, setData] = useState<WorksheetData>(() => generateWorksheetSeeded(initialConfig, seed));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [batchSeeds, setBatchSeeds] = useState<number[] | null>(null);
  const [chipDismissed, setChipDismissed] = useState(false);
  const [printTick, setPrintTick] = useState(0);

  // Reset when the template or active child changes: fresh config, and a seed
  // from the shared link if present (so it reproduces) else a new random one.
  useEffect(() => {
    setConfig(initialConfig);
    setSeed(initialShare?.seed ?? randomSeed());
    setChipDismissed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig]);

  // Keep the URL in sync (debounced) with the exact current worksheet, so the
  // address bar / Share button always points at this precise sheet. Uses
  // replaceState (no history spam, no router churn).
  useEffect(() => {
    if (typeof window === 'undefined' || !templateId) return;
    const t = setTimeout(() => {
      const encoded = encodeConfig(diffConfig(config, shareBase), seed);
      window.history.replaceState(null, '', `${window.location.pathname}?c=${encoded}`);
    }, 400);
    return () => clearTimeout(t);
  }, [config, seed, shareBase, templateId]);

  // Regenerate the visible puzzle when a generative setting OR the seed changes;
  // cosmetic fields re-render via the config prop without re-rolling the puzzle.
  const genKey = generativeKey(config);
  useEffect(() => {
    setData(generateWorksheetSeeded(config, seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genKey, seed]);

  // Persist this child's customization of this template (debounced).
  useEffect(() => {
    if (!templateId) return;
    const t = setTimeout(() => saveTemplateConfig(effectiveProfileId, templateId, config), 400);
    return () => clearTimeout(t);
  }, [config, templateId, effectiveProfileId]);

  // One-time pulse on Print after the first Regenerate: "you rerolled the
  // puzzle — this is how it gets onto paper". Never repeats in a session.
  const [printPulse, setPrintPulse] = useState(false);
  const hasRegenerated = useRef(false);

  const handleRegenerate = useCallback(() => {
    setSeed(randomSeed());
    if (!hasRegenerated.current) {
      hasRegenerated.current = true;
      setPrintPulse(true);
    }
  }, []);

  useEffect(() => {
    if (!printPulse) return;
    const t = setTimeout(() => setPrintPulse(false), 2400);
    return () => clearTimeout(t);
  }, [printPulse]);

  const handleReset = useCallback(() => {
    if (!template || !templateId) return;
    clearTemplateConfig(effectiveProfileId, templateId);
    setConfig(profileBase);
    setSeed(randomSeed());
    toast('Reset to defaults');
  }, [template, templateId, effectiveProfileId, profileBase]);

  // Record a print in this child's history (enables "recently printed" + the
  // progression nudge + exact reprints).
  const recordPrint = useCallback((s: number) => {
    if (!templateId) return;
    addHistory({
      profileId: effectiveProfileId,
      templateId,
      diff: diffConfig(config, shareBase),
      seed: s,
      printedAt: new Date().toISOString(),
    });
    setPrintTick((t) => t + 1);
  }, [templateId, effectiveProfileId, config, shareBase]);

  const handlePrint = useCallback(() => {
    window.print();
    recordPrint(seed);
    const n = increment();
    if (n >= 3) {
      // Gentle, non-blocking nudge — never gates printing.
      toast('Enjoying these worksheets? ☕', {
        description: 'Everything stays free. If they help, you can buy me a coffee.',
      });
    }
  }, [increment, recordPrint, seed]);

  // Print 5 varied worksheets (same settings, different puzzles) in one dialog.
  const handlePrintBatch = useCallback(() => {
    setBatchSeeds(Array.from({ length: 5 }, () => randomSeed()));
  }, []);

  // Copy a link that reproduces this exact worksheet (settings + seed).
  const handleShare = useCallback(async () => {
    const encoded = encodeConfig(diffConfig(config, shareBase), seed);
    const url = `${window.location.origin}${window.location.pathname}?c=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied', { description: 'Anyone who opens it gets this exact worksheet.' });
    } catch {
      toast('Copy this link', { description: url });
    }
  }, [config, shareBase, seed]);

  // Once the 5 pages have rendered, fire the print dialog, then clear them.
  useEffect(() => {
    if (!batchSeeds) return;
    const clear = () => setBatchSeeds(null);
    window.addEventListener('afterprint', clear, { once: true });
    const t = setTimeout(() => {
      window.print();
      recordPrint(batchSeeds[0]);
      const n = increment();
      if (n >= 3) toast('Enjoying these worksheets? ☕', { description: 'Everything stays free. If they help, you can buy me a coffee.' });
      // Fallback for browsers that don't fire afterprint.
      setTimeout(clear, 1000);
    }, 60);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', clear); };
  }, [batchSeeds, recordPrint, increment]);

  // Progression nudge: after 3 prints of this template at the current difficulty,
  // gently suggest the next level (age-capped). Non-blocking.
  const nextDifficulty = useMemo(() => {
    if (!template || !templateId || !activeProfile) return null;
    if (!DIFFICULTY_MODES.includes(config.mode)) return null;
    const harder = harderDifficulty(config.difficulty, config.childAge);
    if (!harder) return null;
    // printTick is a dependency so this recomputes right after a print.
    return countPrints(effectiveProfileId, templateId, config.difficulty) >= 3 ? harder : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, templateId, activeProfile, config.mode, config.difficulty, config.childAge, effectiveProfileId, printTick]);

  if (!template) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">That worksheet template wasn’t found.</p>
        <Button onClick={() => navigate('/')}>Back to gallery</Button>
      </div>
    );
  }

  const cat = styleForTemplate(template);
  const controls = <CustomizeControls config={config} onChange={setConfig} />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader
        right={
          <Link to="/" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Gallery
          </Link>
        }
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="no-print mb-4 flex items-start gap-3">
          <span className="mt-0.5 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0" style={{ backgroundColor: cat.tint, color: cat.textColor }}>
            {cat.label}
          </span>
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground leading-tight">{template.title}</h2>
            <p className="text-xs text-muted-foreground">{template.clinicalName} · {template.skillTag}</p>
          </div>
        </div>

        {/* Sticky action bar — stays reachable while scrolling the sheet. */}
        <div className="no-print sticky top-[58px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-3 bg-background/85 backdrop-blur border-b border-border">
          <EditorToolbar
            onPrint={handlePrint}
            onPrintBatch={handlePrintBatch}
            onRegenerate={handleRegenerate}
            onShare={handleShare}
            onToggleCustomize={() => setCustomizeOpen((o) => !o)}
            customizeOpen={customizeOpen}
            pulsePrint={printPulse}
          />
        </div>

        <div className="no-print mb-4">
          <p className="text-[11px] text-muted-foreground">
            {isMobile
              ? '🖨️ On a phone: open your browser menu → Print (or Share → Print), then choose “Save as PDF”.'
              : '🖨️ Printing works best from a desktop browser. Browse and preview freely on any device.'}
          </p>

          {/* Progression nudge — appears after 3 prints at this level. */}
          {nextDifficulty && !chipDismissed && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm">
              <span className="text-lg">🌱</span>
              <p className="flex-1 text-foreground">
                {activeProfile?.label} has done this a few times. Ready for a {nextDifficulty} challenge?
              </p>
              <Button size="sm" onClick={() => { setConfig((c) => ({ ...c, difficulty: nextDifficulty })); setChipDismissed(true); }} className="font-display">
                Try {nextDifficulty}
              </Button>
              <button onClick={() => setChipDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Preview + (desktop) collapsible right panel */}
        <div className={`flex gap-6 ${customizeOpen && !isMobile ? 'lg:flex-row' : ''} flex-col lg:flex-row`}>
          {/* Hide the single preview while a batch is queued so only the 5-page
              set prints. */}
          <div className={`flex-1 flex justify-center ${batchSeeds ? 'no-print' : ''}`}>
            <div className="worksheet-desk w-full max-w-[600px]">
              <WorksheetPreview config={config} data={data} sheetTitle={template.title} />
            </div>
          </div>

          {/* Desktop: inline collapsible right panel */}
          {!isMobile && customizeOpen && (
            <aside className="no-print w-full lg:w-[360px] shrink-0">
              <div className="bg-card rounded-xl border border-border p-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-base font-bold">Customize</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={handleReset} className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2">
                      Reset
                    </button>
                    <button onClick={() => setCustomizeOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {controls}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Print-only: 5 varied worksheets, one per page. Rendered only while a
          batch is queued; screen-hidden via .batch-print. */}
      {batchSeeds && (
        <div className="batch-print" aria-hidden>
          {batchSeeds.map((s, i) => (
            <WorksheetPreview key={s} htmlId={`batch-${i}`} config={config} data={generateWorksheetSeeded(config, s)} sheetTitle={template.title} />
          ))}
        </div>
      )}

      {/* Mobile: bottom-sheet Customize */}
      {isMobile && (
        <Drawer open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <DrawerContent className="no-print max-h-[85vh]">
            <div className="px-4 pb-8 pt-2 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold">Customize</h3>
                <button onClick={handleReset} className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Reset
                </button>
              </div>
              {controls}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
