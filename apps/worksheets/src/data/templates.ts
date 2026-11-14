import { WorksheetConfig, WorksheetMode } from '@/lib/shapes';
import { defaultConfig, ageBandConfig, AgeBand } from '@/lib/defaultConfig';
import { agePresetForMode } from '@/lib/grading';

export type Goal =
  | 'letter-reversals'
  | 'pre-writing-strokes'
  | 'scissor-skills'
  | 'attention-scanning'
  | 'handwriting-practice'
  | 'copying-patterns';

export type Language = 'en' | 'zh' | 'bilingual';

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'letter-reversals', label: 'Letter reversals (b, d, p, q)' },
  { value: 'pre-writing-strokes', label: 'Pre-writing strokes' },
  { value: 'scissor-skills', label: 'Scissor skills' },
  { value: 'attention-scanning', label: 'Attention and scanning' },
  { value: 'handwriting-practice', label: 'Handwriting practice' },
  { value: 'copying-patterns', label: 'Copying and patterns' },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English worksheets' },
];

export interface Template {
  id: string;
  /** Parent-friendly title shown on the card. */
  title: string;
  /** Clinical term, used by the "All worksheet types" professional filter. */
  clinicalName: string;
  /** Short skill tag shown in small text on the card. */
  skillTag: string;
  mode: WorksheetMode;
  ageBand: AgeBand;
  language: Language;
  goals: Goal[];
  /** Config overrides applied on top of defaultConfig + ageBand defaults. */
  overrides: Partial<WorksheetConfig>;
}

export const TEMPLATES: Template[] = [
  {
    id: 'find-shapes',
    title: 'Find the Hidden Shapes',
    clinicalName: 'Figure-Ground / Visual Discrimination',
    skillTag: 'Visual scanning',
    mode: 'find',
    ageBand: '5-6',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: {},
  },
  {
    id: 'find-animals',
    title: 'Animal Search',
    clinicalName: 'Visual Discrimination (emoji)',
    skillTag: 'Attention',
    mode: 'find',
    ageBand: '3-4',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: { useEmoji: true, emojiTheme: 'animals' },
  },
  {
    id: 'match-pattern',
    title: 'Match the Pattern',
    clinicalName: 'Pattern Matching / Visual Sequencing',
    skillTag: 'Visual sequencing',
    mode: 'pattern',
    ageBand: '7-8',
    language: 'en',
    goals: ['copying-patterns'],
    overrides: { gridSize: 3 },
  },
  {
    id: 'count-shapes',
    title: 'Find and Count',
    clinicalName: 'Visual Counting / Form Constancy',
    skillTag: 'Counting',
    mode: 'count',
    ageBand: '5-6',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: { gridSize: 4 },
  },
  {
    id: 'copy-pattern',
    title: 'Copy the Picture',
    clinicalName: 'Visual-Motor Copying',
    skillTag: 'Visual-motor',
    mode: 'copy',
    ageBand: '5-6',
    language: 'en',
    goals: ['copying-patterns'],
    overrides: { exerciseCount: 4 },
  },
  {
    id: 'what-next',
    title: 'What Comes Next?',
    clinicalName: 'Visual Sequencing',
    skillTag: 'Sequencing',
    mode: 'sequence',
    ageBand: '7-8',
    language: 'en',
    goals: ['copying-patterns'],
    overrides: { exerciseCount: 5 },
  },
  {
    id: 'odd-one-out',
    title: 'Spot the Odd One',
    clinicalName: 'Visual Discrimination (Odd One Out)',
    skillTag: 'Discrimination',
    mode: 'oddOneOut',
    ageBand: '5-6',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: { oddOneOutType: 'shapes' },
  },
  {
    id: 'letter-reversal-bd',
    title: 'Letter Reversals (b, d)',
    clinicalName: 'Letter Reversal Discrimination',
    skillTag: 'Letter reversals',
    mode: 'oddOneOut',
    ageBand: '7-8',
    language: 'en',
    goals: ['letter-reversals'],
    overrides: { oddOneOutType: 'letters', oddOneOutCustomTarget: 'b' },
  },
  {
    id: 'mirror-image',
    title: 'Mirror Image',
    clinicalName: 'Visual Spatial / Mirroring',
    skillTag: 'Spatial',
    mode: 'mirror',
    ageBand: '7-8',
    language: 'en',
    goals: ['copying-patterns'],
    overrides: { gridSize: 3, exerciseCount: 4 },
  },
  {
    id: 'figure-ground',
    title: 'Hidden Shapes',
    clinicalName: 'Figure-Ground',
    skillTag: 'Figure-ground',
    mode: 'figureGround',
    ageBand: '5-6',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: {},
  },
  {
    id: 'visual-closure',
    title: 'Complete the Shape',
    clinicalName: 'Visual Closure',
    skillTag: 'Visual closure',
    mode: 'closure',
    ageBand: '7-8',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: { exerciseCount: 5 },
  },
  {
    id: 'trace-name',
    title: 'Trace My Name',
    clinicalName: 'Name Writing / Tracing',
    skillTag: 'Name writing',
    mode: 'traceName',
    ageBand: '3-4',
    language: 'en',
    goals: ['handwriting-practice'],
    overrides: { childName: 'Emma' },
  },
  {
    id: 'handwriting-en',
    title: 'Handwriting Practice',
    clinicalName: 'Handwriting (Tri-line)',
    skillTag: 'Handwriting',
    mode: 'handwriting',
    ageBand: '5-6',
    language: 'en',
    goals: ['handwriting-practice'],
    overrides: { handwritingLayout: 'triline', handwritingText: 'Hello world', handwritingSubMode: 'sentence', handwritingPaperStyle: 'triline', handwritingLineMode: '3-line' },
  },
  {
    id: 'handwriting-hk',
    title: 'Handwriting (HK 4-line)',
    clinicalName: 'Handwriting (4-line)',
    skillTag: 'Handwriting',
    mode: 'handwriting',
    ageBand: '5-6',
    language: 'en',
    goals: ['handwriting-practice'],
    overrides: { handwritingLayout: 'fourline', handwritingText: 'The quick fox', handwritingSubMode: 'sentence', handwritingPaperStyle: 'triline', handwritingLineMode: '4-line' },
  },
  {
    id: 'handwriting-zh',
    title: '中文寫字 Practice',
    clinicalName: 'Chinese Handwriting (Grid)',
    skillTag: 'Chinese writing',
    mode: 'handwriting',
    ageBand: '5-6',
    language: 'zh',
    goals: ['handwriting-practice'],
    overrides: { handwritingLayout: 'gridbox', handwritingText: '你好世界', handwritingSubMode: 'sentence', handwritingPaperStyle: 'gridbox' },
  },
  {
    id: 'maze',
    title: 'Find Your Way',
    clinicalName: 'Maze / Visual-Motor Planning',
    skillTag: 'Planning',
    mode: 'maze',
    ageBand: '7-8',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: { mazeSize: 'medium', mazeShape: 'square' },
  },
  {
    id: 'connect-dots',
    title: 'Connect the Dots',
    clinicalName: 'Dot-to-Dot / Pre-writing',
    skillTag: 'Pre-writing',
    mode: 'connectDots',
    ageBand: '5-6',
    language: 'en',
    goals: ['pre-writing-strokes'],
    overrides: { connectDotsShape: 'star' },
  },
  {
    id: 'pre-writing-strokes',
    title: 'Pre-writing Strokes',
    clinicalName: 'Tracing Paths / Pre-writing',
    skillTag: 'Pre-writing',
    mode: 'tracingPaths',
    ageBand: '3-4',
    language: 'en',
    goals: ['pre-writing-strokes'],
    overrides: { tracingStrokeType: 'mixed', tracingRows: 4, tracingThickness: 'medium' },
  },
  {
    id: 'scissor-skills',
    title: 'Cutting Lines',
    clinicalName: 'Scissor Skills',
    skillTag: 'Scissor skills',
    mode: 'scissorSkills',
    ageBand: '3-4',
    language: 'en',
    goals: ['scissor-skills'],
    overrides: { scissorLineType: 'mixed', scissorLineCount: 6 },
  },
  {
    id: 'letter-hunt',
    title: 'Letter Hunt: Find b',
    clinicalName: 'Visual Scanning (Cancellation)',
    skillTag: 'Letter reversals',
    mode: 'visualScanning',
    ageBand: '7-8',
    language: 'en',
    goals: ['letter-reversals', 'attention-scanning'],
    overrides: { visualScanTarget: 'b', visualScanDensity: 'medium', visualScanCharSize: 'medium' },
  },
  {
    id: 'number-hunt',
    title: 'Number Hunt',
    clinicalName: 'Visual Scanning (Cancellation)',
    skillTag: 'Scanning',
    mode: 'visualScanning',
    ageBand: '5-6',
    language: 'en',
    goals: ['attention-scanning'],
    overrides: { visualScanTarget: '5', visualScanDensity: 'small', visualScanCharSize: 'large' },
  },
  {
    id: 'pixel-art',
    title: 'Color by Grid',
    clinicalName: 'Pixel Art / Visual-Motor',
    skillTag: 'Visual-motor',
    mode: 'pixelArt',
    ageBand: '7-8',
    language: 'en',
    goals: ['copying-patterns'],
    overrides: { pixelArtTheme: 'rainbow' },
  },
];

/** Build a full WorksheetConfig for a template:
 *  defaults → age band (difficulty) → age grading presets (scope) → overrides.
 *  Template overrides come last on purpose — a curated template is a
 *  deliberate choice that beats the generic age grading. */
export function templateConfig(t: Template): WorksheetConfig {
  return {
    ...defaultConfig,
    ...ageBandConfig(t.ageBand),
    ...agePresetForMode(t.mode, t.ageBand),
    ...t.overrides,
    mode: t.mode,
  };
}

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export const ageBandLabel: Record<AgeBand, string> = {
  '3-4': 'Ages 3-4',
  '5-6': 'Ages 5-6',
  '7-8': 'Ages 7-8',
};
