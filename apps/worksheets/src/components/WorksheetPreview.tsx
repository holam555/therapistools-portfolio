import { useRef } from 'react';
import { WorksheetConfig, WorksheetData, WorksheetMode, ShapeName, SHAPE_COLORS, getShapeSVG, getShapeRawSVG, DOT_SHAPE_PATHS } from '@/lib/shapes';
import { getLetterStrokes } from '@/lib/letterPaths';
import { childAgeToBand } from '@/lib/defaultConfig';
import { CATEGORY_STYLES, categoryForMode } from '@/lib/categoryColors';
import { APP_URL_SHORT } from '@/lib/site';

const AGE_LABEL: Record<string, string> = { '3-4': 'Ages 3-4', '5-6': 'Ages 5-6', '7-8': 'Ages 7-8' };
const CHALLENGE_LABEL: Record<string, string> = { easier: 'Easier', standard: 'Just right', harder: 'Harder' };

interface Props {
  config: WorksheetConfig;
  data: WorksheetData;
  /**
   * 'full' (default) = the live editor preview: styled card, #worksheet-preview
   * id for print, and all pages. 'thumb' = a gallery thumbnail: no id, lighter
   * chrome, page 1 only, non-interactive.
   */
  variant?: 'full' | 'thumb';
  /** DOM id for the full-variant wrapper. Batch pages pass unique ids so
   *  multiple previews can coexist without duplicating #worksheet-preview. */
  htmlId?: string;
  /** Friendly worksheet title shown in the sheet header (e.g. the template
   *  title). Falls back to a generic label. */
  sheetTitle?: string;
}

// No trace overlays needed anymore

const W = 595;
const H = 842;
const MARGIN = 40;
const BW_FILL = 'none';
const BW_STROKE = '#1E293B';

// ===== B2: instruction icons — pre-reader comprehension =====
// One 14px line icon per skill FAMILY (not per mode) so the visual language
// stays small: eye = find/scan, pencil = write/trace/draw, scissors = cut,
// puzzle = match/complete, crayon = colour.
type InstrIconKind = 'eye' | 'pencil' | 'scissors' | 'puzzle' | 'crayon';

const INSTR_ICON_BY_MODE: Record<WorksheetMode, InstrIconKind> = {
  find: 'eye', count: 'eye', figureGround: 'eye', visualScanning: 'eye', oddOneOut: 'eye',
  pattern: 'puzzle', sequence: 'puzzle', closure: 'puzzle',
  copy: 'pencil', mirror: 'pencil', handwriting: 'pencil', traceName: 'pencil',
  maze: 'pencil', connectDots: 'pencil', tracingPaths: 'pencil',
  scissorSkills: 'scissors',
  pixelArt: 'crayon',
};

// Drawn on a 24×24 grid, rendered at 14px. Line-art only (the eye pupil and
// crayon tip are the sole filled bits, ~2px — well under the ink budget).
const INSTR_ICON_PATHS: Record<InstrIconKind, string> = {
  eye: '<path d="M2.5 12 C6.5 5.8 17.5 5.8 21.5 12 C17.5 18.2 6.5 18.2 2.5 12 Z" /><circle cx="12" cy="12" r="3" fill="#475569" stroke="none" />',
  pencil: '<path d="M5 19 L6.6 13.9 L16.2 4.3 A2.55 2.55 0 0 1 19.8 7.9 L10.2 17.5 L5 19 Z" /><path d="M6.6 13.9 L10.2 17.5" />',
  scissors: '<circle cx="5.8" cy="7" r="2.7" /><circle cx="5.8" cy="17" r="2.7" /><path d="M8.2 8.4 L20 16.4" /><path d="M8.2 15.6 L20 7.6" />',
  puzzle: '<path d="M4.5 10.4 H8.3 A2.6 2.6 0 1 1 13.1 10.4 H16.5 V13.6 A2.6 2.6 0 1 1 16.5 18.4 V19.6 H4.5 Z" />',
  crayon: '<path d="M8.6 8.8 L12 3.4 L15.4 8.8 V19.4 Q15.4 20.5 14.3 20.5 H9.7 Q8.6 20.5 8.6 19.4 Z" /><path d="M8.6 11.4 H15.4" />',
};

// Measure the instruction so the icon+text group stays visually centred.
// Canvas TextMetrics in the browser; a per-char estimate under SSR/jsdom
// (prerender + tests) — a few px of gap drift there is purely cosmetic.
let measureCtx: CanvasRenderingContext2D | null | undefined;
function measureTextWidth(text: string, fontPx: number, weight: string): number {
  if (measureCtx === undefined) {
    measureCtx = typeof document !== 'undefined'
      ? document.createElement('canvas').getContext('2d')
      : null;
  }
  if (measureCtx) {
    measureCtx.font = `${weight} ${fontPx}px Nunito, sans-serif`;
    const w = measureCtx.measureText(text).width;
    if (w > 0) return w;
  }
  return text.length * fontPx * 0.53;
}

// ===== B3: corner doodles — the opt-in "attractive" layer =====
// Outline-only (colourable, near-zero ink), reusing the connect-the-dots
// shape paths. Rendered ONLY inside CORNER_DOODLE_MODES renderers, in space
// that is provably free of task content: the full-width row modes RESERVE a
// bottom strip (rows shrink slightly), maze uses its measured layout gaps,
// connect-dots uses a corner every shape path verifiably avoids. Perception
// sheets never call these helpers — a doodle there could read as an answer.
// Only the four outlines that stay READABLE as 42px polygon outlines — the
// butterfly/flower point clouds turn to mush at doodle size (verified 07-07).
type DoodleKind = 'star' | 'heart' | 'sun' | 'rocket';

const DOODLE_PICK: Partial<Record<WorksheetMode, [DoodleKind, DoodleKind]>> = {
  handwriting: ['star', 'heart'],
  traceName: ['sun', 'star'],
  tracingPaths: ['heart', 'sun'],
  scissorSkills: ['rocket', 'star'],
  maze: ['rocket', 'sun'], // no star here — the maze goal marker IS a star
};

// Height reserved at the bottom of the body for the doodle strip in the
// full-width row modes (handwriting, traceName, tracingPaths, scissorSkills).
const DOODLE_RESERVE = 52;

function doodleSVG(kind: DoodleKind, cx: number, cy: number, size: number, rotation: number): string {
  const pts = DOT_SHAPE_PATHS[kind](size).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return `<g data-doodle="${kind}" transform="translate(${(cx - size / 2).toFixed(1)}, ${(cy - size / 2).toFixed(1)}) rotate(${rotation}, ${size / 2}, ${size / 2})">` +
    `<polygon points="${pts}" fill="none" stroke="#94A3B8" stroke-width="1.3" stroke-linejoin="round" /></g>`;
}

function bottomDoodlePair(mode: WorksheetMode, stripCenterY: number): string {
  const [a, b] = DOODLE_PICK[mode]!;
  return doodleSVG(a, MARGIN + 22, stripCenterY, 42, -8) + doodleSVG(b, W - MARGIN - 22, stripCenterY, 42, 8);
}

// Tiny magnifier icon — turns the find/connect-dots reference boxes into
// "magnifier cards" (B3/B4 polish). Lens centre (cx,cy), lens radius r.
function magnifierSVG(cx: number, cy: number, r: number, color = '#64748B'): string {
  const hx = cx + r * 0.74, hy = cy + r * 0.74;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.3" />` +
    `<line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${(cx + r * 1.7).toFixed(1)}" y2="${(cy + r * 1.7).toFixed(1)}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" />`;
}

// Render emoji as SVG text element
function getEmojiSVG(emoji: string, cx: number, cy: number, size: number): string {
  const fontSize = size * 0.7;
  return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" style="font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${emoji}</text>`;
}

// Render shape or emoji
function getCellSVG(cell: { shape: ShapeName; emoji?: string; rotation?: number }, cx: number, cy: number, size: number, fill: string, stroke: string, strokeW: number): string {
  if (cell.emoji) return getEmojiSVG(cell.emoji, cx, cy, size);
  return getShapeSVG(cell.shape, cx, cy, size, fill, stroke, strokeW, cell.rotation);
}

// Border style helpers
function getBorderAttrs(config: WorksheetConfig, strokeColor = '#CBD5E1', width = 1.5): string {
  const dash = config.borderStyle === 'dotted' ? ` stroke-dasharray="4 4"` : '';
  const rx = config.borderStyle === 'rounded' ? ` rx="8" ry="8"` : ` rx="3"`;
  return `fill="none" stroke="${strokeColor}" stroke-width="${width}"${dash}${rx}`;
}

function getCellBorderAttrs(config: WorksheetConfig, strokeColor = '#CBD5E1', width = 1): string {
  const dash = config.borderStyle === 'dotted' ? ` stroke-dasharray="4 4"` : '';
  const rx = config.borderStyle === 'rounded' ? ` rx="6" ry="6"` : ` rx="3"`;
  return `fill="none" stroke="${strokeColor}" stroke-width="${width}"${dash}${rx}`;
}

export default function WorksheetPreview({ config, data, variant = 'full', htmlId = 'worksheet-preview', sheetTitle }: Props) {
  const getFill = (shape: ShapeName) => config.useColor ? SHAPE_COLORS[shape] : BW_FILL;
  const getStroke = (shape: ShapeName) => config.useColor ? SHAPE_COLORS[shape] : BW_STROKE;
  const getStrokeW = () => config.useColor ? 1.5 : 2.5;

  const shapeScale = config.difficulty === 'easy' ? 1.15 : config.difficulty === 'medium' ? 1.0 : 0.85;

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Header font sizes
  const dateFontSize = 11;
  const nameWeight = config.headerBold ? '800' : '600';
  const ageStr = config.childAge !== null ? ` (Age ${config.childAge})` : '';

  const instrFontSize = config.instructionFontSize === 'small' ? 11 : config.instructionFontSize === 'large' ? 18 : 14;
  const instrWeight = config.instructionBold ? '800' : '700';

  // Custom instruction is applied at render time (not only in the generator)
  // so editing it never re-rolls the puzzle. User-typed text is escaped —
  // this string is injected into the SVG via innerHTML.
  const instructions = config.customInstruction.trim() || data.instructions;

  // Category accent (colour-codes the sheet by skill family, like the cards).
  const cat = CATEGORY_STYLES[categoryForMode(data.mode)];
  const title = (sheetTitle && sheetTitle.trim()) || 'Practice Worksheet';
  const band = config.childAge !== null ? childAgeToBand(config.childAge) : null;
  const levelChip = band ? `${AGE_LABEL[band]} · ${CHALLENGE_LABEL[config.challenge] ?? 'Just right'}` : '';
  const dispFont = "'Fredoka', 'Nunito', sans-serif";

  // Name write-on: a proper tri-line segment (baseline + faint x-height guide)
  // so the child practises from the first pen stroke.
  const nameLineX = MARGIN + 52;
  const nameLineX2 = MARGIN + 250;
  const nameBaseY = MARGIN + 52;
  const nameStuff = config.childName
    ? `<text x="${nameLineX + 3}" y="${nameBaseY - 2}" font-family="${dispFont}" font-size="15" font-weight="${nameWeight}" fill="#334155">${escapeXml(config.childName + ageStr)}</text>`
    : '';

  // Instruction line with its skill-family icon (B2). The icon sits just left
  // of the measured text so the pair reads as one centred unit; skipped when
  // a (custom) instruction is long enough to crowd the margins.
  const instrY = MARGIN + 72;
  let instrSVG = '';
  {
    const iconKind = INSTR_ICON_BY_MODE[data.mode];
    const iconSize = 14;
    const gap = 7;
    const shift = (iconSize + gap) / 2;
    // Shrink-to-fit: a long (custom) instruction reduces its font size instead
    // of spilling into the margins; below 11px the icon is dropped so the text
    // gets the full content width (min 9px).
    const iconBudget = (W / 2 - MARGIN - shift) * 2 - (iconSize + gap) * 2;
    let effFont = instrFontSize;
    let textW = measureTextWidth(instructions, effFont, instrWeight);
    if (textW > iconBudget) {
      effFont = Math.max(11, Math.floor(effFont * iconBudget / textW));
      textW = measureTextWidth(instructions, effFont, instrWeight);
    }
    if (instructions.length > 0 && textW <= iconBudget) {
      const textX = W / 2 + shift;
      const iconX = textX - textW / 2 - gap - iconSize;
      const iconY = instrY - effFont * 0.36 - iconSize / 2;
      instrSVG =
        `<g data-instr-icon="${iconKind}" transform="translate(${iconX.toFixed(1)}, ${iconY.toFixed(1)}) scale(${(iconSize / 24).toFixed(4)})" fill="none" stroke="#475569" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${INSTR_ICON_PATHS[iconKind]}</g>` +
        `<text x="${textX}" y="${instrY}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="${effFont}" font-weight="${instrWeight}" fill="#1E293B">${escapeXml(instructions)}</text>`;
    } else {
      const fullBudget = W - MARGIN * 2;
      let plainFont = instrFontSize;
      const plainW = measureTextWidth(instructions, plainFont, instrWeight);
      if (plainW > fullBudget) plainFont = Math.max(9, Math.floor(plainFont * fullBudget / plainW));
      instrSVG = `<text x="${W / 2}" y="${instrY}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="${plainFont}" font-weight="${instrWeight}" fill="#1E293B">${escapeXml(instructions)}</text>`;
    }
  }

  const headerSVG = `
    <text x="${MARGIN}" y="${MARGIN + 11}" font-family="${dispFont}" font-size="11" font-weight="600" fill="#0D9488">Therapistools</text>
    <text x="${W - MARGIN}" y="${MARGIN + 11}" text-anchor="end" font-family="Inter, sans-serif" font-size="${dateFontSize}" fill="#94A3B8">Date: ____/____/________</text>
    <text x="${W / 2}" y="${MARGIN + 28}" text-anchor="middle" font-family="${dispFont}" font-size="19" font-weight="600" fill="#0F172A">${escapeXml(title)}</text>
    <line x1="${MARGIN}" y1="${MARGIN + 36}" x2="${W - MARGIN}" y2="${MARGIN + 36}" stroke="${cat.color}" stroke-width="1.5" opacity="0.5" />
    <text x="${MARGIN}" y="${nameBaseY}" font-family="${dispFont}" font-size="13" font-weight="${nameWeight}" fill="#334155">Name:</text>
    <line x1="${nameLineX}" y1="${nameBaseY - 8}" x2="${nameLineX2}" y2="${nameBaseY - 8}" stroke="#CBD5E1" stroke-width="0.6" stroke-dasharray="3 3" />
    <line x1="${nameLineX}" y1="${nameBaseY}" x2="${nameLineX2}" y2="${nameBaseY}" stroke="#94A3B8" stroke-width="1" />
    ${nameStuff}
    ${instrSVG}
  `;

  // "I did it!" self-monitoring row — 3 outline stars + a checkbox, line-art
  // only (near-zero ink), centred just below the body. Gated by showReward.
  const rewardY = H - MARGIN - 22;
  let rewardSVG = '';
  if (config.showReward) {
    const star = (cx: number, cy: number, r: number) => {
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const ao = -Math.PI / 2 + (2 * Math.PI * i) / 5;
        const ai = ao + Math.PI / 5;
        pts.push(`${(cx + Math.cos(ao) * r).toFixed(1)},${(cy + Math.sin(ao) * r).toFixed(1)}`);
        pts.push(`${(cx + Math.cos(ai) * r * 0.42).toFixed(1)},${(cy + Math.sin(ai) * r * 0.42).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="none" stroke="#F59E0B" stroke-width="1.2" stroke-linejoin="round" />`;
    };
    const cxStart = W / 2 - 6;
    rewardSVG =
      `<text x="${cxStart - 12}" y="${rewardY + 3}" text-anchor="end" font-family="${dispFont}" font-size="10" font-weight="600" fill="#64748B">How did I do?</text>` +
      star(cxStart + 4, rewardY, 7) + star(cxStart + 24, rewardY, 7) + star(cxStart + 44, rewardY, 7) +
      `<rect x="${cxStart + 62}" y="${rewardY - 6}" width="12" height="12" rx="2.5" fill="none" stroke="#94A3B8" stroke-width="1.1" />` +
      `<text x="${cxStart + 80}" y="${rewardY + 3}" font-family="${dispFont}" font-size="10" font-weight="600" fill="#64748B">I did it!</text>`;
  }

  const footerSVG = `
    ${rewardSVG}
    <line x1="${MARGIN}" y1="${H - MARGIN - 13}" x2="${W - MARGIN}" y2="${H - MARGIN - 13}" stroke="#E2E8F0" stroke-width="1" />
    ${levelChip ? `<rect x="${MARGIN}" y="${H - MARGIN - 10}" width="${8 + levelChip.length * 4.4}" height="12" rx="6" fill="${cat.tint}" />
    <text x="${MARGIN + 5}" y="${H - MARGIN - 1}" font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="${cat.color}">${escapeXml(levelChip)}</text>` : ''}
    <text x="${MARGIN + (levelChip ? 16 + levelChip.length * 4.4 : 0)}" y="${H - MARGIN - 1}" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">${escapeXml(data.skillLabel.split(' · ')[0])}</text>
    <text x="${W - MARGIN}" y="${H - MARGIN - 1}" text-anchor="end" font-family="Inter, sans-serif" font-size="9" font-weight="600" fill="#0D9488">Print your own · ${APP_URL_SHORT}</text>
  `;

  // No trace overlays to collect

  let bodySVG = '';
  let page2SVG: string | null = null;

  if (data.mode === 'find') {
    bodySVG = renderFindMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'pattern') {
    const result = renderPatternMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
    bodySVG = result.page1;
    page2SVG = result.page2;
  } else if (data.mode === 'count') {
    bodySVG = renderCountMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'copy') {
    bodySVG = renderCopyMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'sequence') {
    bodySVG = renderSequenceMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'oddOneOut') {
    bodySVG = renderOddOneOutMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'mirror') {
    bodySVG = renderMirrorMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'figureGround') {
    bodySVG = renderFigureGroundMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'closure') {
    bodySVG = renderClosureMode(config, data, shapeScale, getFill, getStroke, getStrokeW);
  } else if (data.mode === 'traceName') {
    bodySVG = renderTraceNameMode(config, data);
  } else if (data.mode === 'handwriting') {
    bodySVG = renderHandwritingMode(config, data);
  } else if (data.mode === 'maze') {
    bodySVG = renderMazeMode(config, data);
  } else if (data.mode === 'connectDots') {
    bodySVG = renderConnectDotsMode(config, data);
  } else if (data.mode === 'tracingPaths') {
    bodySVG = renderTracingPathsMode(config, data);
  } else if (data.mode === 'scissorSkills') {
    bodySVG = renderScissorSkillsMode(config, data);
  } else if (data.mode === 'visualScanning') {
    bodySVG = renderVisualScanningMode(config, data);
  } else if (data.mode === 'pixelArt') {
    bodySVG = renderPixelArtMode(config, data);
  }


  const page1Svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
      <rect width="${W}" height="${H}" fill="white" rx="4" />
      ${headerSVG}
      ${bodySVG}
      ${footerSVG}
    </svg>
  `;

  const page2SvgContent = page2SVG ? `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
      <rect width="${W}" height="${H}" fill="white" rx="4" />
      ${headerSVG}
      ${page2SVG}
      ${footerSVG}
    </svg>
  ` : null;

  if (variant === 'thumb') {
    return (
      <div
        className="bg-card overflow-hidden"
        style={{ aspectRatio: '210/297', position: 'relative', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div dangerouslySetInnerHTML={{ __html: page1Svg }} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  // The worksheet is drawn as raw SVG (dangerouslySetInnerHTML), which screen
  // readers can't parse — expose a concise description instead.
  const ariaLabel = `Worksheet: ${data.instructions} (${data.skillLabel})`;

  return (
    <div id={htmlId} ref={containerRef} role="img" aria-label={ariaLabel} className="space-y-4 worksheet-print-root">
      <div
        className="worksheet-paper"
        style={{ aspectRatio: '210/297', maxHeight: '85vh', position: 'relative', overflow: 'hidden' }}
      >
        <div dangerouslySetInnerHTML={{ __html: page1Svg }} style={{ width: '100%', height: '100%' }} />
      </div>
      {page2SvgContent && (
        <div
          className="worksheet-paper"
          style={{ aspectRatio: '210/297', maxHeight: '85vh', position: 'relative', overflow: 'hidden' }}
        >
          <div dangerouslySetInnerHTML={{ __html: page2SvgContent }} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}

// ========== MODE 1: FIND THE SHAPE ==========
function renderFindMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const targetShape = data.targetShape!;
  const grid = data.grid!;
  const size = config.gridSize;

  const refBoxY = MARGIN + 85;
  const refBoxH = 64;
  const refBoxW = 200;
  const refBoxX = (W - refBoxW) / 2;

  let svg = '';
  svg += `<rect x="${refBoxX}" y="${refBoxY}" width="${refBoxW}" height="${refBoxH}" rx="8" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="8,5" />`;
  svg += magnifierSVG(refBoxX + 15, refBoxY + 12, 4);
  svg += `<text x="${refBoxX + 26}" y="${refBoxY + 16}" font-family="Nunito, sans-serif" font-size="10" font-weight="700" fill="#64748B">Find this:</text>`;
  const targetEmoji = (data as any)._targetEmoji;
  if (targetEmoji) {
    svg += getEmojiSVG(targetEmoji, refBoxX + refBoxW / 2, refBoxY + refBoxH / 2 + 5, 50 * shapeScale);
  } else {
    svg += getShapeSVG(targetShape, refBoxX + refBoxW / 2, refBoxY + refBoxH / 2 + 5, 50 * shapeScale, getFill(targetShape), getStroke(targetShape), getStrokeW());
  }

  const gridTop = refBoxY + refBoxH + 20;
  const gridAreaH = H - gridTop - MARGIN - 35;
  const gridAreaW = W - MARGIN * 2;
  const cellSize = Math.min(gridAreaW / size, gridAreaH / size);
  const gridW = cellSize * size;
  const gridH = cellSize * size;
  const gridX = (W - gridW) / 2;

  svg += `<rect x="${gridX}" y="${gridTop}" width="${gridW}" height="${gridH}" ${getBorderAttrs(config, '#CBD5E1', 2)} />`;

  if (config.showGridLines) {
    for (let i = 1; i < size; i++) {
      svg += `<line x1="${gridX + i * cellSize}" y1="${gridTop}" x2="${gridX + i * cellSize}" y2="${gridTop + gridH}" stroke="#E2E8F0" stroke-width="1" />`;
      svg += `<line x1="${gridX}" y1="${gridTop + i * cellSize}" x2="${gridX + gridW}" y2="${gridTop + i * cellSize}" stroke="#E2E8F0" stroke-width="1" />`;
    }
  }

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cx = gridX + c * cellSize + cellSize / 2;
      const cy = gridTop + r * cellSize + cellSize / 2;
      svg += getCellSVG(cell, cx, cy, cellSize * shapeScale, getFill(cell.shape), getStroke(cell.shape), getStrokeW());
    });
  });

  if (config.showAnswerKey) {
    let count = 0;
    grid.forEach(row => row.forEach(cell => { if (cell.isTarget) count++; }));
    svg += `<text x="${W / 2}" y="${gridTop + gridH + 18}" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" fill="#94A3B8">Answer: ${count} ${targetShape}${count !== 1 ? 's' : ''}</text>`;
  }

  return svg;
}

// ========== MODE 3: MATCH PATTERN ==========
// Returns { page1: string, page2: string | null }
function renderPatternPage(
  puzzles: import('@/lib/shapes').PatternPuzzle[],
  startIdx: number,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
  config: WorksheetConfig,
  showAnswerKeyOnPage: boolean,
  allPuzzles: import('@/lib/shapes').PatternPuzzle[],
): string {
  let svg = '';

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  // Fixed min row height so box never exceeds 90px
  const MIN_ROW_H = 106;
  const perPage = Math.max(1, Math.floor(availH / MIN_ROW_H));
  const pagePuzzles = puzzles.slice(startIdx, startIdx + perPage);
  const rowH = availH / pagePuzzles.length;
  const patternBoxSize = Math.min(rowH - 16, 90);
  const optionBoxSize = Math.min(patternBoxSize * 0.82, 68);

  const leftColX = MARGIN + 20;
  const rightColX = W / 2 + 10;
  const optionSpacing = (W - rightColX - MARGIN - 10) < optionBoxSize * 3.5
    ? optionBoxSize + 8
    : optionBoxSize + 16;

  pagePuzzles.forEach((puzzle, pIdx) => {
    const globalIdx = startIdx + pIdx;
    const rowY = startY + pIdx * rowH + (rowH - patternBoxSize) / 2;

    svg += `<text x="${leftColX - 12}" y="${rowY + patternBoxSize / 2 + 4}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="13" font-weight="700" fill="#64748B">${globalIdx + 1}.</text>`;
    svg += renderMiniGrid(puzzle.pattern, leftColX, rowY, patternBoxSize, shapeScale, getFill, getStroke, getStrokeW, config.showGridLines, config);

    const arrowX = leftColX + patternBoxSize + 14;
    const arrowY = rowY + patternBoxSize / 2;
    svg += `<line x1="${arrowX}" y1="${arrowY}" x2="${arrowX + 20}" y2="${arrowY}" stroke="#94A3B8" stroke-width="1.5" />`;
    svg += `<polygon points="${arrowX + 20},${arrowY - 4} ${arrowX + 28},${arrowY} ${arrowX + 20},${arrowY + 4}" fill="#94A3B8" />`;

    puzzle.options.forEach((option, oIdx) => {
      const ox = rightColX + oIdx * optionSpacing;
      const oy = rowY + (patternBoxSize - optionBoxSize) / 2;

      svg += `<text x="${ox + optionBoxSize / 2}" y="${oy - 4}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="600" fill="#94A3B8">${String.fromCharCode(65 + oIdx)}</text>`;
      svg += renderMiniGrid(option, ox, oy, optionBoxSize, shapeScale * 0.85, getFill, getStroke, getStrokeW, false, config);
      svg += `<circle cx="${ox + optionBoxSize / 2}" cy="${oy + optionBoxSize + 8}" r="3" fill="none" stroke="#CBD5E1" stroke-width="1" />`;
    });

    svg += `<circle cx="${leftColX + patternBoxSize / 2}" cy="${rowY + patternBoxSize + 8}" r="3" fill="none" stroke="#CBD5E1" stroke-width="1" />`;
  });

  if (showAnswerKeyOnPage) {
    const answers = allPuzzles.map((p, i) => `${i + 1}→${String.fromCharCode(65 + p.correctIndex)}`).join('  ');
    svg += `<text x="${W / 2}" y="${H - MARGIN - 28}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">Answers: ${answers}</text>`;
  }

  return svg;
}

function renderPatternMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
): { page1: string; page2: string | null } {
  const puzzles = data.patternPuzzles!;
  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  const MIN_ROW_H = 106;
  const perPage = Math.max(1, Math.floor(availH / MIN_ROW_H));

  const page1 = renderPatternPage(puzzles, 0, shapeScale, getFill, getStroke, getStrokeW, config, config.showAnswerKey, puzzles);
  const page2 = puzzles.length > perPage
    ? renderPatternPage(puzzles, perPage, shapeScale, getFill, getStroke, getStrokeW, config, false, puzzles)
    : null;

  return { page1, page2 };
}

function renderMiniGrid(
  grid: { shape: ShapeName; rotation?: number }[][],
  x: number,
  y: number,
  size: number,
  scale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
  showLines: boolean,
  config?: WorksheetConfig,
): string {
  const rows = grid.length;
  const cols = grid[0].length;
  const cellW = size / cols;
  const cellH = size / rows;
  let svg = '';

  if (config) {
    svg += `<rect x="${x}" y="${y}" width="${size}" height="${size}" ${getCellBorderAttrs(config, '#CBD5E1', 1.5)} />`;
  } else {
    svg += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="none" stroke="#CBD5E1" stroke-width="1.5" rx="3" />`;
  }

  if (showLines) {
    for (let i = 1; i < cols; i++) {
      svg += `<line x1="${x + i * cellW}" y1="${y}" x2="${x + i * cellW}" y2="${y + size}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }
    for (let i = 1; i < rows; i++) {
      svg += `<line x1="${x}" y1="${y + i * cellH}" x2="${x + size}" y2="${y + i * cellH}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }
  }

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cx = x + c * cellW + cellW / 2;
      const cy = y + r * cellH + cellH / 2;
      svg += getShapeSVG(cell.shape, cx, cy, Math.min(cellW, cellH) * scale, getFill(cell.shape), getStroke(cell.shape), getStrokeW(), cell.rotation);
    });
  });

  return svg;
}

// ========== MODE 4: FIND AND COUNT ==========
function renderCountMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const puzzle = data.countPuzzle!;
  const { grid, targetShapes } = puzzle;
  const ROWS = grid.length;
  const COLS = grid[0].length;

  let svg = '';

  const refY = MARGIN + 85;
  const refH = 78;
  const boxCount = targetShapes.length;
  const totalRefW = Math.min(boxCount * 110, W - MARGIN * 2);
  const refX = (W - totalRefW) / 2;
  const boxW = totalRefW / boxCount;

  const countEmojiMap = (puzzle as any)._emojiMap;
  targetShapes.forEach((shape, i) => {
    const bx = refX + i * boxW + 4;
    const bw = boxW - 8;
    svg += `<rect x="${bx}" y="${refY}" width="${bw}" height="${refH}" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" />`;
    if (countEmojiMap && countEmojiMap[shape]) {
      svg += getEmojiSVG(countEmojiMap[shape], bx + bw / 2, refY + 26, 36 * shapeScale);
    } else {
      svg += getShapeSVG(shape, bx + bw / 2, refY + 26, 36 * shapeScale, getFill(shape), getStroke(shape), getStrokeW());
    }
    // Answer write-in box
    const ansBoxY = refY + refH - 26;
    const ansBoxW = Math.min(bw * 0.55, 40);
    const ansBoxX = bx + (bw - ansBoxW) / 2;
    svg += `<text x="${bx + bw / 2}" y="${ansBoxY - 2}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="8" font-weight="600" fill="#94A3B8">Count:</text>`;
    svg += `<rect x="${ansBoxX}" y="${ansBoxY + 2}" width="${ansBoxW}" height="18" rx="3" fill="white" stroke="#94A3B8" stroke-width="1.2" />`;
    if (config.showAnswerKey) {
      svg += `<text x="${ansBoxX + ansBoxW / 2}" y="${ansBoxY + 14}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#16A34A">${puzzle.counts[shape]}</text>`;
    }
  });

  const gridTop = refY + refH + 18;
  const gridAreaH = H - gridTop - MARGIN - 35;
  const gridAreaW = W - MARGIN * 2;
  const cellW = gridAreaW / COLS;
  const cellH = gridAreaH / ROWS;
  const cellSize = Math.min(cellW, cellH);
  const gridW = cellSize * COLS;
  const gridH = cellSize * ROWS;
  const gridX = (W - gridW) / 2;

  svg += `<rect x="${gridX}" y="${gridTop}" width="${gridW}" height="${gridH}" ${getBorderAttrs(config, '#CBD5E1', 2)} />`;

  if (config.showGridLines) {
    for (let c = 1; c < COLS; c++) {
      svg += `<line x1="${gridX + c * cellSize}" y1="${gridTop}" x2="${gridX + c * cellSize}" y2="${gridTop + gridH}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }
    for (let r = 1; r < ROWS; r++) {
      svg += `<line x1="${gridX}" y1="${gridTop + r * cellSize}" x2="${gridX + gridW}" y2="${gridTop + r * cellSize}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }
  }

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cx = gridX + c * cellSize + cellSize / 2;
      const cy = gridTop + r * cellSize + cellSize / 2;
      svg += getCellSVG(cell, cx, cy, cellSize * shapeScale, getFill(cell.shape), getStroke(cell.shape), getStrokeW());
    });
  });

  if (config.showAnswerKey) {
    const answers = targetShapes.map(s => `${s}: ${puzzle.counts[s]}`).join('   ');
    svg += `<text x="${W / 2}" y="${gridTop + gridH + 16}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">Answers: ${answers}</text>`;
  }

  return svg;
}

// ========== MODE 5: COPY THE PATTERN ==========
function renderCopyMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const puzzles = data.copyPuzzles!;
  let svg = '';

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  const rowH = availH / puzzles.length;

  puzzles.forEach((puzzle, pIdx) => {
    const gridSize = puzzle.sourceGrid.length;
    const maxGridSz = Math.min(rowH - 20, 160);
    const cellSz = maxGridSz / gridSize;
    const gridSz = cellSz * gridSize;

    const rowY = startY + pIdx * rowH + (rowH - gridSz) / 2;
    const pairW = W - MARGIN * 2;
    const leftX = MARGIN + pairW * 0.05;
    const rightX = MARGIN + pairW * 0.55;

    svg += `<text x="${MARGIN}" y="${rowY + gridSz / 2 + 4}" font-family="Nunito, sans-serif" font-size="13" font-weight="700" fill="#64748B">${pIdx + 1}.</text>`;
    svg += `<text x="${leftX + gridSz / 2}" y="${rowY - 5}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="9" font-weight="700" fill="#94A3B8">Look at this</text>`;

    svg += `<rect x="${leftX}" y="${rowY}" width="${gridSz}" height="${gridSz}" ${getCellBorderAttrs(config, '#CBD5E1', 1.5)} />`;
    if (config.showGridLines) {
      for (let i = 1; i < gridSize; i++) {
        svg += `<line x1="${leftX + i * cellSz}" y1="${rowY}" x2="${leftX + i * cellSz}" y2="${rowY + gridSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
        svg += `<line x1="${leftX}" y1="${rowY + i * cellSz}" x2="${leftX + gridSz}" y2="${rowY + i * cellSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
      }
    }
    puzzle.sourceGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cx = leftX + c * cellSz + cellSz / 2;
        const cy = rowY + r * cellSz + cellSz / 2;
        svg += getShapeSVG(cell.shape, cx, cy, cellSz * shapeScale, getFill(cell.shape), getStroke(cell.shape), getStrokeW(), cell.rotation);
      });
    });

    const arrowX = leftX + gridSz + 8;
    const arrowY2 = rowY + gridSz / 2;
    svg += `<line x1="${arrowX}" y1="${arrowY2}" x2="${arrowX + 16}" y2="${arrowY2}" stroke="#94A3B8" stroke-width="1.5" />`;
    svg += `<polygon points="${arrowX + 16},${arrowY2 - 4} ${arrowX + 24},${arrowY2} ${arrowX + 16},${arrowY2 + 4}" fill="#94A3B8" />`;

    svg += `<rect x="${rightX}" y="${rowY}" width="${gridSz}" height="${gridSz}" ${getCellBorderAttrs(config, '#94A3B8', 1.5)} />`;
    svg += `<text x="${rightX + gridSz / 2}" y="${rowY - 5}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="9" font-weight="700" fill="#94A3B8">✏ Copy here</text>`;
    for (let i = 1; i < gridSize; i++) {
      svg += `<line x1="${rightX + i * cellSz}" y1="${rowY}" x2="${rightX + i * cellSz}" y2="${rowY + gridSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
      svg += `<line x1="${rightX}" y1="${rowY + i * cellSz}" x2="${rightX + gridSz}" y2="${rowY + i * cellSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }
  });

  return svg;
}

// ========== MODE 6: WHAT COMES NEXT ==========
function renderSequenceMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const puzzles = data.sequencePuzzles!;
  let svg = '';

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  const rowH = availH / puzzles.length;
  const cellSz = Math.min(rowH * 0.45, 50);

  puzzles.forEach((puzzle, pIdx) => {
    const rowY = startY + pIdx * rowH;
    const seqY = rowY + rowH * 0.18;

    svg += `<text x="${MARGIN + 4}" y="${seqY + cellSz / 2 + 4}" font-family="Nunito, sans-serif" font-size="12" font-weight="700" fill="#64748B">${pIdx + 1}.</text>`;

    const seqStartX = MARGIN + 28;
    for (let i = 0; i < 4; i++) {
      const cx = seqStartX + i * (cellSz + 8) + cellSz / 2;
      const cy = seqY + cellSz / 2;
      svg += `<rect x="${cx - cellSz / 2}" y="${cy - cellSz / 2}" width="${cellSz}" height="${cellSz}" ${getCellBorderAttrs(config, '#CBD5E1', 1)} />`;
      svg += getCellSVG(puzzle.sequence[i], cx, cy, cellSz * shapeScale, getFill(puzzle.sequence[i].shape), getStroke(puzzle.sequence[i].shape), getStrokeW());
    }

    const qx = seqStartX + 4 * (cellSz + 8) + cellSz / 2;
    const qy = seqY + cellSz / 2;
    svg += `<rect x="${qx - cellSz / 2}" y="${qy - cellSz / 2}" width="${cellSz}" height="${cellSz}" rx="4" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6,4" />`;
    svg += `<text x="${qx}" y="${qy + 5}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="${cellSz * 0.5}" font-weight="700" fill="#CBD5E1">?</text>`;

    const optStartX = seqStartX + 5 * (cellSz + 8) + 20;
    const optSize = cellSz * 0.85;
    puzzle.options.forEach((opt, oIdx) => {
      const ox = optStartX + oIdx * (optSize + 14) + optSize / 2;
      const oy = seqY + cellSz / 2;
      svg += `<text x="${ox}" y="${oy - optSize / 2 - 3}" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="600" fill="#94A3B8">${String.fromCharCode(65 + oIdx)}</text>`;
      svg += `<rect x="${ox - optSize / 2}" y="${oy - optSize / 2}" width="${optSize}" height="${optSize}" ${getCellBorderAttrs(config, '#94A3B8', 1)} />`;
      svg += getCellSVG(opt, ox, oy, optSize * shapeScale, getFill(opt.shape), getStroke(opt.shape), getStrokeW());
    });
  });

  if (config.showAnswerKey) {
    const answers = puzzles.map((p, i) => `${i + 1}→${String.fromCharCode(65 + p.correctIndex)}`).join('  ');
    svg += `<text x="${W / 2}" y="${H - MARGIN - 28}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">Answers: ${answers}</text>`;
  }

  return svg;
}

// ========== MODE 7: ODD ONE OUT ==========
function renderOddOneOutMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const rows = data.oddOneOutRows!;
  let svg = '';

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  const rowH = availH / rows.length;
  const cellSz = Math.min(rowH - 10, 60);
  const totalRowW = 5 * cellSz + 4 * 16;
  const rowStartX = (W - totalRowW) / 2;

  const isText = rows.length > 0 && rows[0].textItems && rows[0].textItems.length > 0;
  const fontSize = config.difficulty === 'easy' ? Math.min(cellSz * 0.7, 36) : config.difficulty === 'medium' ? Math.min(cellSz * 0.6, 28) : Math.min(cellSz * 0.5, 22);

  rows.forEach((row, rIdx) => {
    const rowY = startY + rIdx * rowH + (rowH - cellSz) / 2;

    svg += `<text x="${rowStartX - 18}" y="${rowY + cellSz / 2 + 4}" font-family="Nunito, sans-serif" font-size="12" font-weight="700" fill="#64748B">${rIdx + 1}.</text>`;

    if (isText && row.textItems) {
      row.textItems.forEach((char, i) => {
        const cx = rowStartX + i * (cellSz + 16) + cellSz / 2;
        const cy = rowY + cellSz / 2;
        svg += `<rect x="${cx - cellSz / 2}" y="${cy - cellSz / 2}" width="${cellSz}" height="${cellSz}" ${getCellBorderAttrs(config, '#CBD5E1', 1)} />`;
        svg += `<text x="${cx}" y="${cy + fontSize * 0.35}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="600" fill="#1E293B">${char}</text>`;
      });
    } else {
      row.items.forEach((cell, i) => {
        const cx = rowStartX + i * (cellSz + 16) + cellSz / 2;
        const cy = rowY + cellSz / 2;
        svg += `<rect x="${cx - cellSz / 2}" y="${cy - cellSz / 2}" width="${cellSz}" height="${cellSz}" ${getCellBorderAttrs(config, '#CBD5E1', 1)} />`;
        svg += getCellSVG(cell, cx, cy, cellSz * shapeScale, getFill(cell.shape), getStroke(cell.shape), getStrokeW());
      });
    }
  });

  if (config.showAnswerKey) {
    const answers = rows.map((r, i) => `${i + 1}:${r.oddIndex + 1}`).join('  ');
    svg += `<text x="${W / 2}" y="${H - MARGIN - 28}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">Answers (position): ${answers}</text>`;
  }

  return svg;
}

// ========== MODE 8: MIRROR IMAGE ==========
function renderMirrorMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const puzzles = data.mirrorPuzzles!;
  let svg = '';

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  const pairH = availH / puzzles.length;

  puzzles.forEach((puzzle, pIdx) => {
    const gridSize = puzzle.sourceGrid.length;
    const maxGridSz = Math.min(pairH - 30, 180, (W - MARGIN * 2 - 30) / 2);
    const cellSz = maxGridSz / gridSize;
    const gridSz = cellSz * gridSize;

    const pairY = startY + pIdx * pairH + (pairH - gridSz) / 2;
    const centerX = W / 2;
    const leftX = centerX - gridSz - 8;
    const rightX = centerX + 8;

    svg += `<text x="${W / 2}" y="${pairY - 8}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="12" font-weight="700" fill="#64748B">${pIdx + 1}.</text>`;
    svg += `<line x1="${centerX}" y1="${pairY - 2}" x2="${centerX}" y2="${pairY + gridSz + 2}" stroke="#94A3B8" stroke-width="2" stroke-dasharray="8,5" />`;

    svg += `<rect x="${leftX}" y="${pairY}" width="${gridSz}" height="${gridSz}" ${getCellBorderAttrs(config, '#CBD5E1', 1.5)} />`;
    for (let i = 1; i < gridSize; i++) {
      svg += `<line x1="${leftX + i * cellSz}" y1="${pairY}" x2="${leftX + i * cellSz}" y2="${pairY + gridSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
      svg += `<line x1="${leftX}" y1="${pairY + i * cellSz}" x2="${leftX + gridSz}" y2="${pairY + i * cellSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }
    puzzle.sourceGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const cx = leftX + c * cellSz + cellSz / 2;
          const cy = pairY + r * cellSz + cellSz / 2;
          svg += getShapeSVG(cell.shape, cx, cy, cellSz * shapeScale, getFill(cell.shape), getStroke(cell.shape), getStrokeW(), cell.rotation);
        }
      });
    });

    svg += `<rect x="${rightX}" y="${pairY}" width="${gridSz}" height="${gridSz}" ${getCellBorderAttrs(config, '#94A3B8', 1.5)} />`;
    svg += `<text x="${rightX + gridSz / 2}" y="${pairY - 5}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="9" font-weight="700" fill="#94A3B8">✏ Draw here</text>`;
    for (let i = 1; i < gridSize; i++) {
      svg += `<line x1="${rightX + i * cellSz}" y1="${pairY}" x2="${rightX + i * cellSz}" y2="${pairY + gridSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
      svg += `<line x1="${rightX}" y1="${pairY + i * cellSz}" x2="${rightX + gridSz}" y2="${pairY + i * cellSz}" stroke="#E2E8F0" stroke-width="0.8" />`;
    }

    if (config.showAnswerKey) {
      puzzle.mirroredGrid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const cx = rightX + c * cellSz + cellSz / 2;
            const cy = pairY + r * cellSz + cellSz / 2;
            svg += getShapeSVG(cell.shape, cx, cy, cellSz * shapeScale * 0.7, '#CBD5E1', '#94A3B8', 1, cell.rotation);
          }
        });
      });
    }
  });

  return svg;
}

// ========== MODE 9: FIGURE GROUND ==========
function renderFigureGroundMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const puzzle = data.figureGroundPuzzle!;
  const { shapes: placed, targetShapes } = puzzle;
  let svg = '';

  const refY = MARGIN + 85;
  const refH = 72;
  const boxCount = targetShapes.length;
  const totalRefW = Math.min(boxCount * 100, W - MARGIN * 2);
  const refX = (W - totalRefW) / 2;
  const boxW = totalRefW / boxCount;

  const fgEmojiMap = (puzzle as any)._emojiMap;
  targetShapes.forEach((shape, i) => {
    const bx = refX + i * boxW + 4;
    const bw = boxW - 8;
    svg += `<rect x="${bx}" y="${refY}" width="${bw}" height="${refH}" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" />`;
    if (fgEmojiMap && fgEmojiMap[shape]) {
      svg += getEmojiSVG(fgEmojiMap[shape], bx + bw / 2, refY + 22, 28);
    } else {
      svg += getShapeSVG(shape, bx + bw / 2, refY + 22, 28, getFill(shape), getStroke(shape), getStrokeW());
    }
    // Answer write-in box
    const ansBoxY = refY + refH - 26;
    const ansBoxW = Math.min(bw * 0.55, 36);
    const ansBoxX = bx + (bw - ansBoxW) / 2;
    svg += `<text x="${bx + bw / 2}" y="${ansBoxY - 2}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="7.5" font-weight="600" fill="#94A3B8">Count:</text>`;
    svg += `<rect x="${ansBoxX}" y="${ansBoxY + 2}" width="${ansBoxW}" height="17" rx="3" fill="white" stroke="#94A3B8" stroke-width="1.2" />`;
    if (config.showAnswerKey) {
      svg += `<text x="${ansBoxX + ansBoxW / 2}" y="${ansBoxY + 13}" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#16A34A">${puzzle.counts[shape]}</text>`;
    }
  });

  const areaTop = refY + refH + 18;
  const areaH = H - areaTop - MARGIN - 35;
  const areaW = W - MARGIN * 2;
  const areaX = MARGIN;

  svg += `<rect x="${areaX}" y="${areaTop}" width="${areaW}" height="${areaH}" ${getBorderAttrs(config, '#CBD5E1', 1.5)} />`;

  const scaleX = areaW / 400;
  const scaleY = areaH / 400;

  placed.forEach(s => {
    const cx = areaX + s.cx * scaleX;
    const cy = areaTop + s.cy * scaleY;
    const r = s.r * Math.min(scaleX, scaleY);
    if ((s as any).emoji) {
      // Render emoji with reduced opacity for overlapping effect
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${r * 0.7}" opacity="0.6" style="font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${(s as any).emoji}</text>`;
    } else {
      const raw = getShapeRawSVG(s.shape, cx, cy, r);
      const transform = s.rotation ? ` transform="rotate(${s.rotation}, ${cx}, ${cy})"` : '';
      svg += raw.replace('/>', ` fill="none" stroke="${getStroke(s.shape)}" stroke-width="2.5"${transform} />`);
    }
  });

  if (config.showAnswerKey) {
    const answers = targetShapes.map(s => `${s}: ${puzzle.counts[s]}`).join('   ');
    svg += `<text x="${W / 2}" y="${areaTop + areaH + 14}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">Answers: ${answers}</text>`;
  }

  return svg;
}

// ========== MODE 10: VISUAL CLOSURE ==========
function renderClosureMode(
  config: WorksheetConfig,
  data: WorksheetData,
  shapeScale: number,
  getFill: (s: ShapeName) => string,
  getStroke: (s: ShapeName) => string,
  getStrokeW: () => number,
) {
  const puzzles = data.closurePuzzles!;
  let svg = '';

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 35;
  const cols = 2;
  const rows = Math.ceil(puzzles.length / cols);
  const cellW = (W - MARGIN * 2) / cols;
  const cellH = availH / rows;
  const shapeSz = Math.min(cellW * 0.4, cellH * 0.45, 70);

  puzzles.forEach((puzzle, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = MARGIN + col * cellW + cellW / 2;
    const cy = startY + row * cellH + cellH * 0.32;

    svg += `<text x="${cx}" y="${cy - shapeSz / 2 - 10}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="11" font-weight="700" fill="#64748B">${idx + 1}.</text>`;

    const puzzleEmoji = (puzzle as any).emoji;
    if (puzzleEmoji) {
      // Render emoji with gaps (CSS letter-spacing simulation via opacity)
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${shapeSz * 0.7}" opacity="0.35" style="font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${puzzleEmoji}</text>`;
    } else {
      const raw = getShapeRawSVG(puzzle.shape, cx, cy, shapeSz);
      svg += raw.replace('/>', ` fill="none" stroke="${getStroke(puzzle.shape)}" stroke-width="3" stroke-dasharray="${puzzle.dashArray}" />`);
    }

    const optY = cy + shapeSz / 2 + 20;
    const optSize = 24;
    const optSpacing = 42;
    const optStartX = cx - optSpacing;

    const optionEmojis = (puzzle as any).optionEmojis;
    puzzle.options.forEach((opt, oIdx) => {
      const ox = optStartX + oIdx * optSpacing;
      svg += `<text x="${ox}" y="${optY - 6}" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="600" fill="#94A3B8">${String.fromCharCode(65 + oIdx)}</text>`;
      if (optionEmojis && optionEmojis[oIdx]) {
        svg += getEmojiSVG(optionEmojis[oIdx], ox, optY + optSize / 2 + 2, optSize);
      } else {
        svg += getShapeSVG(opt, ox, optY + optSize / 2 + 2, optSize, getFill(opt), getStroke(opt), getStrokeW());
      }
    });
  });

  if (config.showAnswerKey) {
    const answers = puzzles.map((p, i) => `${i + 1}→${String.fromCharCode(65 + p.correctIndex)}`).join('  ');
    svg += `<text x="${W / 2}" y="${H - MARGIN - 28}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#94A3B8">Answers: ${answers}</text>`;
  }

  return svg;
}

// ========== MODE 11: TRACE YOUR NAME ==========
function renderTraceNameMode(
  config: WorksheetConfig,
  data: WorksheetData,
) {
  const traceData = data.traceNameData!;
  if (!traceData || traceData.letters.length === 0) {
    return `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="16" fill="#94A3B8">Enter a name to generate tracing worksheet</text>`;
  }

  let svg = '';
  // Two age levers (see GRADING_AUDIT F2):
  //  - cap height: bigger for younger. Smaller letters also let more
  //    trace/write rows fit, so younger naturally gets fewer repetitions.
  //  - support weight: a bold reference letter + strong guideline for the
  //    youngest, fading to a faint model + light guides for the oldest.
  const letterH = config.difficulty === 'easy' ? 60 : config.difficulty === 'medium' ? 50 : 40;
  const refStroke = config.difficulty === 'easy' ? 4.5 : config.difficulty === 'medium' ? 3 : 2;
  const baseStroke = config.difficulty === 'easy' ? 1.6 : config.difficulty === 'medium' ? 1 : 0.7;
  const startY = MARGIN + 90;
  const doodleReserve = config.cornerDoodles ? DOODLE_RESERVE : 0;
  const availH = H - startY - MARGIN - 35 - doodleReserve;

  // For each section of up to 5 letters
  const sectionCount = traceData.sections.length;
  const sectionH = availH / sectionCount;

  traceData.sections.forEach((section, sIdx) => {
    const secY = startY + sIdx * sectionH;

    // Row layout: each row hosts a full letter box of 1.4 × capH (ascender
    // line down to descender depth), so g/j/p/q/y tails never collide with the
    // next row. capH = cap/ascender height; stroke coords map y=0 → top line,
    // y=0.4 → x-height, y=1 → baseline, y≤1.4 → descender.
    const rowH = Math.min(sectionH / 3 - 4, letterH * 1.4 + 20);
    const capH = Math.min(letterH, (rowH - 10) / 1.4);
    const letterW = capH * 0.7;
    const rowCapacity = Math.max(3, Math.floor(sectionH / rowH));
    const rowLabels: string[] = ['Reference'];
    for (let i = 1; i < rowCapacity; i++) rowLabels.push(i % 2 === 1 ? 'Trace' : 'Write');

    const totalLetterW = section.length * (letterW + 12) - 12;
    const secStartX = (W - totalLetterW) / 2;

    for (let rowIdx = 0; rowIdx < rowLabels.length; rowIdx++) {
      const rowY = secY + rowIdx * rowH;
      const rowKind = rowLabels[rowIdx];

      const topY = rowY + (rowH - capH * 1.4) / 2; // ascender/cap line
      const midY = topY + capH * 0.4;              // x-height line
      const baseY = topY + capH;                   // baseline

      // Row label
      svg += `<text x="${MARGIN}" y="${(topY + baseY) / 2 + 3}" font-family="Inter, sans-serif" font-size="8" fill="#94A3B8">${rowKind}</text>`;

      // Guidelines: top, x-height (dashed), baseline (strongest)
      svg += `<line x1="${secStartX - 5}" y1="${topY}" x2="${secStartX + totalLetterW + 5}" y2="${topY}" stroke="#E2E8F0" stroke-width="0.5" />`;
      svg += `<line x1="${secStartX - 5}" y1="${midY}" x2="${secStartX + totalLetterW + 5}" y2="${midY}" stroke="#E2E8F0" stroke-width="0.5" stroke-dasharray="4,4" />`;
      svg += `<line x1="${secStartX - 5}" y1="${baseY}" x2="${secStartX + totalLetterW + 5}" y2="${baseY}" stroke="#CBD5E1" stroke-width="${baseStroke}" />`;

      section.forEach((letter, lIdx) => {
        const lx = secStartX + lIdx * (letterW + 12);
        const px2x = (px: number) => lx + px * letterW;
        const py2y = (py: number) => topY + py * capH;
        const strokes = getLetterStrokes(letter);
        if (!strokes) return;

        if (rowKind === 'Reference') {
          // Reference: solid light grey letter
          strokes.forEach(stroke => {
            if (stroke.length < 2) return;
            const points = stroke.map(([px, py]) => `${px2x(px)},${py2y(py)}`).join(' ');
            svg += `<polyline points="${points}" fill="none" stroke="#CBD5E1" stroke-width="${refStroke}" stroke-linecap="round" stroke-linejoin="round" />`;
          });
        } else if (rowKind === 'Trace') {
          // Dot-trace: dots along the stroke path
          strokes.forEach((stroke, strokeIdx) => {
            if (stroke.length < 2) return;
            const dotSpacing = config.difficulty === 'easy' ? 6 : config.difficulty === 'medium' ? 8 : 10;
            const dotR = config.difficulty === 'easy' ? 2.5 : 2;

            // Interpolate dots along each segment (true pixel distance, so
            // density is even on both tall strokes and wide crossbars).
            for (let si = 0; si < stroke.length - 1; si++) {
              const X1 = px2x(stroke[si][0]), Y1 = py2y(stroke[si][1]);
              const X2 = px2x(stroke[si + 1][0]), Y2 = py2y(stroke[si + 1][1]);
              const segLen = Math.hypot(X2 - X1, Y2 - Y1);
              const dots = Math.max(2, Math.ceil(segLen / dotSpacing));
              for (let d = 0; d <= dots; d++) {
                const t = d / dots;
                svg += `<circle cx="${X1 + (X2 - X1) * t}" cy="${Y1 + (Y2 - Y1) * t}" r="${dotR}" fill="#94A3B8" />`;
              }
            }

            // Numbered start dot on EVERY stroke — teaches stroke order, not
            // just where the first stroke begins.
            const startX = px2x(stroke[0][0]);
            const startY2 = py2y(stroke[0][1]);
            svg += `<circle cx="${startX}" cy="${startY2}" r="4.5" fill="#22C55E" />`;
            svg += `<text x="${startX}" y="${startY2 + 2.5}" text-anchor="middle" font-family="Inter, sans-serif" font-size="6" font-weight="800" fill="white">${strokeIdx + 1}</text>`;

            // Arrow showing direction (first stroke only, to avoid clutter)
            if (strokeIdx === 0 && stroke.length >= 2) {
              const endX = px2x(stroke[1][0]);
              const endY = py2y(stroke[1][1]);
              const angle = Math.atan2(endY - startY2, endX - startX);
              const arrowLen = 10;
              const ax = startX + Math.cos(angle) * arrowLen;
              const ay = startY2 + Math.sin(angle) * arrowLen;
              svg += `<line x1="${startX}" y1="${startY2}" x2="${ax}" y2="${ay}" stroke="#22C55E" stroke-width="1.5" />`;
              svg += `<polygon points="${ax},${ay} ${ax - 4 * Math.cos(angle - 0.5)},${ay - 4 * Math.sin(angle - 0.5)} ${ax - 4 * Math.cos(angle + 0.5)},${ay - 4 * Math.sin(angle + 0.5)}" fill="#22C55E" />`;
            }
          });
        }
        // 'Write' rows: blank, just the guidelines (already drawn above)
      });
    }
  });

  if (doodleReserve) svg += bottomDoodlePair('traceName', startY + availH + doodleReserve / 2);

  return svg;
}

// ========== MODE 12: HANDWRITING PRACTICE ==========

function isChinese(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x4e00 && code <= 0x9fff;
}

function hasChinese(text: string): boolean {
  return Array.from(text).some(isChinese);
}

function isAllChinese(text: string): boolean {
  return Array.from(text).every(ch => isChinese(ch) || ch === ' ');
}

// Letter classification for adaptive box heights
const ASCENDERS = new Set('bdfhklt'.split(''));
const DESCENDERS = new Set('gjpqy'.split(''));
const CAPITALS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

function getLetterType(ch: string): 'tall' | 'medium' | 'descender' {
  if (CAPITALS.has(ch) || ASCENDERS.has(ch)) return 'tall';
  if (DESCENDERS.has(ch)) return 'descender';
  return 'medium';
}

// Line color hex mapping
const LINE_COLOR_MAP: Record<string, string> = {
  red: '#DC2626', blue: '#2563EB', green: '#16A34A', black: '#1E293B',
};

// Renders a 3-line set: colored top & bottom, grey/black dashed middle
function renderColoredTrilineSet(
  x: number, baselineY: number, fontPx: number, width: number, config: WorksheetConfig
): string {
  const lineMode = config.handwritingLineMode || '3-line';

  if (lineMode === '4-line') {
    return renderFourLineSet(x, baselineY, fontPx, width, config);
  }

  const zoneH = fontPx * 0.7;
  const topY = baselineY - zoneH;
  const midY = baselineY - zoneH / 2; // exact midpoint
  const botY = baselineY;

  const useColor = config.handwritingShowColoredLines;
  const lineColor = useColor ? (LINE_COLOR_MAP[config.handwritingLineColor] || '#DC2626') : '#94A3B8';

  let svg = '';
  // Top line (colored)
  svg += `<line x1="${x}" y1="${topY}" x2="${x + width}" y2="${topY}" stroke="${lineColor}" stroke-width="1.2" />`;
  // Middle dotted line (always grey)
  svg += `<line x1="${x}" y1="${midY}" x2="${x + width}" y2="${midY}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="4 3" />`;
  // Bottom line (colored)
  svg += `<line x1="${x}" y1="${botY}" x2="${x + width}" y2="${botY}" stroke="${lineColor}" stroke-width="1.2" />`;

  return svg;
}

// 4-line HK copybook format: 4 evenly spaced solid lines (bottom, baseline, midline, top)
function renderFourLineSet(
  x: number, baselineY: number, fontPx: number, width: number, config: WorksheetConfig
): string {
  const zoneH = fontPx * 0.7;
  const topY = baselineY - zoneH;
  const botY = baselineY;
  const spacing = zoneH / 3; // 4 lines = 3 equal gaps

  const useColor = config.handwritingShowColoredLines;
  const lineColor = useColor ? (LINE_COLOR_MAP[config.handwritingLineColor] || '#DC2626') : '#94A3B8';

  let svg = '';
  for (let i = 0; i < 4; i++) {
    const ly = topY + i * spacing;
    const isMiddle = i === 1 || i === 2;
    if (isMiddle) {
      // Inner two lines: dashed grey, same style as tri-line middle
      svg += `<line x1="${x}" y1="${ly}" x2="${x + width}" y2="${ly}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="4 3" />`;
    } else {
      svg += `<line x1="${x}" y1="${ly}" x2="${x + width}" y2="${ly}" stroke="${lineColor}" stroke-width="1.2" />`;
    }
  }
  return svg;
}

// Self-hosted beginner-handwriting font (SIL OFL, public/fonts). The cursive
// fallbacks are visually distinct, so a loading failure is obvious — never a
// silent look-alike.
const PENMANSHIP_FONT = "'Edu QLD Beginner', 'Comic Sans MS', cursive";

// Render model or trace text. baselineY = SVG y baseline = bottom line.
// The TRACE row is drawn with paint, not a font: hollow letters with a dashed
// stroke (fill:none + stroke-dasharray). Unlike the old KG Primary Dots CDN
// font — which silently rendered SOLID when it failed to load, making the
// trace row useless — this dotted look is deterministic and font-independent.
function renderPenmanshipText(
  text: string, x: number, baselineY: number, fontPx: number, _contentW: number, dotted: boolean,
  overrideFontFamily?: string
): string {
  if (!text) return '';
  const fontFamily = overrideFontFamily ?? PENMANSHIP_FONT;
  const paint = dotted
    ? `fill="none" stroke="#64748B" stroke-width="${Math.max(0.8, fontPx * 0.02)}" stroke-dasharray="${fontPx * 0.06} ${fontPx * 0.05}"`
    : `fill="#333333"`;
  return `<text x="${x + 2}" y="${baselineY}" dominant-baseline="auto" font-family="${fontFamily}" font-size="${fontPx}" font-weight="400" ${paint}>${escapeXml(text)}</text>`;
}

// Sentence mode:
//   Row 1 — solid model text on trilines
//   Row 2 — dashed hollow trace text on trilines (paint-based, font-agnostic)
//   Row 3 — Empty trilines                             → independent practice
// Sizing: capitals touch top red line, baseline sits on bottom red line.
function renderSentenceTrilineMode(
  text: string, rows: number, startY: number, availableH: number,
  lineH: number, contentW: number, fontFamily: string, config: WorksheetConfig
): string {
  const mmToPx = 2.833;
  const fontPx = lineH;
  const zoneH = fontPx * 0.7; // distance between top red line and baseline (bottom red line)
  const grassH = zoneH * 0.15;
  const triSetH = zoneH + grassH;
  const setGap = 6 * mmToPx;
  const rowH = triSetH + setGap;

  // Edu QLD Beginner cap-height = 0.772 × font-size (measured via canvas
  // TextMetrics) → font-size = zoneH / 0.772 makes capitals touch the top line
  const kgFontPx = zoneH / 0.772;
  const isCursive = fontFamily.includes('Segoe Script') || fontFamily.includes('Comic Sans');

  let currentY = startY;
  let svg = '';

  // Row 1: solid model text
  if (currentY + zoneH <= startY + availableH) {
    const baselineY = currentY + zoneH;
    svg += renderColoredTrilineSet(MARGIN, baselineY, fontPx, contentW, config);
    // Use custom font for cursive mode, KG Penmanship for print
    svg += renderPenmanshipText(text, MARGIN, baselineY, kgFontPx, contentW, false, isCursive ? fontFamily : undefined);
    currentY += rowH;
  }

  // Row 2: dotted trace text — paint-based dashes, so it works for ANY font
  // (the old dotted FONT couldn't do cursive and failed silently offline).
  if (currentY + zoneH <= startY + availableH) {
    const baselineY = currentY + zoneH;
    svg += renderColoredTrilineSet(MARGIN, baselineY, fontPx, contentW, config);
    svg += renderPenmanshipText(text, MARGIN, baselineY, kgFontPx, contentW, true, isCursive ? fontFamily : undefined);

    // Stroke guide: green "Start →" indicator above the trace row
    if (config.handwritingShowStartEnd && text) {
      const dotX = MARGIN + 2;
      const dotY = baselineY - zoneH - 8;
      svg += `<circle cx="${dotX + 5}" cy="${dotY}" r="5.5" fill="#22C55E" />`;
      svg += `<text x="${dotX + 5}" y="${dotY + 3.5}" text-anchor="middle" font-family="Inter, sans-serif" font-size="7" font-weight="800" fill="white">1</text>`;
      svg += `<line x1="${dotX + 12}" y1="${dotY}" x2="${dotX + 28}" y2="${dotY}" stroke="#22C55E" stroke-width="1.5" />`;
      svg += `<polygon points="${dotX + 28},${dotY} ${dotX + 23},${dotY - 3} ${dotX + 23},${dotY + 3}" fill="#22C55E" />`;
      svg += `<text x="${dotX + 32}" y="${dotY + 3.5}" font-family="Nunito, sans-serif" font-size="8" font-weight="700" fill="#22C55E">Trace here</text>`;
    }

    currentY += rowH;
  }

  // rows × blank practice rows
  const maxBlank = Math.min(rows, Math.floor((startY + availableH - currentY) / rowH));
  for (let r = 0; r < maxBlank; r++) {
    const baselineY = currentY + zoneH + r * rowH;
    svg += renderColoredTrilineSet(MARGIN, baselineY, fontPx, contentW, config);
  }

  return svg;
}

function renderGridBoxRows(
  chars: string[], rows: number, startY: number, availableH: number,
  boxSize: number, gapBetweenSets: number, contentW: number,
  fontFamily: string, isDotted: boolean, ghostColor: string, config: WorksheetConfig,
  sectionLabel?: string
): { svg: string; usedH: number } {
  const rowH = boxSize + gapBetweenSets * 0.5;
  const maxRows = Math.min(rows, Math.floor(availableH / rowH));
  const maxCols = Math.floor(contentW / boxSize);
  const charCount = Math.min(chars.length, maxCols);
  let svg = '';

  if (sectionLabel) {
    svg += `<text x="${MARGIN}" y="${startY - 4}" font-family="Nunito, sans-serif" font-size="11" font-weight="700" fill="#64748B">${escapeXml(sectionLabel)}</text>`;
  }

  for (let r = 0; r < maxRows; r++) {
    const baseY = startY + r * rowH;
    for (let c = 0; c < charCount; c++) {
      const bx = MARGIN + c * boxSize;
      const borderAttrs = getCellBorderAttrs(config, '#94A3B8', 1);
      svg += `<rect x="${bx}" y="${baseY}" width="${boxSize}" height="${boxSize}" ${borderAttrs} />`;

      if (r === 0) {
        const ch = chars[c];
        const charFontPx = boxSize * 0.65;
        svg += `<text x="${bx + boxSize / 2}" y="${baseY + boxSize * 0.72}" text-anchor="middle" font-family="${PENMANSHIP_FONT}" font-size="${charFontPx}" font-weight="400" fill="#333333">${escapeXml(ch)}</text>`;
      }
    }
  }
  return { svg, usedH: maxRows * rowH };
}

// ========== WORD BOXES SUB-MODE ==========
function renderWordBoxesMode(config: WorksheetConfig, data: WorksheetData): string {
  if (!data.handwritingData) return '';
  const { words, fontSizeMm, font } = data.handwritingData;
  if (words.length === 0) {
    return `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="16" fill="#94A3B8">Add words (one per line) to build the worksheet</text>`;
  }

  const mmToPx = 2.833;
  const fontFamilyMap: Record<string, string> = {
    print: "Arial, Helvetica, sans-serif",
    cursive: "'Segoe Script', 'Comic Sans MS', cursive",
  };
  const fontFamily = fontFamilyMap[font] || fontFamilyMap.print;

  const contentW = W - MARGIN * 2;
  const startY = MARGIN + 90;
  const doodleReserve = config.cornerDoodles ? DOODLE_RESERVE : 0;
  const availableH = H - startY - MARGIN - 30 - doodleReserve;
  const colW = (contentW - 20) / 2; // 2 columns with 20px gap
  const lineH = fontSizeMm * mmToPx;

  // Sizing — all proportional to fontSizeMm
  const tallH = lineH;
  const medH = lineH * 0.72;
  const descH = tallH;
  const descExtra = lineH * 0.3;
  const labelFontPx = Math.max(10, lineH * 0.55);
  const labelH = labelFontPx + 8;
  const trilineSetH = lineH;
  const gapBetweenParts = 6 * mmToPx;

  const displayMode = config.wordBoxDisplayMode || 'boxOnly';
  const showTriline = displayMode === 'trilineOnly' || displayMode === 'both';
  const showBoxes = displayMode === 'boxOnly' || displayMode === 'both';

  const wordBlockH = labelH + (showTriline ? trilineSetH + gapBetweenParts : 0) + (showBoxes ? tallH + descExtra + gapBetweenParts : 0) + gapBetweenParts;
  const maxPerCol = Math.min(4, Math.floor(availableH / wordBlockH));

  let svg = '';

  words.slice(0, maxPerCol * 2).forEach((word, wIdx) => {
    const col = wIdx % 2;
    const row = Math.floor(wIdx / 2);
    if (row >= maxPerCol) return;

    const colX = MARGIN + col * (colW + 20);
    const blockY = startY + row * wordBlockH;
    const chars = Array.from(word.trim());
    if (chars.length === 0) return;

    // 1. Word label in Patrick Hand (solid, dark grey)
    svg += `<text x="${colX}" y="${blockY + labelFontPx}" font-family="${PENMANSHIP_FONT}" font-size="${labelFontPx}" font-weight="400" fill="#333333">${escapeXml(word.trim())}</text>`;

    let nextY = blockY + labelH;

    // 2. Empty tri-lines (if enabled)
    if (showTriline) {
      const fontPxTrace = lineH;
      const zoneH = fontPxTrace * 0.7;
      const grassH = zoneH * 0.15;
      const traceBaselineY = nextY + zoneH;
      svg += renderColoredTrilineSet(colX, traceBaselineY, fontPxTrace, colW, config);
      nextY = traceBaselineY + grassH + gapBetweenParts;
    }

    // 3. Adaptive word boxes (if enabled)
    if (showBoxes) {
      const boxesY = nextY;
      const boxW = Math.min(colW / chars.length, tallH * 0.8);
      const baseline = boxesY + tallH;

      chars.forEach((ch, cIdx) => {
        const bx = colX + cIdx * boxW;
        const type = getLetterType(ch);
        let boxTop: number;
        let boxHeight: number;

        if (type === 'tall') {
          boxTop = boxesY;
          boxHeight = tallH;
        } else if (type === 'descender') {
          boxTop = baseline - medH;
          boxHeight = medH + descExtra;
        } else {
          boxTop = baseline - medH;
          boxHeight = medH;
        }

        svg += `<rect x="${bx}" y="${boxTop}" width="${boxW}" height="${boxHeight}" fill="none" stroke="#1E293B" stroke-width="1.8" rx="2" />`;

        if (cIdx === 0) {
          svg += `<line x1="${colX}" y1="${baseline}" x2="${colX + chars.length * boxW}" y2="${baseline}" stroke="#DC2626" stroke-width="0.6" stroke-dasharray="3 2" />`;
        }
      });
    }
  });

  if (doodleReserve) svg += bottomDoodlePair('handwriting', startY + availableH + doodleReserve / 2);

  return svg;
}

function renderHandwritingMode(config: WorksheetConfig, data: WorksheetData): string {
  if (!data.handwritingData) return '';
  const { text, rows, paperStyle, fontSizeMm, font, subMode } = data.handwritingData;

  // Word Boxes sub-mode
  if (subMode === 'wordBoxes') {
    return renderWordBoxesMode(config, data);
  }

  const mmToPx = 2.833;
  const lineH = fontSizeMm * mmToPx;
  const boxSize = fontSizeMm * mmToPx;
  const gapBetweenSets = 8 * mmToPx;
  const contentW = W - MARGIN * 2;
  const startY = MARGIN + 90;
  const doodleReserve = config.cornerDoodles ? DOODLE_RESERVE : 0;
  const availableH = H - startY - MARGIN - 30 - doodleReserve;

  const fontFamilyMap: Record<string, string> = {
    print: "Arial, Helvetica, sans-serif",
    cursive: "'Segoe Script', 'Comic Sans MS', cursive",
  };
  const fontFamily = fontFamilyMap[font] || fontFamilyMap.print;
  const ghostColor = '#C8CDD3';
  const isDotted = false;
  const allChars = Array.from(text);

  let svg = '';

  const containsChinese = hasChinese(text);
  const allChinese = isAllChinese(text);

  // Determine rendering strategy based on content + paper style
  if (paperStyle === 'gridbox') {
    const result = renderGridBoxRows(allChars, rows, startY, availableH, boxSize, gapBetweenSets, contentW, fontFamily, isDotted, ghostColor, config);
    svg += result.svg;
  } else {
    // Tri-line mode — now uses colored HWT-style lines with sentence groups
    if (allChinese) {
      // Chinese: first row grid boxes, remaining blank colored tri-lines
      const rowH = boxSize + gapBetweenSets * 0.5;
      const maxCols = Math.floor(contentW / boxSize);
      const charCount = Math.min(allChars.length, maxCols);

      for (let c = 0; c < charCount; c++) {
        const bx = MARGIN + c * boxSize;
        const borderAttrs = getCellBorderAttrs(config, '#94A3B8', 1);
        svg += `<rect x="${bx}" y="${startY}" width="${boxSize}" height="${boxSize}" ${borderAttrs} />`;
        const ch = allChars[c];
        const charFontPx = boxSize * 0.65;
        svg += `<text x="${bx + boxSize / 2}" y="${startY + boxSize * 0.72}" text-anchor="middle" font-family="${fontFamily}" font-size="${charFontPx}" font-weight="400" fill="${ghostColor}">${escapeXml(ch)}</text>`;
      }

      // Blank colored tri-lines below
      const triStartY = startY + rowH;
      const remainH = availableH - rowH;
      const fontPxBlank = lineH;
      const zoneHBlank = fontPxBlank * 0.7;
      const grassHBlank = zoneHBlank * 0.15;
      const triSetHBlank = zoneHBlank + grassHBlank;
      const setGap = 4 * mmToPx;
      const setH = triSetHBlank + setGap;
      const blankRows = Math.min(rows - 1, Math.floor(remainH / setH));
      for (let r = 0; r < blankRows; r++) {
        const blankBaselineY = triStartY + r * setH + zoneHBlank;
        svg += renderColoredTrilineSet(MARGIN, blankBaselineY, fontPxBlank, contentW, config);
      }
    } else if (containsChinese) {
      const engChars = allChars.filter(ch => !isChinese(ch));
      const chnChars = allChars.filter(isChinese);
      const rowH = boxSize + gapBetweenSets * 0.5;
      const maxCols = Math.floor(contentW / boxSize);
      const charCount = Math.min(chnChars.length, maxCols);

      svg += `<text x="${MARGIN}" y="${startY - 4}" font-family="Nunito, sans-serif" font-size="11" font-weight="700" fill="#64748B">Chinese Grid Box (方格紙)</text>`;
      for (let c = 0; c < charCount; c++) {
        const bx = MARGIN + c * boxSize;
        const borderAttrs = getCellBorderAttrs(config, '#94A3B8', 1);
        svg += `<rect x="${bx}" y="${startY}" width="${boxSize}" height="${boxSize}" ${borderAttrs} />`;
        const charFontPx = boxSize * 0.65;
        svg += `<text x="${bx + boxSize / 2}" y="${startY + boxSize * 0.72}" text-anchor="middle" font-family="${fontFamily}" font-size="${charFontPx}" font-weight="400" fill="${ghostColor}">${escapeXml(chnChars[c])}</text>`;
      }

      const triStartY = startY + rowH + gapBetweenSets * 0.5;
      const remainH = availableH - rowH - gapBetweenSets * 0.5;
      svg += renderSentenceTrilineMode(engChars.join(''), Math.max(1, rows - 1), triStartY, remainH, lineH, contentW, fontFamily, config);
    } else {
      // Pure English: colored tri-line with 3-row sentence groups
      svg += renderSentenceTrilineMode(text, rows, startY, availableH, lineH, contentW, fontFamily, config);
    }
  }

  if (doodleReserve) svg += bottomDoodlePair('handwriting', startY + availableH + doodleReserve / 2);

  return svg;
}

// ========== MODE 13: MAZE ==========
function renderMazeMode(config: WorksheetConfig, data: WorksheetData): string {
  const maze = data.mazeData!;
  const { grid, rows, cols, shape, solution } = maze;

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 45;
  const availW = W - MARGIN * 2;
  const cellSize = Math.min(availW / cols, availH / rows);
  const mazeW = cellSize * cols;
  const mazeH = cellSize * rows;
  const mazeX = (W - mazeW) / 2;
  const mazeY = startY + (availH - mazeH) / 2;

  let svg = '';

  // Circle clip mask
  if (shape === 'circle') {
    const clipCx = mazeX + mazeW / 2;
    const clipCy = mazeY + mazeH / 2;
    const clipR = Math.min(mazeW, mazeH) / 2;
    svg += `<defs><clipPath id="maze-circle"><circle cx="${clipCx}" cy="${clipCy}" r="${clipR}" /></clipPath></defs>`;
    svg += `<circle cx="${clipCx}" cy="${clipCy}" r="${clipR}" fill="none" stroke="#1E293B" stroke-width="2.5" />`;
    svg += `<g clip-path="url(#maze-circle)">`;
  }

  // Draw walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = mazeX + c * cellSize;
      const y = mazeY + r * cellSize;
      const cell = grid[r][c];
      const sw = 1.5;
      const color = '#1E293B';
      if (cell.top) svg += `<line x1="${x}" y1="${y}" x2="${x + cellSize}" y2="${y}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />`;
      if (cell.right) svg += `<line x1="${x + cellSize}" y1="${y}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />`;
      if (cell.bottom) svg += `<line x1="${x}" y1="${y + cellSize}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />`;
      if (cell.left) svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cellSize}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />`;
    }
  }

  if (shape === 'circle') {
    svg += `</g>`;
  }

  // Solution path — available at all difficulty levels when enabled
  if (config.mazeShowSolution && solution.length > 1) {
    const pathD = solution.map((p, i) => {
      const px = mazeX + p[1] * cellSize + cellSize / 2;
      const py = mazeY + p[0] * cellSize + cellSize / 2;
      return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
    }).join(' ');
    svg += `<path d="${pathD}" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5" />`;
  }

  // Start marker (green circle)
  const startCx = mazeX + cellSize / 2;
  const startCy = mazeY + cellSize / 2;
  svg += `<circle cx="${startCx}" cy="${startCy}" r="${cellSize * 0.25}" fill="#22C55E" />`;
  svg += `<text x="${startCx}" y="${startCy + 3}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${cellSize * 0.22}" font-weight="700" fill="white">S</text>`;

  // End marker: outline star (B4 — line-art like the rest of the icon set,
  // and far less ink than the old filled star at large cell sizes).
  const endCx = mazeX + (cols - 0.5) * cellSize;
  const endCy = mazeY + (rows - 0.5) * cellSize;
  const starR = cellSize * 0.28;
  const starPts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const aOuter = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    const aInner = aOuter + Math.PI / 5;
    starPts.push(`${endCx + Math.cos(aOuter) * starR},${endCy + Math.sin(aOuter) * starR}`);
    starPts.push(`${endCx + Math.cos(aInner) * starR * 0.42},${endCy + Math.sin(aInner) * starR * 0.42}`);
  }
  svg += `<polygon points="${starPts.join(' ')}" fill="none" stroke="#EF4444" stroke-width="${Math.max(1.6, cellSize * 0.07)}" stroke-linejoin="round" />`;

  // Corner doodles in the maze's measured layout gaps (the centred maze
  // always leaves horizontal bands above/below; skip if a band is too thin).
  if (config.cornerDoodles) {
    const [a, b] = DOODLE_PICK.maze!;
    const topGap = mazeY - startY;
    const botGap = startY + availH - (mazeY + mazeH);
    if (topGap >= 46) svg += doodleSVG(a, MARGIN + 22, startY + topGap / 2, Math.min(42, topGap - 6), -8);
    if (botGap >= 46) svg += doodleSVG(b, W - MARGIN - 22, mazeY + mazeH + botGap / 2, Math.min(42, botGap - 6), 8);
  }

  return svg;
}

// ========== MODE 14: CONNECT THE DOTS ==========
function renderConnectDotsMode(config: WorksheetConfig, data: WorksheetData): string {
  const dots = data.connectDotsData!;
  const { dots: dotList, completedPath, shapeName } = dots;

  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 45;
  const availW = W - MARGIN * 2;
  // Leave bottom quarter for coloring
  const drawH = availH * 0.75;
  const drawSize = Math.min(availW, drawH);
  const scale = drawSize / 400;
  const offsetX = (W - drawSize) / 2;
  const offsetY = startY + 10;

  let svg = '';

  // Small reference image in top-right corner (20% size)
  const refSize = drawSize * 0.18;
  const refScale = refSize / 400;
  const refX = W - MARGIN - refSize - 5;
  const refY = startY + 5;
  svg += `<rect x="${refX - 3}" y="${refY - 3}" width="${refSize + 6}" height="${refSize + 6}" rx="4" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />`;
  svg += magnifierSVG(refX + refSize / 2 - 20, refY - 10, 3.2, '#94A3B8');
  svg += `<text x="${refX + refSize / 2 - 11}" y="${refY - 7}" font-family="Nunito, sans-serif" font-size="7.5" font-weight="700" fill="#94A3B8">Preview</text>`;
  const refPath = dotList.map((d, i) => `${i === 0 ? 'M' : 'L'} ${refX + d.x * refScale} ${refY + d.y * refScale}`).join(' ') + ' Z';
  svg += `<path d="${refPath}" fill="none" stroke="#CBD5E1" stroke-width="1" />`;

  // Draw dots
  const dotRadius = Math.max(3, 5 - dotList.length * 0.03);
  const fontSize = Math.max(6, 9 - dotList.length * 0.05);

  dotList.forEach((dot) => {
    const x = offsetX + dot.x * scale;
    const y = offsetY + dot.y * scale;
    const isStart = dot.index === 1;
    const dotFill = isStart ? '#22C55E' : '#1E293B';
    const r = isStart ? dotRadius + 2 : dotRadius;
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${dotFill}" />`;

    // "START" label above dot 1
    if (isStart) {
      svg += `<text x="${x}" y="${y - r - 4}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="8" font-weight="800" fill="#22C55E">START</text>`;
    }

    // Number label - offset to avoid overlap
    const angle = Math.atan2(dot.y - 200, dot.x - 200);
    const labelDist = r + fontSize * 0.8;
    const lx = x + Math.cos(angle) * labelDist;
    const ly = y + Math.sin(angle) * labelDist + fontSize * 0.35;
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="${isStart ? '800' : '600'}" fill="${isStart ? '#22C55E' : '#64748B'}">${dot.index}</text>`;
  });

  // Coloring area label
  const colorY = offsetY + drawSize + 15;
  svg += `<text x="${W / 2}" y="${colorY}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="11" font-weight="600" fill="#94A3B8">✏️ Colour your picture here!</text>`;
  svg += `<rect x="${offsetX}" y="${colorY + 8}" width="${drawSize}" height="${availH * 0.2}" rx="6" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="6,4" />`;

  // Single corner doodle, top-left: every DOT_SHAPE_PATHS shape (and its dot
  // labels) verifiably stays right/below of x<110,y<200, so the box at
  // (57,143)–(103,189) can never collide with a dot. The other corners are
  // taken (reference preview, colouring box), so this mode gets just one.
  if (config.cornerDoodles) {
    // Contrast rule: never a doodle that rhymes with the puzzle shape (a
    // spiky corner sun next to a star puzzle invites "is that my picture?").
    const spiky = shapeName === 'sun' || shapeName === 'star';
    const kind: DoodleKind = spiky ? 'heart' : shapeName === 'heart' ? 'star' : 'sun';
    svg += doodleSVG(kind, 80, 166, 46, -8);
  }

  return svg;
}

// ========== MODE 15: TRACING PATHS ==========
function renderTracingPathsMode(config: WorksheetConfig, data: WorksheetData): string {
  const paths = data.tracingPathsData!;
  const startY = MARGIN + 88;
  const doodleReserve = config.cornerDoodles ? DOODLE_RESERVE : 0;
  const availH = H - startY - MARGIN - 45 - doodleReserve;
  const availW = W - MARGIN * 2;
  const rowCount = paths.rows.length;
  const rowH = availH / rowCount;
  const scaleX = availW / 460;

  const thickness = config.tracingThickness === 'thick' ? 4 : config.tracingThickness === 'thin' ? 1.5 : 2.5;
  const dashArray = config.tracingThickness === 'thick' ? '10 6' : config.tracingThickness === 'thin' ? '4 3' : '6 4';

  let svg = '';

  paths.rows.forEach((row, i) => {
    const offsetY = startY + i * rowH;
    // Scale the path
    const pathD = row.pathD.replace(/(\d+\.?\d*)\s+(\d+\.?\d*)/g, (_, x, y) => {
      return `${MARGIN + parseFloat(x) * scaleX} ${offsetY + parseFloat(y) * (rowH / (availH / rowCount))}`;
    });

    // Actually, let's compute more carefully
    const baseRowH = availH / rowCount; // expected unscaled row height
    const totalUnscaledH = paths.rows.length > 0 ? (() => {
      // Rows are generated with varying rowH based on difficulty
      const isEasy = config.difficulty === 'easy';
      const isMedium = config.difficulty === 'medium';
      return isEasy ? 100 : isMedium ? 80 : 60;
    })() : 80;
    const scaleY2 = rowH / totalUnscaledH;

    // Re-render path with proper transforms
    const sX = MARGIN + row.startX * scaleX;
    const sY = offsetY + (row.startY - i * totalUnscaledH) * scaleY2;
    const eX = MARGIN + row.endX * scaleX;
    const eY = offsetY + (row.endY - i * totalUnscaledH) * scaleY2;

    // Transform path coordinates
    const transformedPath = row.pathD.replace(/([ML])\s*([\d.]+)\s+([\d.]+)/g, (_, cmd, x, y) => {
      const tx = MARGIN + parseFloat(x) * scaleX;
      const ty = offsetY + (parseFloat(y) - i * totalUnscaledH) * scaleY2;
      return `${cmd} ${tx} ${ty}`;
    }).replace(/([CQ])\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g, (_, cmd, x1, y1, x2, y2, x3, y3) => {
      const tx1 = MARGIN + parseFloat(x1) * scaleX;
      const ty1 = offsetY + (parseFloat(y1) - i * totalUnscaledH) * scaleY2;
      const tx2 = MARGIN + parseFloat(x2) * scaleX;
      const ty2 = offsetY + (parseFloat(y2) - i * totalUnscaledH) * scaleY2;
      const tx3 = MARGIN + parseFloat(x3) * scaleX;
      const ty3 = offsetY + (parseFloat(y3) - i * totalUnscaledH) * scaleY2;
      return `${cmd} ${tx1} ${ty1} ${tx2} ${ty2} ${tx3} ${ty3}`;
    }).replace(/([Q])\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g, (_, cmd, x1, y1, x2, y2) => {
      const tx1 = MARGIN + parseFloat(x1) * scaleX;
      const ty1 = offsetY + (parseFloat(y1) - i * totalUnscaledH) * scaleY2;
      const tx2 = MARGIN + parseFloat(x2) * scaleX;
      const ty2 = offsetY + (parseFloat(y2) - i * totalUnscaledH) * scaleY2;
      return `${cmd} ${tx1} ${ty1} ${tx2} ${ty2}`;
    });

    // Dotted guide path
    svg += `<path d="${transformedPath}" fill="none" stroke="#94A3B8" stroke-width="${thickness}" stroke-dasharray="${dashArray}" stroke-linecap="round" />`;

    // Start (green) and end (red) markers
    svg += `<circle cx="${sX}" cy="${sY}" r="${thickness + 3}" fill="#22C55E" />`;
    svg += `<circle cx="${eX}" cy="${eY}" r="${thickness + 2}" fill="#EF4444" />`;

    // Direction arrow near start
    const arrowAngle = Math.atan2(eY - sY, eX - sX);
    const arrowLen = 12;
    const ax = sX + Math.cos(arrowAngle) * arrowLen;
    const ay = sY + Math.sin(arrowAngle) * arrowLen;
    svg += `<line x1="${sX}" y1="${sY}" x2="${ax}" y2="${ay}" stroke="#22C55E" stroke-width="2" />`;
    svg += `<polygon points="${ax},${ay} ${ax - 5 * Math.cos(arrowAngle - 0.5)},${ay - 5 * Math.sin(arrowAngle - 0.5)} ${ax - 5 * Math.cos(arrowAngle + 0.5)},${ay - 5 * Math.sin(arrowAngle + 0.5)}" fill="#22C55E" />`;

    // Row label
    svg += `<text x="${MARGIN - 5}" y="${sY + 4}" text-anchor="end" font-family="Nunito, sans-serif" font-size="10" font-weight="700" fill="#94A3B8">${i + 1}</text>`;
  });

  if (doodleReserve) svg += bottomDoodlePair('tracingPaths', startY + availH + doodleReserve / 2);

  return svg;
}

// ========== MODE 16: SCISSOR SKILLS ==========
function renderScissorSkillsMode(config: WorksheetConfig, data: WorksheetData): string {
  const scissors = data.scissorSkillsData!;
  const startY = MARGIN + 88;
  const doodleReserve = config.cornerDoodles ? DOODLE_RESERVE : 0;
  const availH = H - startY - MARGIN - 45 - doodleReserve;
  const availW = W - MARGIN * 2;
  const lineCount = scissors.lines.length;
  const lineSpacing = availH / lineCount;
  const scaleX = availW / 460;

  let svg = '';

  // Safety reminder at top of sheet
  svg += `<text x="${W / 2}" y="${startY - 8}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="9" fill="#94A3B8">✂ Use safety scissors with an adult's supervision</text>`;

  scissors.lines.forEach((line, i) => {
    const y = startY + i * lineSpacing + lineSpacing / 2;

    // Transform path
    const transformedPath = line.pathD.replace(/([ML])\s*([\d.]+)\s+([\d.-]+)/g, (_, cmd, x, yVal) => {
      return `${cmd} ${MARGIN + parseFloat(x) * scaleX} ${y + parseFloat(yVal)}`;
    }).replace(/([C])\s*([\d.]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.-]+)/g, (_, cmd, x1, y1, x2, y2, x3, y3) => {
      return `${cmd} ${MARGIN + parseFloat(x1) * scaleX} ${y + parseFloat(y1)} ${MARGIN + parseFloat(x2) * scaleX} ${y + parseFloat(y2)} ${MARGIN + parseFloat(x3) * scaleX} ${y + parseFloat(y3)}`;
    });

    // Dashed cutting line
    svg += `<path d="${transformedPath}" fill="none" stroke="#1E293B" stroke-width="2.5" stroke-dasharray="8 4" stroke-linecap="round" />`;

    // Scissors icon at start
    const scissorX = MARGIN + line.startX * scaleX - 18;
    const scissorY = y;
    svg += `<text x="${scissorX}" y="${scissorY + 5}" font-family="sans-serif" font-size="16" fill="#64748B">✂</text>`;

    // Small arrow showing cut direction
    const arrowX = MARGIN + line.startX * scaleX + 5;
    svg += `<polygon points="${arrowX},${y - 3} ${arrowX + 8},${y} ${arrowX},${y + 3}" fill="#94A3B8" />`;
  });

  if (doodleReserve) svg += bottomDoodlePair('scissorSkills', startY + availH + doodleReserve / 2);

  return svg;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ========== MODE 22: VISUAL SCANNING ==========
function renderVisualScanningMode(config: WorksheetConfig, data: WorksheetData): string {
  const vs = data.visualScanData!;
  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 45;
  const availW = W - MARGIN * 2;
  const charSize = config.visualScanCharSize === 'large' ? 18 : config.visualScanCharSize === 'small' ? 12 : 15;

  const cellW = availW / vs.cols;
  const cellH = availH / vs.rows;

  let svg = '';

  // Grid
  for (let r = 0; r < vs.rows; r++) {
    for (let c = 0; c < vs.cols; c++) {
      const x = MARGIN + c * cellW;
      const y = startY + r * cellH;

      // Cell border
      svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="#E2E8F0" stroke-width="0.5" />`;

      // Character
      const ch = vs.grid[r][c];
      const isTarget = ch === vs.target;
      const isHighlighted = config.showAnswerKey && isTarget;

      if (isHighlighted) {
        svg += `<circle cx="${x + cellW / 2}" cy="${y + cellH / 2}" r="${Math.min(cellW, cellH) / 2 - 1}" fill="none" stroke="#16A34A" stroke-width="1.8" />`;
      }

      const fontFamily = config.visualScanFontStyle === 'dyslexia' ? 'OpenDyslexic, sans-serif' : 'Inter, sans-serif';
      svg += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + charSize * 0.35}" text-anchor="middle" font-family="${fontFamily}" font-size="${charSize}" font-weight="500" fill="#1E293B">${escapeXml(ch)}</text>`;
    }
  }

  // Target count at bottom
  svg += `<text x="${W / 2}" y="${startY + availH + 15}" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" fill="#94A3B8">Total '${escapeXml(vs.target)}' to find: ${vs.targetPositions.length}</text>`;

  return svg;
}

// ========== MODE 23: PIXEL ART ==========
function renderPixelArtMode(config: WorksheetConfig, data: WorksheetData): string {
  const pa = data.pixelArtData!;
  const startY = MARGIN + 88;
  const availH = H - startY - MARGIN - 45;
  const availW = W - MARGIN * 2;
  const gridSize = pa.gridSize;

  // Color key at top
  const keyH = 35;
  const keyItemW = availW / pa.colorKey.length;
  let svg = '';

  pa.colorKey.forEach((ck, i) => {
    const kx = MARGIN + i * keyItemW + keyItemW / 2;
    const ky = startY + keyH / 2;
    const swatchFill = config.pixelArtBW ? 'none' : ck.color;
    const swatchStroke = config.pixelArtBW ? '#1E293B' : ck.color;
    svg += `<rect x="${kx - 25}" y="${ky - 10}" width="18" height="18" rx="5" fill="${swatchFill}" stroke="${swatchStroke}" stroke-width="1.5" />`;
    svg += `<text x="${kx - 16}" y="${ky + 4}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10" font-weight="700" fill="${config.pixelArtBW ? '#1E293B' : (ck.index === 0 ? '#64748B' : 'white')}">${ck.index}</text>`;
    svg += `<text x="${kx + 2}" y="${ky + 3}" font-family="Inter, sans-serif" font-size="8" fill="#64748B">${ck.name}</text>`;
  });

  // Grid
  const drawTop = startY + keyH + 10;
  const drawH = availH - keyH - 15;
  const cellSize = Math.min(drawH / gridSize, availW / (pa.grid[0]?.length || gridSize));
  const gridW = cellSize * (pa.grid[0]?.length || gridSize);
  const gridH = cellSize * gridSize;
  const gridX = MARGIN + (availW - gridW) / 2;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < (pa.grid[r]?.length || gridSize); c++) {
      const x = gridX + c * cellSize;
      const y = drawTop + r * cellSize;
      const colorIdx = pa.grid[r]?.[c] || 0;

      svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="none" stroke="#CBD5E1" stroke-width="0.5" />`;

      // Number in cell
      const fontSize = Math.min(cellSize * 0.45, 14);
      svg += `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="600" fill="#64748B">${colorIdx}</text>`;
    }
  }

  // Outer border
  svg += `<rect x="${gridX}" y="${drawTop}" width="${gridW}" height="${gridH}" fill="none" stroke="#1E293B" stroke-width="2" rx="2" />`;

  return svg;
}
