import {
  WorksheetConfig, WorksheetMode, GridSize, ChallengeLevel, BorderStyle, HeaderFontSize, ShapeName,
  ALL_SHAPES, SHAPE_COLORS, OddOneOutType, HandwritingLineColor, HandwritingLayout, InstructionFontSize,
  MazeSize, MazeShape, ConnectDotsShape, TracingStrokeType, TracingThickness, ScissorLineType,
  VisualScanDensity, VisualScanCharSize, PixelArtTheme, EMOJI_THEMES, EMOJI_ELIGIBLE_MODES, EmojiTheme, getShapeSVG,
  CORNER_DOODLE_MODES,
} from '@/lib/shapes';
import { AGE_BANDS, AgeBand, ageBandConfig, childAgeToBand } from '@/lib/defaultConfig';
import { applyGrading } from '@/lib/grading';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bold } from 'lucide-react';

interface Props {
  config: WorksheetConfig;
  onChange: (config: WorksheetConfig) => void;
}

const PATTERN_MAX_EXERCISES: Record<number, number> = { 2: 6, 3: 4, 4: 3, 5: 2 };
const EXERCISE_COUNTS = [3, 5, 8, 10];
const GRID_SIZES: GridSize[] = [2, 3, 4, 5];
// Parent-facing nudge relative to the age default. Replaces the old abstract
// Easy/Medium/Hard override, which competed with the Age buttons and left
// parents unsure which control to trust.
const CHALLENGES: { value: ChallengeLevel; label: string }[] = [
  { value: 'easier', label: 'Easier' },
  { value: 'standard', label: 'Just right' },
  { value: 'harder', label: 'Harder' },
];
const ODD_ONE_OUT_TYPES: { value: OddOneOutType; label: string }[] = [
  { value: 'shapes', label: 'Shapes' },
  { value: 'letters', label: 'Letters' },
  { value: 'numbers', label: 'Numbers' },
];
const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'rounded', label: 'Rounded' },
];

// Modes whose content is shapes/emoji. These are also exactly the modes whose
// renderer reads `useColor` (via getFill/getStroke), so the Colour switch maps to them.
const SHAPE_MODES: WorksheetMode[] = ['find', 'pattern', 'count', 'copy', 'sequence', 'oddOneOut', 'mirror', 'figureGround', 'closure'];
// Modes using the standard "exercises per sheet" slider. (find excluded: it generates
// a single grid and ignores exerciseCount.)
const EXERCISE_SLIDER_MODES: WorksheetMode[] = ['copy', 'sequence', 'oddOneOut', 'mirror', 'closure'];
// Modes using the generic grid-size selector (count has its own). (sequence/oddOneOut
// excluded: their generators ignore gridSize.)
const GRID_MODES: WorksheetMode[] = ['find', 'copy', 'mirror'];
// Modes whose renderer actually draws an answer key. (copy + the motor/path modes
// don't consume showAnswerKey; visualScanning does.)
const ANSWER_KEY_MODES: WorksheetMode[] = ['find', 'pattern', 'count', 'sequence', 'oddOneOut', 'mirror', 'figureGround', 'closure', 'visualScanning'];
// Modes whose renderer draws inter-cell grid lines from `showGridLines`.
const GRIDLINE_MODES: WorksheetMode[] = ['find', 'count', 'copy', 'pattern'];

function handwritingLayoutToConfig(layout: HandwritingLayout): Partial<WorksheetConfig> {
  switch (layout) {
    case 'triline': return { handwritingSubMode: 'sentence', handwritingPaperStyle: 'triline', handwritingLineMode: '3-line' };
    case 'fourline': return { handwritingSubMode: 'sentence', handwritingPaperStyle: 'triline', handwritingLineMode: '4-line' };
    case 'wordbox': return { handwritingSubMode: 'wordBoxes', wordBoxDisplayMode: 'boxOnly', handwritingLineMode: '3-line' };
    case 'gridbox': return { handwritingSubMode: 'sentence', handwritingPaperStyle: 'gridbox', handwritingLineMode: '3-line' };
    case 'triline-wordbox': return { handwritingSubMode: 'wordBoxes', wordBoxDisplayMode: 'both', handwritingLineMode: '3-line' };
    case 'fourline-wordbox': return { handwritingSubMode: 'wordBoxes', wordBoxDisplayMode: 'both', handwritingLineMode: '4-line' };
  }
}

function ShapeIcon({ shape, selected, onClick }: { shape: ShapeName; selected: boolean; onClick: () => void }) {
  const size = 28;
  const svg = getShapeSVG(shape, size / 2, size / 2, size, selected ? SHAPE_COLORS[shape] : 'none', selected ? SHAPE_COLORS[shape] : '#94A3B8', selected ? 1.5 : 2);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${selected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background hover:border-muted-foreground/40'}`}
      title={shape}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} dangerouslySetInnerHTML={{ __html: svg }} />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="font-display font-semibold text-sm">{children}</Label>;
}

export default function CustomizeControls({ config, onChange }: Props) {
  const update = (partial: Partial<WorksheetConfig>) => {
    const merged = { ...config, ...partial };
    if (merged.mode === 'pattern') {
      const max = PATTERN_MAX_EXERCISES[merged.gridSize] ?? 6;
      if (merged.exerciseCount > max) merged.exerciseCount = max;
    }
    onChange(merged);
  };

  const mode = config.mode;
  const isHandwritingFamily = mode === 'handwriting' || mode === 'traceName';
  const exerciseIndex = EXERCISE_COUNTS.indexOf(config.exerciseCount);

  const toggleShape = (shape: ShapeName) => {
    const current = config.selectedShapes;
    if (current.includes(shape)) {
      if (current.length <= 2) return;
      update({ selectedShapes: current.filter((s) => s !== shape) });
    } else {
      update({ selectedShapes: [...current, shape] });
    }
  };

  const showShapePicker = SHAPE_MODES.includes(mode) && !(mode === 'oddOneOut' && config.oddOneOutType !== 'shapes');
  const emojiEligible = EMOJI_ELIGIBLE_MODES.includes(mode);

  // ---- shared shape / emoji picker (core) ----
  const shapePicker = showShapePicker && (
    <div className="space-y-2">
      {emojiEligible && (
        <div className="flex items-center gap-1.5">
          <Button variant={!config.useEmoji ? 'default' : 'outline'} size="sm" onClick={() => update({ useEmoji: false })} className="font-display text-xs flex-1">🔷 Shapes</Button>
          <Button variant={config.useEmoji ? 'default' : 'outline'} size="sm" onClick={() => update({ useEmoji: true })} className="font-display text-xs flex-1">😀 Emoji</Button>
        </div>
      )}
      {emojiEligible && config.useEmoji ? (
        <div className="space-y-1.5">
          <FieldLabel>Theme</FieldLabel>
          <div className="grid grid-cols-1 gap-1.5">
            {(Object.entries(EMOJI_THEMES) as [EmojiTheme, typeof EMOJI_THEMES[EmojiTheme]][]).map(([key, theme]) => (
              <button
                key={key}
                type="button"
                onClick={() => update({ emojiTheme: key })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left ${config.emojiTheme === key ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-muted-foreground/40'}`}
              >
                <span className="text-lg">{theme.icon}</span>
                <span className="font-display font-semibold text-sm">{theme.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{theme.emojis.slice(0, 5).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <FieldLabel>Shapes ({config.selectedShapes.length} selected)</FieldLabel>
          <div className="grid grid-cols-6 gap-1.5">
            {ALL_SHAPES.map((shape) => (
              <ShapeIcon key={shape} shape={shape} selected={config.selectedShapes.includes(shape)} onClick={() => toggleShape(shape)} />
            ))}
          </div>
          {config.selectedShapes.length <= 2 && <p className="text-[10px] text-destructive">Minimum 2 shapes required</p>}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ============ CORE: Age (most important — drives difficulty defaults) ============ */}
      <div className="space-y-2">
        <FieldLabel>Age</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {AGE_BANDS.map((b) => {
            const active = childAgeToBand(config.childAge) === b.value;
            return (
              <Button
                key={b.value}
                variant={active ? 'default' : 'outline'}
                size="sm"
                // Age re-grades the whole task (scope preset + difficulty),
                // keeping the Challenge nudge — unless the new band clamps it
                // (3–4 has nothing below level 0, 7–8 nothing above level 2),
                // in which case snap back to "Just right" so the UI stays honest.
                onClick={() => {
                  const clamped =
                    (b.value === '3-4' && config.challenge === 'easier') ||
                    (b.value === '7-8' && config.challenge === 'harder');
                  const ch = clamped ? 'standard' : config.challenge;
                  update({ challenge: ch, ...ageBandConfig(b.value), ...applyGrading(mode, b.value, ch) });
                }}
                className="font-display text-xs"
              >
                {b.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ============ CORE: Challenge (relative to age) ============ */}
      <div className="space-y-2">
        <FieldLabel>Challenge</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {CHALLENGES.map((ch) => {
            const band = childAgeToBand(config.childAge);
            // The grade ladder has 3 levels; at the edge bands one direction
            // has nowhere to go. Disable that button rather than let it
            // silently do nothing.
            const clamped =
              (band === '3-4' && ch.value === 'easier') ||
              (band === '7-8' && ch.value === 'harder');
            return (
              <Button
                key={ch.value}
                variant={config.challenge === ch.value ? 'default' : 'outline'}
                size="sm"
                disabled={clamped}
                title={clamped ? (ch.value === 'easier' ? 'Ages 3-4 already get the gentlest version' : 'Ages 7-8 already get the toughest version') : undefined}
                onClick={() => update({ challenge: ch.value, ...applyGrading(mode, band, ch.value) })}
                className="font-display text-xs"
              >
                {ch.label}
              </Button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">Tuned to the age. Nudge if it feels too easy or too hard.</p>
      </div>

      {/* ============ CORE: mode essentials ============ */}

      {/* Trace name */}
      {mode === 'traceName' && (
        <div className="space-y-2">
          <FieldLabel>Child's name</FieldLabel>
          <Input value={config.childName} onChange={(e) => update({ childName: e.target.value })} placeholder="e.g. Emma" />
          <p className="text-[11px] text-muted-foreground">Used only for this printout. Never saved, and left out of share links.</p>
        </div>
      )}

      {/* Handwriting */}
      {mode === 'handwriting' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Layout</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'triline' as HandwritingLayout, label: 'Tri-line', icon: '📝' },
                { value: 'fourline' as HandwritingLayout, label: '4-line (HK)', icon: '📝' },
                { value: 'wordbox' as HandwritingLayout, label: 'Word Box', icon: '🔤' },
                { value: 'gridbox' as HandwritingLayout, label: 'Grid Box', icon: '⬜' },
                { value: 'triline-wordbox' as HandwritingLayout, label: 'Tri-line + Word', icon: '📋' },
                { value: 'fourline-wordbox' as HandwritingLayout, label: '4-line + Word', icon: '📋' },
              ]).map((l) => (
                <Button
                  key={l.value}
                  variant={config.handwritingLayout === l.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ handwritingLayout: l.value, ...handwritingLayoutToConfig(l.value) })}
                  className="font-display text-xs h-auto py-2 flex flex-col gap-0.5"
                >
                  <span>{l.icon}</span><span>{l.label}</span>
                </Button>
              ))}
            </div>
          </div>
          {(config.handwritingLayout === 'triline' || config.handwritingLayout === 'fourline' || config.handwritingLayout === 'gridbox') && (
            <div className="space-y-2">
              <FieldLabel>Text to practise</FieldLabel>
              <Input value={config.handwritingText} onChange={(e) => update({ handwritingText: e.target.value })} placeholder="e.g. Hello World" />
            </div>
          )}
          {(config.handwritingLayout === 'wordbox' || config.handwritingLayout === 'triline-wordbox' || config.handwritingLayout === 'fourline-wordbox') && (
            <div className="space-y-2">
              <FieldLabel>Words (one per line, max 8)</FieldLabel>
              <Textarea value={config.handwritingWords} onChange={(e) => update({ handwritingWords: e.target.value })} placeholder={'cat\ndog\nbird\nfish'} rows={4} className="text-sm font-mono" />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel>Font Size</FieldLabel>
              <span className="text-xs font-bold text-primary">{config.handwritingFontSizeMm}mm</span>
            </div>
            <Slider value={[config.handwritingFontSizeMm]} min={8} max={35} step={1} onValueChange={([v]) => update({ handwritingFontSizeMm: v })} />
          </div>
          {config.handwritingLayout !== 'wordbox' && config.handwritingLayout !== 'triline-wordbox' && config.handwritingLayout !== 'fourline-wordbox' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Practice Rows</FieldLabel>
                <span className="text-xs font-bold text-primary">{config.handwritingRows}</span>
              </div>
              <Slider value={[config.handwritingRows]} min={2} max={8} step={1} onValueChange={([v]) => update({ handwritingRows: v })} />
            </div>
          )}
        </div>
      )}

      {/* Maze */}
      {mode === 'maze' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Maze Size</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {([{ value: 'small', label: '8×8' }, { value: 'medium', label: '12×12' }, { value: 'large', label: '16×16' }] as { value: MazeSize; label: string }[]).map((s) => (
                <Button key={s.value} variant={config.mazeSize === s.value ? 'default' : 'outline'} size="sm" onClick={() => update({ mazeSize: s.value })} className="font-display text-xs">{s.label}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel>Shape</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {([{ value: 'square', label: '⬜ Square' }, { value: 'rectangle', label: '▬ Rect' }, { value: 'circle', label: '⚪ Circle' }] as { value: MazeShape; label: string }[]).map((s) => (
                <Button key={s.value} variant={config.mazeShape === s.value ? 'default' : 'outline'} size="sm" onClick={() => update({ mazeShape: s.value })} className="font-display text-xs">{s.label}</Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connect the dots */}
      {mode === 'connectDots' && (
        <div className="space-y-2">
          <FieldLabel>Picture</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'star', label: '⭐ Star' }, { value: 'heart', label: '❤️ Heart' }, { value: 'house', label: '🏠 House' },
              { value: 'fish', label: '🐟 Fish' }, { value: 'sun', label: '☀️ Sun' }, { value: 'butterfly', label: '🦋 Butterfly' },
              { value: 'rocket', label: '🚀 Rocket' }, { value: 'tree', label: '🌲 Tree' }, { value: 'catFace', label: '🐱 Cat' }, { value: 'flower', label: '🌸 Flower' },
            ] as { value: ConnectDotsShape; label: string }[]).map((s) => (
              <button
                key={s.value}
                onClick={() => update({ connectDotsShape: s.value })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-left transition-all text-xs font-medium ${config.connectDotsShape === s.value ? 'border-primary bg-primary/10 text-foreground shadow-sm' : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'}`}
              >
                <span className="font-display">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tracing paths */}
      {mode === 'tracingPaths' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Stroke Type</FieldLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(['mixed', 'vertical', 'horizontal', 'diagonal', 'curved', 'waves', 'zigzag', 'spiral', 'loops'] as TracingStrokeType[]).map((s) => (
                <Button key={s} variant={config.tracingStrokeType === s ? 'default' : 'outline'} size="sm" onClick={() => update({ tracingStrokeType: s })} className="font-display text-xs capitalize">{s}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel>Line Thickness</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {(['thick', 'medium', 'thin'] as TracingThickness[]).map((t) => (
                <Button key={t} variant={config.tracingThickness === t ? 'default' : 'outline'} size="sm" onClick={() => update({ tracingThickness: t })} className="font-display text-xs capitalize">{t}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel>Rows</FieldLabel>
              <span className="text-xs font-bold text-primary">{config.tracingRows}</span>
            </div>
            <Slider value={[config.tracingRows]} min={2} max={6} step={1} onValueChange={([v]) => update({ tracingRows: v })} />
          </div>
        </div>
      )}

      {/* Scissor skills */}
      {mode === 'scissorSkills' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Line Type</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(['straight', 'wavy', 'zigzag', 'mixed'] as ScissorLineType[]).map((t) => (
                <Button key={t} variant={config.scissorLineType === t ? 'default' : 'outline'} size="sm" onClick={() => update({ scissorLineType: t })} className="font-display text-xs capitalize">{t}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel>Number of Lines</FieldLabel>
              <span className="text-xs font-bold text-primary">{config.scissorLineCount}</span>
            </div>
            <Slider value={[config.scissorLineCount]} min={3} max={10} step={1} onValueChange={([v]) => update({ scissorLineCount: v })} />
          </div>
        </div>
      )}

      {/* Visual scanning */}
      {mode === 'visualScanning' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Target Character</FieldLabel>
            <Input value={config.visualScanTarget} onChange={(e) => update({ visualScanTarget: e.target.value.slice(0, 1) })} maxLength={1} className="font-mono text-lg text-center w-16" />
          </div>
          <div className="space-y-2">
            <FieldLabel>Grid Density</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {([{ value: 'small', label: '8×6' }, { value: 'medium', label: '10×8' }, { value: 'large', label: '12×10' }] as { value: VisualScanDensity; label: string }[]).map((d) => (
                <Button key={d.value} variant={config.visualScanDensity === d.value ? 'default' : 'outline'} size="sm" onClick={() => update({ visualScanDensity: d.value })} className="font-display text-xs">{d.label}</Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pixel art */}
      {mode === 'pixelArt' && (
        <div className="space-y-2">
          <FieldLabel>Theme</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'heart', label: '❤️ Heart' }, { value: 'smiley', label: '😊 Smiley' }, { value: 'star', label: '⭐ Star' },
              { value: 'catFace', label: '🐱 Cat' }, { value: 'fish', label: '🐟 Fish' }, { value: 'house', label: '🏠 House' },
              { value: 'sun', label: '☀️ Sun' }, { value: 'flower', label: '🌸 Flower' }, { value: 'rainbow', label: '🌈 Rainbow' }, { value: 'rocket', label: '🚀 Rocket' },
            ] as { value: PixelArtTheme; label: string }[]).map((t) => (
              <button
                key={t.value}
                onClick={() => update({ pixelArtTheme: t.value })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-left transition-all text-xs font-medium ${config.pixelArtTheme === t.value ? 'border-primary bg-primary/10 text-foreground shadow-sm' : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'}`}
              >
                <span className="font-display">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Odd one out — item type (core) */}
      {mode === 'oddOneOut' && (
        <div className="space-y-2">
          <FieldLabel>Item Type</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {ODD_ONE_OUT_TYPES.map((t) => (
              <Button key={t.value} variant={config.oddOneOutType === t.value ? 'default' : 'outline'} size="sm" onClick={() => update({ oddOneOutType: t.value })} className="font-display text-xs">{t.label}</Button>
            ))}
          </div>
          {(config.oddOneOutType === 'letters' || config.oddOneOutType === 'numbers') && (
            <div className="flex items-center gap-3 pt-1">
              <Input value={config.oddOneOutCustomTarget ?? ''} onChange={(e) => update({ oddOneOutCustomTarget: e.target.value.slice(0, 1) })} maxLength={1} className="font-mono text-lg text-center w-14 h-10" placeholder="?" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                {config.oddOneOutCustomTarget ? `"${config.oddOneOutCustomTarget}" is the odd one out in every row` : 'Leave empty for auto targets'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Count — own grid size (core) */}
      {mode === 'count' && (
        <div className="space-y-2">
          <FieldLabel>Grid Size</FieldLabel>
          <div className="grid grid-cols-4 gap-2">
            {GRID_SIZES.map((s) => (
              <Button key={s} variant={config.gridSize === s ? 'default' : 'outline'} size="sm" onClick={() => update({ gridSize: s })} className="font-display text-xs">{s}×{s}</Button>
            ))}
          </div>
        </div>
      )}

      {/* Shapes / emoji (core, shape modes) */}
      {shapePicker}

      {/* Exercises per sheet (core) */}
      {EXERCISE_SLIDER_MODES.includes(mode) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FieldLabel>Exercises per sheet</FieldLabel>
            <span className="text-xs font-bold text-primary">{config.exerciseCount}</span>
          </div>
          <Slider value={[exerciseIndex >= 0 ? exerciseIndex : 1]} min={0} max={3} step={1} onValueChange={([v]) => update({ exerciseCount: EXERCISE_COUNTS[v] })} />
          <div className="flex justify-between text-[10px] text-muted-foreground">{EXERCISE_COUNTS.map((n) => <span key={n}>{n}</span>)}</div>
        </div>
      )}

      {/* Colour (core) — only the shape modes render in colour. */}
      {SHAPE_MODES.includes(mode) && (
        <div className="flex items-center justify-between">
          <FieldLabel>Colour</FieldLabel>
          <Switch checked={config.useColor} onCheckedChange={(v) => update({ useColor: v })} />
        </div>
      )}

      {/* ============ ADVANCED ============ */}
      <Accordion type="single" collapsible className="border-t border-border pt-1">
        <AccordionItem value="advanced" className="border-0">
          <AccordionTrigger className="font-display font-bold text-sm hover:no-underline">Advanced</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-5 pt-1">
              {/* The old Easy/Medium/Hard override lived here — replaced by the
                  core Challenge control, which grades relative to the age. */}

              {/* Grid size override */}
              {GRID_MODES.includes(mode) && (
                <div className="space-y-2">
                  <FieldLabel>Grid Size</FieldLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {GRID_SIZES.map((s) => (
                      <Button key={s} variant={config.gridSize === s ? 'default' : 'outline'} size="sm" onClick={() => update({ gridSize: s })} className="font-display">{s}×{s}</Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid lines — some children track shapes better with a visible
                  grid; others find it cluttered. */}
              {GRIDLINE_MODES.includes(mode) && (
                <div className="flex items-center justify-between">
                  <FieldLabel>Show grid lines</FieldLabel>
                  <Switch checked={config.showGridLines} onCheckedChange={(v) => update({ showGridLines: v })} />
                </div>
              )}

              {/* Maze: show solution (easy only) */}
              {mode === 'maze' && config.difficulty === 'easy' && (
                <div className="flex items-center justify-between">
                  <FieldLabel>Show Solution</FieldLabel>
                  <Switch checked={config.mazeShowSolution} onCheckedChange={(v) => update({ mazeShowSolution: v })} />
                </div>
              )}

              {/* Visual scanning extras */}
              {mode === 'visualScanning' && (
                <>
                  <div className="space-y-2">
                    <FieldLabel>Character Size</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {(['large', 'medium', 'small'] as VisualScanCharSize[]).map((s) => (
                        <Button key={s} variant={config.visualScanCharSize === s ? 'default' : 'outline'} size="sm" onClick={() => update({ visualScanCharSize: s })} className="font-display text-xs capitalize">{s}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Target Frequency</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(['few', 'many'] as const).map((f) => (
                        <Button key={f} variant={config.visualScanTargetCount === f ? 'default' : 'outline'} size="sm" onClick={() => update({ visualScanTargetCount: f })} className="font-display text-xs capitalize">{f}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Dyslexia-friendly font</FieldLabel>
                    <Switch checked={config.visualScanFontStyle === 'dyslexia'} onCheckedChange={(v) => update({ visualScanFontStyle: v ? 'dyslexia' : 'standard' })} />
                  </div>
                </>
              )}

              {/* Pixel art B&W */}
              {mode === 'pixelArt' && (
                <div className="flex items-center justify-between">
                  <FieldLabel>B&amp;W (print-friendly)</FieldLabel>
                  <Switch checked={config.pixelArtBW} onCheckedChange={(v) => update({ pixelArtBW: v })} />
                </div>
              )}

              {/* Handwriting: coloured lines */}
              {mode === 'handwriting' && config.handwritingLayout !== 'wordbox' && config.handwritingLayout !== 'gridbox' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Coloured lines</FieldLabel>
                    <Switch checked={config.handwritingShowColoredLines} onCheckedChange={(v) => update({ handwritingShowColoredLines: v })} />
                  </div>
                  {config.handwritingShowColoredLines && (
                    <div className="flex gap-1.5">
                      {([{ value: 'red', color: '#DC2626' }, { value: 'blue', color: '#2563EB' }, { value: 'green', color: '#16A34A' }, { value: 'black', color: '#1E293B' }] as { value: HandwritingLineColor; color: string }[]).map((c) => (
                        <button key={c.value} onClick={() => update({ handwritingLineColor: c.value })} className={`w-7 h-7 rounded-full border-2 transition-all ${config.handwritingLineColor === c.value ? 'border-foreground scale-110 shadow-sm' : 'border-border hover:border-muted-foreground/50'}`} style={{ backgroundColor: c.color }} title={c.value} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Child name (all except traceName, where it's core) */}
              {mode !== 'traceName' && (
                <div className="space-y-2">
                  <FieldLabel>Child's name (optional)</FieldLabel>
                  <Input value={config.childName} onChange={(e) => update({ childName: e.target.value })} placeholder="Leave blank for a write-in line" />
                  <p className="text-[11px] text-muted-foreground">Used only for this printout. Never saved, and left out of share links.</p>
                </div>
              )}

              {/* Custom instruction */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>Custom instruction</FieldLabel>
                  <span className="text-[10px] text-muted-foreground">{config.customInstruction.length}/120</span>
                </div>
                <Input value={config.customInstruction} onChange={(e) => { if (e.target.value.length <= 120) update({ customInstruction: e.target.value }); }} placeholder="e.g. Circle all the matching shapes!" />
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-3 gap-1 flex-1">
                    {(['small', 'medium', 'large'] as InstructionFontSize[]).map((s) => (
                      <Button key={s} variant={config.instructionFontSize === s ? 'default' : 'outline'} size="sm" onClick={() => update({ instructionFontSize: s })} className="font-display text-xs">{s.charAt(0).toUpperCase()}</Button>
                    ))}
                  </div>
                  <Button variant={config.instructionBold ? 'default' : 'outline'} size="sm" onClick={() => update({ instructionBold: !config.instructionBold })} className="px-2.5" title="Bold instruction"><Bold className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Border style */}
              <div className="space-y-2">
                <FieldLabel>Border style</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {BORDER_STYLES.map((b) => (
                    <Button key={b.value} variant={config.borderStyle === b.value ? 'default' : 'outline'} size="sm" onClick={() => update({ borderStyle: b.value })} className="font-display text-xs">{b.label}</Button>
                  ))}
                </div>
              </div>

              {/* Header bold */}
              <div className="flex items-center justify-between">
                <FieldLabel>Bold name header</FieldLabel>
                <Switch checked={config.headerBold} onCheckedChange={(v) => update({ headerBold: v })} />
              </div>

              {/* "I did it!" reward row */}
              <div className="flex items-center justify-between">
                <FieldLabel>“I did it!” reward row</FieldLabel>
                <Switch checked={config.showReward} onCheckedChange={(v) => update({ showReward: v })} />
              </div>

              {/* Corner doodles — handwriting/motor modes only; perception
                  sheets never get decoration that could read as task content. */}
              {CORNER_DOODLE_MODES.includes(mode) && (
                <div className="flex items-center justify-between">
                  <FieldLabel>Corner doodles (colour them in!)</FieldLabel>
                  <Switch checked={config.cornerDoodles} onCheckedChange={(v) => update({ cornerDoodles: v })} />
                </div>
              )}

              {/* Answer key — only modes whose renderer draws one. */}
              {ANSWER_KEY_MODES.includes(mode) && (
                <div className="flex items-center justify-between">
                  <FieldLabel>Answer key</FieldLabel>
                  <Switch checked={config.showAnswerKey} onCheckedChange={(v) => update({ showAnswerKey: v })} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
