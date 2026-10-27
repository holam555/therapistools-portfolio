import { WorksheetConfig, BASIC_SHAPES } from '@/lib/shapes';

/**
 * Shared default worksheet config. Previously lived inline in Index.tsx.
 * Extracted so the gallery templates and the editor can both build configs
 * from a single source of truth. The worksheet generation engine is untouched.
 */
export const defaultConfig: WorksheetConfig = {
  mode: 'find',
  gridSize: 3,
  shapeSet: 'custom',
  selectedShapes: [...BASIC_SHAPES],
  difficulty: 'easy',
  challenge: 'standard',
  childName: '',
  childAge: null,
  showGridLines: true,
  useColor: true,
  showAnswerKey: false,
  showReward: true,
  cornerDoodles: true,
  exerciseCount: 5,
  customInstruction: '',
  borderStyle: 'plain',
  headerFontSize: 'medium',
  headerBold: false,
  oddOneOutType: 'shapes',
  oddOneOutCustomTarget: '',
  handwritingText: '',
  handwritingRows: 6,
  handwritingPaperStyle: 'triline',
  handwritingFontSize: 'large',
  handwritingFontSizeMm: 15,
  handwritingFont: 'print',
  handwritingSubMode: 'sentence',
  handwritingWords: '',
  handwritingShowHighlight: true,
  handwritingShowColoredLines: true,
  handwritingLineColor: 'red',
  handwritingHighlightColor: 'blue',
  handwritingLineMode: '3-line',
  wordBoxDisplayMode: 'boxOnly',
  handwritingLayout: 'triline',
  handwritingShowStartEnd: false,
  instructionFontSize: 'medium',
  instructionBold: false,
  nameDateFontSize: 'medium',
  mazeSize: 'medium',
  mazeShape: 'square',
  mazeShowSolution: false,
  connectDotsShape: 'star',
  tracingStrokeType: 'mixed',
  tracingRows: 4,
  tracingThickness: 'medium',
  scissorLineType: 'mixed',
  scissorLineCount: 6,
  visualScanTarget: 'b',
  visualScanDensity: 'medium',
  visualScanFontStyle: 'standard',
  visualScanCharSize: 'medium',
  visualScanTargetCount: 'few',
  pixelArtTheme: 'heart',
  pixelArtBW: false,
  useEmoji: false,
  emojiTheme: 'animals',
};

export type AgeBand = '3-4' | '5-6' | '7-8';

export const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: '3-4', label: 'Ages 3-4' },
  { value: '5-6', label: 'Ages 5-6' },
  { value: '7-8', label: 'Ages 7-8' },
];

/**
 * Age is the single most important input — it drives difficulty defaults.
 * The ladder is complete on purpose (easy → medium → HARD): when 5–6 and 7–8
 * both defaulted to medium, the modes that grade through difficulty alone
 * (connect-dots, figure-ground, pixel art, trace-name) produced identical
 * sheets for both bands. Compatible with the age caps (age<=3 → easy only,
 * age<=5 → easy/medium, age>5 → all).
 */
export function ageBandConfig(band: AgeBand): Partial<WorksheetConfig> {
  // cornerDoodles: decoration reads as babyish to 7–8s, so the oldest band
  // defaults it off (eagerly, like difficulty — the user can re-toggle after).
  switch (band) {
    case '3-4':
      return { childAge: 4, difficulty: 'easy', cornerDoodles: true };
    case '5-6':
      return { childAge: 6, difficulty: 'medium', cornerDoodles: true };
    case '7-8':
      return { childAge: 8, difficulty: 'hard', cornerDoodles: false };
  }
}

/** Best-effort reverse map: concrete childAge → age band (for the editor selector). */
export function childAgeToBand(age: number | null): AgeBand {
  if (age === null) return '5-6';
  if (age <= 4) return '3-4';
  if (age <= 6) return '5-6';
  return '7-8';
}
