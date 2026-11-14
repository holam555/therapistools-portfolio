export type ShapeName = 'circle' | 'square' | 'triangle' | 'cross' | 'diamond' | 'star' | 'rectangle' | 'oval' | 'heart' | 'arrow' | 'hexagon' | 'pentagon';

export const ALL_SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'cross', 'diamond', 'star', 'rectangle', 'oval', 'heart', 'arrow', 'hexagon', 'pentagon'];
export const BASIC_SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'cross'];
export const EXTENDED_SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'cross', 'diamond', 'star', 'rectangle', 'oval'];

export const SHAPE_COLORS: Record<ShapeName, string> = {
  circle: '#3B82F6',
  square: '#EF4444',
  triangle: '#22C55E',
  cross: '#F59E0B',
  diamond: '#8B5CF6',
  star: '#EC4899',
  rectangle: '#06B6D4',
  oval: '#F97316',
  heart: '#F43F5E',
  arrow: '#6366F1',
  hexagon: '#14B8A6',
  pentagon: '#A855F7',
};

export type WorksheetMode = 'find' | 'pattern' | 'count' | 'copy' | 'sequence' | 'oddOneOut' | 'mirror' | 'figureGround' | 'closure' | 'traceName' | 'handwriting' | 'maze' | 'connectDots' | 'tracingPaths' | 'scissorSkills' | 'visualScanning' | 'pixelArt';
export type MazeSize = 'small' | 'medium' | 'large';
export type MazeShape = 'square' | 'rectangle' | 'circle';
export type ConnectDotsShape = 'star' | 'heart' | 'house' | 'fish' | 'sun' | 'butterfly' | 'rocket' | 'tree' | 'catFace' | 'flower';
export type OddOneOutType = 'shapes' | 'letters' | 'numbers';
export type TracingStrokeType = 'vertical' | 'horizontal' | 'diagonal' | 'curved' | 'waves' | 'zigzag' | 'spiral' | 'loops' | 'mixed';
export type TracingThickness = 'thick' | 'medium' | 'thin';
export type ScissorLineType = 'straight' | 'wavy' | 'zigzag' | 'mixed';

export type VisualScanDensity = 'small' | 'medium' | 'large';
export type VisualScanFontStyle = 'standard' | 'dyslexia';
export type VisualScanCharSize = 'large' | 'medium' | 'small';
export type PixelArtTheme = 'heart' | 'smiley' | 'star' | 'catFace' | 'fish' | 'house' | 'sun' | 'flower' | 'rainbow' | 'rocket';
export type GridSize = 2 | 3 | 4 | 5;
export type ShapeSet = 'basic' | 'extended' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';
/** Parent-facing nudge relative to the age default ("she's 5 but this is too
 *  easy"). Resolved into difficulty + scope presets by lib/grading.ts. */
export type ChallengeLevel = 'easier' | 'standard' | 'harder';
export type BorderStyle = 'plain' | 'dotted' | 'rounded';
export type HeaderFontSize = 'small' | 'medium' | 'large';
export type HandwritingPaperStyle = 'triline' | 'gridbox';
export type HandwritingFontSize = 'large' | 'medium' | 'small';
export type HandwritingFont = 'print' | 'cursive';
export type HandwritingSubMode = 'sentence' | 'wordBoxes';
export type HandwritingLineColor = 'red' | 'blue' | 'green' | 'black';
export type HandwritingHighlightColor = 'blue' | 'yellow' | 'green' | 'pink' | 'none';
export type HandwritingLineMode = '3-line' | '4-line';
export type WordBoxDisplayMode = 'boxOnly' | 'trilineOnly' | 'both';
export type HandwritingLayout = 'triline' | 'fourline' | 'wordbox' | 'gridbox' | 'triline-wordbox' | 'fourline-wordbox';
export type InstructionFontSize = 'small' | 'medium' | 'large';
export type EmojiTheme = 'animals' | 'food' | 'transport' | 'nature' | 'faces' | 'dinosaurs' | 'space' | 'ocean' | 'cars' | 'halloween' | 'christmas';

export const EMOJI_THEMES: Record<EmojiTheme, { icon: string; label: string; emojis: string[] }> = {
  // Curated packs (print-optimised, 6 emoji each)
  animals:   { icon: '🐶', label: 'Animals',   emojis: ['🐶', '🐱', '🐸', '🐼', '🐨', '🦊'] },
  food:      { icon: '🍕', label: 'Food',       emojis: ['🍕', '🍔', '🍦', '🍓', '🍩', '🌮'] },
  dinosaurs: { icon: '🦕', label: 'Dinosaurs',  emojis: ['🦕', '🦖', '🥚', '🦴', '🌋', '🪨'] },
  space:     { icon: '🚀', label: 'Space',      emojis: ['🚀', '⭐', '🪐', '🌙', '👨‍🚀', '☄️'] },
  ocean:     { icon: '🐠', label: 'Ocean',      emojis: ['🐠', '🐙', '🦀', '🐚', '🐋', '🦈'] },
  cars:      { icon: '🚗', label: 'Cars',       emojis: ['🚗', '🚕', '🚙', '🏎️', '🚓', '🚑'] },
  halloween: { icon: '🎃', label: 'Halloween',  emojis: ['🎃', '👻', '🕷️', '🦇', '🧟', '🕯️'] },
  christmas: { icon: '🎄', label: 'Christmas',  emojis: ['🎄', '🎅', '⭐', '🎁', '🦌', '❄️'] },
  // Generic themes (accessible via Custom picker)
  transport: { icon: '🚌', label: 'Transport',  emojis: ['🚗', '🚌', '🚂', '✈️', '🚲', '🚀', '🛸', '🚁', '⛵', '🚒'] },
  nature:    { icon: '🌸', label: 'Nature',     emojis: ['🌸', '🌻', '🌈', '⭐', '🌙', '☀️', '🍀', '🌊', '🌵', '🦋'] },
  faces:     { icon: '😀', label: 'Faces',      emojis: ['😀', '😢', '😡', '😴', '🤔', '😎', '🥳', '😱', '🤗', '😅'] },
};

// Modes that support emoji
export const EMOJI_ELIGIBLE_MODES: WorksheetMode[] = ['find', 'oddOneOut', 'count', 'sequence'];

// Modes that may carry corner doodles (B3 decoration). Perception/matching
// sheets (find, count, figureGround, oddOneOut, mirror, closure, sequence,
// pattern, copy, visualScanning) are deliberately EXCLUDED: an extra outline
// there can be mistaken for task content and sabotage the exercise. Only the
// handwriting/motor family — where decoration can never be an answer — is in.
export const CORNER_DOODLE_MODES: WorksheetMode[] = [
  'handwriting', 'traceName', 'tracingPaths', 'scissorSkills', 'connectDots', 'maze',
];

export interface WorksheetConfig {
  mode: WorksheetMode;
  gridSize: GridSize;
  shapeSet: ShapeSet;
  selectedShapes: ShapeName[];
  difficulty: Difficulty;
  challenge: ChallengeLevel;
  childName: string;
  childAge: number | null;
  showGridLines: boolean;
  useColor: boolean;
  showAnswerKey: boolean;
  /** "I did it!" self-monitoring reward row in the footer (line-art). */
  showReward: boolean;
  /** Colourable outline doodles in the sheet corners — CORNER_DOODLE_MODES
   *  only (renderer also gates); defaults ON for ages 3–6, OFF for 7–8. */
  cornerDoodles: boolean;
  exerciseCount: number;
  customInstruction: string;
  borderStyle: BorderStyle;
  headerFontSize: HeaderFontSize;
  headerBold: boolean;
  oddOneOutType: OddOneOutType;
  oddOneOutCustomTarget: string;
  handwritingText: string;
  handwritingRows: number;
  handwritingPaperStyle: HandwritingPaperStyle;
  handwritingFontSize: HandwritingFontSize;
  handwritingFontSizeMm: number;
  handwritingFont: HandwritingFont;
  handwritingSubMode: HandwritingSubMode;
  handwritingWords: string;
  handwritingShowHighlight: boolean;
  handwritingShowColoredLines: boolean;
  handwritingLineColor: HandwritingLineColor;
  handwritingHighlightColor: HandwritingHighlightColor;
  handwritingLineMode: HandwritingLineMode;
  wordBoxDisplayMode: WordBoxDisplayMode;
  handwritingLayout: HandwritingLayout;
  handwritingShowStartEnd: boolean;
  instructionFontSize: InstructionFontSize;
  instructionBold: boolean;
  nameDateFontSize: HeaderFontSize;
  mazeSize: MazeSize;
  mazeShape: MazeShape;
  mazeShowSolution: boolean;
  connectDotsShape: ConnectDotsShape;
  tracingStrokeType: TracingStrokeType;
  tracingRows: number;
  tracingThickness: TracingThickness;
  scissorLineType: ScissorLineType;
  scissorLineCount: number;
  visualScanTarget: string;
  visualScanDensity: VisualScanDensity;
  visualScanFontStyle: VisualScanFontStyle;
  visualScanCharSize: VisualScanCharSize;
  visualScanTargetCount: 'few' | 'many';
  pixelArtTheme: PixelArtTheme;
  pixelArtBW: boolean;
  useEmoji: boolean;
  emojiTheme: EmojiTheme;
}

export interface CellData {
  shape: ShapeName;
  isTarget?: boolean;
  isBlank?: boolean;
  rotation?: number;
  emoji?: string;
}

export interface PatternPuzzle {
  pattern: CellData[][];
  options: CellData[][][];
  correctIndex: number;
}

export interface CountPuzzle {
  grid: CellData[][];
  targetShapes: ShapeName[];
  counts: Record<ShapeName, number>;
}

export interface CopyPuzzle {
  sourceGrid: CellData[][];
}

export interface SequencePuzzle {
  sequence: CellData[];
  answer: CellData;
  options: CellData[];
  correctIndex: number;
}

export interface OddOneOutRow {
  items: CellData[];
  oddIndex: number;
  textItems?: string[];
  oddText?: string;
}

export interface TraceNameData {
  letters: string[];
  sections: string[][];
}

export interface MirrorPuzzle {
  sourceGrid: (CellData | null)[][];
  mirroredGrid: (CellData | null)[][];
}

export interface FigureGroundPuzzle {
  shapes: { shape: ShapeName; cx: number; cy: number; r: number; rotation: number }[];
  targetShapes: ShapeName[];
  counts: Record<ShapeName, number>;
}

export interface ClosurePuzzle {
  shape: ShapeName;
  dashArray: string;
  options: ShapeName[];
  correctIndex: number;
}

export interface MazeCell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
}

export interface MazeData {
  grid: MazeCell[][];
  rows: number;
  cols: number;
  shape: MazeShape;
  solution: [number, number][];
}

export interface ConnectDotsData {
  dots: { x: number; y: number; index: number }[];
  shapeName: ConnectDotsShape;
  completedPath: string;
}

export interface TracingPathsData {
  rows: { pathD: string; startX: number; startY: number; endX: number; endY: number; strokeType: string }[];
}

export interface ScissorSkillsData {
  lines: { pathD: string; startX: number; startY: number }[];
}
export interface VisualScanData {
  grid: string[][];
  target: string;
  targetPositions: [number, number][];
  rows: number;
  cols: number;
}

export interface PixelArtData {
  grid: number[][];
  colorKey: { index: number; color: string; name: string }[];
  gridSize: number;
}

export interface WorksheetData {
  mode: WorksheetMode;
  instructions: string;
  skillLabel: string;
  targetShape?: ShapeName;
  grid?: CellData[][];
  patternPuzzles?: PatternPuzzle[];
  countPuzzle?: CountPuzzle;
  copyPuzzles?: CopyPuzzle[];
  sequencePuzzles?: SequencePuzzle[];
  oddOneOutRows?: OddOneOutRow[];
  mirrorPuzzles?: MirrorPuzzle[];
  figureGroundPuzzle?: FigureGroundPuzzle;
  closurePuzzles?: ClosurePuzzle[];
  traceNameData?: TraceNameData;
  handwritingData?: HandwritingData;
  mazeData?: MazeData;
  connectDotsData?: ConnectDotsData;
  tracingPathsData?: TracingPathsData;
  scissorSkillsData?: ScissorSkillsData;
  visualScanData?: VisualScanData;
  pixelArtData?: PixelArtData;
}

export interface HandwritingData {
  text: string;
  rows: number;
  paperStyle: HandwritingPaperStyle;
  fontSize: HandwritingFontSize;
  fontSizeMm: number;
  font: HandwritingFont;
  subMode: HandwritingSubMode;
  words: string[];
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function getDifficultyRotation(difficulty: Difficulty): number {
  if (difficulty === 'hard') return [0, 15, 30, 45, 90, 180][Math.floor(Math.random() * 6)];
  if (difficulty === 'medium') return [0, 0, 0, 45][Math.floor(Math.random() * 4)];
  return 0;
}

// Rotation deltas that are VISIBLY different for each shape. Shapes with
// rotational symmetry (circle: any angle; square/cross: 90°; oval/rectangle/
// diamond: 90–180°) must not use symmetric angles or the odd-one-out row
// becomes unsolvable — the "odd" item looks identical to the others.
const VISIBLE_ROTATIONS: Record<ShapeName, number[]> = {
  circle: [],
  oval: [45, 90],
  square: [15, 30, 45],
  rectangle: [45, 90],
  triangle: [15, 30, 45, 90, 180],
  cross: [15, 30, 45],
  diamond: [15, 30],
  star: [15, 30, 45],
  heart: [15, 30, 45, 90, 180],
  arrow: [15, 30, 45, 90, 180],
  hexagon: [15, 30, 45],
  pentagon: [15, 30, 45],
};

const SIMILAR_SHAPES: Partial<Record<ShapeName, ShapeName[]>> = {
  circle: ['oval'],
  oval: ['circle'],
  square: ['rectangle', 'diamond'],
  rectangle: ['square'],
  diamond: ['square'],
  triangle: ['diamond', 'pentagon'],
  star: ['cross'],
  cross: ['star'],
  heart: ['diamond'],
  arrow: ['triangle'],
  hexagon: ['pentagon'],
  pentagon: ['hexagon', 'triangle'],
};

function getSimilarDistractors(target: ShapeName, shapes: ShapeName[], difficulty: Difficulty): ShapeName[] {
  if (difficulty === 'hard') {
    const similar = SIMILAR_SHAPES[target] ?? [];
    const available = similar.filter(s => shapes.includes(s));
    if (available.length > 0) return available;
  }
  return shapes.filter(s => s !== target);
}

function getActiveShapes(config: WorksheetConfig): ShapeName[] {
  return config.selectedShapes.length >= 2 ? config.selectedShapes : BASIC_SHAPES;
}

// ========== MODE 1: FIND THE SHAPE ==========
function generateFindMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const size = config.gridSize;
  const totalCells = size * size;

  const targetShape = randomFrom(shapes);
  const targetRatio = config.difficulty === 'easy' ? 0.4 : config.difficulty === 'medium' ? 0.25 : 0.15;
  const targetCount = Math.max(2, Math.round(totalCells * targetRatio));

  const distractorPool = config.difficulty === 'hard'
    ? getSimilarDistractors(targetShape, shapes, 'hard').concat(shapes.filter(s => s !== targetShape))
    : shapes.filter(s => s !== targetShape);

  const cells: CellData[] = [];
  for (let i = 0; i < targetCount; i++) {
    cells.push({ shape: targetShape, isTarget: true, rotation: 0 });
  }
  for (let i = targetCount; i < totalCells; i++) {
    cells.push({
      shape: randomFrom(distractorPool),
      isTarget: false,
      rotation: getDifficultyRotation(config.difficulty),
    });
  }

  const shuffled = shuffle(cells);
  const grid: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    grid.push(shuffled.slice(r * size, (r + 1) * size));
  }

  return {
    mode: 'find',
    instructions: `Find every ${targetShape} and put a tick on each one!`,
    skillLabel: 'Visual Discrimination',
    targetShape,
    grid,
  };
}

// ========== MODE 3: MATCH PATTERN ==========
function generatePatternMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const puzzleCount = config.exerciseCount;
  const gridN = config.gridSize; // 2, 3, 4, or 5 — drives N×N pattern size
  const cellCount = gridN * gridN;

  const puzzles: PatternPuzzle[] = [];
  for (let p = 0; p < puzzleCount; p++) {
    const patternShapes = pickN(shapes, Math.min(cellCount, shapes.length));

    // Build an N×N grid
    const flatCells: CellData[] = [];
    for (let i = 0; i < cellCount; i++) {
      flatCells.push({
        shape: patternShapes[i % patternShapes.length],
        rotation: getDifficultyRotation(config.difficulty),
      });
    }
    const pattern: CellData[][] = [];
    for (let r = 0; r < gridN; r++) {
      pattern.push(flatCells.slice(r * gridN, (r + 1) * gridN));
    }

    const correct: CellData[][] = pattern.map(row => row.map(c => ({ ...c })));

    const distractors: CellData[][][] = [];
    for (let d = 0; d < 2; d++) {
      if (config.difficulty === 'hard') {
        const dr = Math.floor(Math.random() * gridN);
        const dc = Math.floor(Math.random() * gridN);
        const origShape = pattern[dr][dc].shape;
        const similar = getSimilarDistractors(origShape, shapes, 'hard');
        const replacement = similar.length > 0 ? randomFrom(similar) : randomFrom(shapes.filter(s => s !== origShape));
        const distractor: CellData[][] = pattern.map(row => row.map(c => ({ ...c })));
        distractor[dr][dc] = { shape: replacement, rotation: getDifficultyRotation('hard') };
        distractors.push(distractor);
      } else {
        const distractor: CellData[][] = pattern.map(row => row.map(c => ({ ...c })));
        const swapCount = config.difficulty === 'easy' ? 2 : 1;
        for (let s = 0; s < swapCount; s++) {
          const dr = Math.floor(Math.random() * gridN);
          const dc = Math.floor(Math.random() * gridN);
          distractor[dr][dc] = { shape: randomFrom(shapes.filter(sh => sh !== distractor[dr][dc].shape)) };
        }
        distractors.push(distractor);
      }
    }

    const options = [correct, ...distractors];
    const indices = shuffle([0, 1, 2]);
    const shuffledOptions = indices.map(i => options[i]);
    const newCorrectIndex = indices.indexOf(0);

    puzzles.push({
      pattern,
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
    });
  }

  return {
    mode: 'pattern',
    instructions: 'Circle the letter (A, B or C) that matches each pattern!',
    skillLabel: 'Pattern Recognition',
    patternPuzzles: puzzles,
  };
}

// ========== MODE 4: FIND AND COUNT ==========
// Grid size drives everything: N×N = N reference shapes + N² cells
function generateCountMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const N = config.gridSize; // 2, 3, 4, or 5
  const ROWS = N;
  const COLS = N;
  const totalCells = ROWS * COLS;

  // N reference shapes to count, matching the grid size
  const targetCount = Math.min(N, shapes.length);
  const targetShapes = pickN(shapes, targetCount);

  // Hard mode adds distractors; easy/medium use only target shapes
  const pool = config.difficulty === 'hard'
    ? [...targetShapes, ...shapes.filter(s => !targetShapes.includes(s))]
    : targetShapes;

  const cells: CellData[] = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push({
      shape: randomFrom(pool),
      rotation: getDifficultyRotation(config.difficulty),
    });
  }

  const shuffled = shuffle(cells);
  const grid: CellData[][] = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(shuffled.slice(r * COLS, (r + 1) * COLS));
  }

  const counts: Record<string, number> = {};
  targetShapes.forEach(s => counts[s] = 0);
  grid.forEach(row => row.forEach(cell => {
    if (counts[cell.shape] !== undefined) counts[cell.shape]++;
  }));

  return {
    mode: 'count',
    instructions: 'Count each shape and write the number in its box!',
    skillLabel: 'Visual Scanning · Figure-Ground',
    countPuzzle: {
      grid,
      targetShapes,
      counts: counts as Record<ShapeName, number>,
    },
  };
}

// ========== MODE 5: COPY THE PATTERN ==========
function generateCopyMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const gridSize = config.gridSize;
  const puzzleCount = config.exerciseCount;

  // Difficulty controls the palette size (fewer distinct shapes = easier to
  // hold in visual memory while copying) on top of the rotation that
  // getDifficultyRotation already adds for medium/hard.
  const paletteSize = config.difficulty === 'easy'
    ? Math.min(2, shapes.length)
    : config.difficulty === 'medium'
      ? Math.min(3, shapes.length)
      : shapes.length;

  const puzzles: CopyPuzzle[] = [];
  for (let p = 0; p < puzzleCount; p++) {
    const palette = pickN(shapes, Math.max(2, paletteSize));
    const cells: CellData[][] = [];
    for (let r = 0; r < gridSize; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < gridSize; c++) {
        row.push({
          shape: randomFrom(palette),
          rotation: getDifficultyRotation(config.difficulty),
        });
      }
      cells.push(row);
    }
    puzzles.push({ sourceGrid: cells });
  }

  return {
    mode: 'copy',
    instructions: 'Copy each pattern into the empty grid on the right!',
    skillLabel: 'Visual Motor Integration · Spatial Relations',
    copyPuzzles: puzzles,
  };
}

// ========== MODE 6: WHAT COMES NEXT ==========
function generateSequenceMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const puzzles: SequencePuzzle[] = [];
  const puzzleCount = config.exerciseCount;

  // Medium mixes period-2 and period-3 rows, but an all-period-2 sheet is
  // indistinguishable from easy. Guarantee at least one period-3 row: force
  // the last row to period 3 if none was drawn yet.
  let mediumHasPeriod3 = false;

  for (let p = 0; p < puzzleCount; p++) {
    let patternLen: number;
    if (config.difficulty === 'easy') {
      patternLen = 2;
    } else if (config.difficulty === 'medium') {
      const isLast = p === puzzleCount - 1;
      patternLen = isLast && !mediumHasPeriod3 ? 3 : randomFrom([2, 3]);
      if (patternLen === 3) mediumHasPeriod3 = true;
    } else {
      patternLen = 3;
    }

    const patternShapes = pickN(shapes, Math.min(patternLen, shapes.length));
    const sequence: CellData[] = [];
    for (let i = 0; i < 4; i++) {
      sequence.push({
        shape: patternShapes[i % patternShapes.length],
        rotation: getDifficultyRotation(config.difficulty),
      });
    }
    const answer: CellData = {
      shape: patternShapes[4 % patternShapes.length],
      rotation: getDifficultyRotation(config.difficulty),
    };

    // Two distinct distractors, padded from the full shape set when fewer
    // than 2 non-answer shapes are selected — options must never repeat.
    let distractorShapes = pickN(shapes.filter(s => s !== answer.shape), 2);
    if (distractorShapes.length < 2) {
      const pad = shuffle(ALL_SHAPES.filter(s => s !== answer.shape && !distractorShapes.includes(s)));
      distractorShapes = [...distractorShapes, ...pad].slice(0, 2);
    }
    const options: CellData[] = [
      answer,
      { shape: distractorShapes[0] },
      { shape: distractorShapes[1] },
    ];
    const indices = shuffle([0, 1, 2]);
    const shuffledOptions = indices.map(i => options[i]);
    const correctIndex = indices.indexOf(0);

    puzzles.push({ sequence, answer, options: shuffledOptions, correctIndex });
  }

  return {
    mode: 'sequence',
    instructions: 'What comes next? Circle A, B or C!',
    skillLabel: 'Visual Sequential Memory · Pattern Recognition',
    sequencePuzzles: puzzles,
  };
}

// ========== MODE 7: ODD ONE OUT ==========
function generateOddOneOutMode(config: WorksheetConfig): WorksheetData {
  if (config.oddOneOutType === 'letters') return generateOddOneOutLetters(config);
  if (config.oddOneOutType === 'numbers') return generateOddOneOutNumbers(config);
  return generateOddOneOutShapes(config);
}

function generateOddOneOutShapes(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const rows: OddOneOutRow[] = [];
  const rowCount = config.exerciseCount;

  for (let r = 0; r < rowCount; r++) {
    const baseShape = randomFrom(shapes);
    const baseRotation = getDifficultyRotation(config.difficulty);
    const oddIndex = Math.floor(Math.random() * 5);

    const items: CellData[] = [];
    for (let i = 0; i < 5; i++) {
      if (i === oddIndex) {
        if (config.difficulty === 'easy') {
          const diffShape = randomFrom(shapes.filter(s => s !== baseShape));
          items.push({ shape: diffShape, rotation: 0 });
        } else if (config.difficulty === 'medium') {
          const similar = getSimilarDistractors(baseShape, shapes, 'hard');
          const diffShape = similar.length > 0 ? randomFrom(similar) : randomFrom(shapes.filter(s => s !== baseShape));
          items.push({ shape: diffShape, rotation: baseRotation });
        } else {
          // Hard: same shape, visibly different rotation. Shapes where no
          // rotation is visible (e.g. circle) fall back to a similar-shape
          // substitution so the row is always solvable.
          const visibleRots = VISIBLE_ROTATIONS[baseShape];
          if (baseRotation === 0 && visibleRots.length > 0) {
            items.push({ shape: baseShape, rotation: randomFrom(visibleRots) });
          } else if (baseRotation !== 0 && visibleRots.includes(baseRotation)) {
            // Rotating back to 0 is visible only if the base rotation itself
            // is a visible delta for this shape.
            items.push({ shape: baseShape, rotation: 0 });
          } else {
            const similar = getSimilarDistractors(baseShape, shapes, 'hard');
            const diffShape = similar.length > 0 ? randomFrom(similar) : randomFrom(shapes.filter(s => s !== baseShape));
            items.push({ shape: diffShape, rotation: 0 });
          }
        }
      } else {
        items.push({ shape: baseShape, rotation: baseRotation });
      }
    }
    rows.push({ items, oddIndex });
  }

  return {
    mode: 'oddOneOut',
    instructions: 'Circle the odd one out in each row!',
    skillLabel: 'Visual Discrimination',
    oddOneOutRows: rows,
  };
}

function generateOddOneOutLetters(config: WorksheetConfig): WorksheetData {
  const SIMILAR_LETTERS: Record<string, string[]> = {
    b: ['d', 'p', 'q'], d: ['b', 'p', 'q'], p: ['b', 'd', 'q'], q: ['b', 'd', 'p'],
    E: ['F'], F: ['E'], m: ['n'], n: ['m'], M: ['N', 'W'], N: ['M'], C: ['G'], G: ['C'],
  };
  const CASE_VARIANTS: Record<string, string> = {
    a: 'A', A: 'a', b: 'B', B: 'b', c: 'C', C: 'c', d: 'D', D: 'd', e: 'E', E: 'e',
    f: 'F', F: 'f', g: 'G', G: 'g', h: 'H', H: 'h', i: 'I', I: 'i', j: 'J', J: 'j',
    k: 'K', K: 'k', l: 'L', L: 'l', m: 'M', M: 'm', n: 'N', N: 'n', o: 'O', O: 'o',
    p: 'P', P: 'p', q: 'Q', Q: 'q', r: 'R', R: 'r', s: 'S', S: 's', t: 'T', T: 't',
    u: 'U', U: 'u', v: 'V', V: 'v', w: 'W', W: 'w', x: 'X', X: 'x', y: 'Y', Y: 'y', z: 'Z', Z: 'z',
  };
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const easyPairs = [
    ['A', 'B'], ['C', 'M'], ['O', 'X'], ['P', 'W'], ['H', 'S'], ['D', 'K'], ['E', 'Z'], ['G', 'T'],
  ];
  const mediumBase = ['b', 'd', 'E', 'F', 'M', 'N', 'C', 'G'];
  // Hard rows differ only by CASE — so only letters whose upper/lower forms
  // are visually DISTINCT glyphs. c/C o/O s/S u/U v/V w/W x/X z/Z k/K j/J y/Y
  // are near-identical at worksheet size and would make the row unsolvable.
  const hardBase = 'abdefghilmnpqrt'.split('');

  const rows: OddOneOutRow[] = [];
  const rowCount = config.exerciseCount;

  const customTarget = (config.oddOneOutCustomTarget ?? '').trim();

  for (let r = 0; r < rowCount; r++) {
    const oddIndex = Math.floor(Math.random() * 5);
    let baseLetter: string;
    let oddLetter: string;

    if (customTarget.length === 1) {
      // Custom target: use it as the odd-one-out; pick a different base letter
      oddLetter = customTarget;
      const fallback = allLetters.filter(l => l !== oddLetter);
      baseLetter = fallback[r % fallback.length];
    } else if (config.difficulty === 'easy') {
      const pair = easyPairs[r % easyPairs.length];
      baseLetter = pair[0];
      oddLetter = pair[1];
    } else if (config.difficulty === 'medium') {
      baseLetter = mediumBase[r % mediumBase.length];
      const similar = SIMILAR_LETTERS[baseLetter] || [];
      oddLetter = similar.length > 0 ? randomFrom(similar) : randomFrom(allLetters.filter(l => l !== baseLetter));
    } else {
      baseLetter = hardBase[r % hardBase.length];
      oddLetter = CASE_VARIANTS[baseLetter] || baseLetter.toUpperCase();
    }

    const textItems: string[] = [];
    const items: CellData[] = [];
    for (let i = 0; i < 5; i++) {
      textItems.push(i === oddIndex ? oddLetter : baseLetter);
      items.push({ shape: 'circle' }); // placeholder
    }
    rows.push({ items, oddIndex, textItems, oddText: oddLetter });
  }

  return {
    mode: 'oddOneOut',
    instructions: 'Circle the odd letter in each row!',
    skillLabel: 'Visual Discrimination · Letter Recognition',
    oddOneOutRows: rows,
  };
}

function generateOddOneOutNumbers(config: WorksheetConfig): WorksheetData {
  const SIMILAR_NUMBERS: Record<string, string[]> = {
    '6': ['9'], '9': ['6'], '1': ['7', 'l'], '7': ['1'], '2': ['Z'], '5': ['S'], '0': ['O'], '3': ['8'], '8': ['3'],
  };
  const easyPairs = [
    ['3', '7'], ['1', '4'], ['2', '5'], ['6', '8'], ['0', '9'], ['4', '7'], ['1', '2'], ['5', '8'],
  ];
  const mediumBase = ['6', '9', '1', '7', '2', '5', '0', '3'];
  const hardPairs = [
    ['2', 'Z'], ['5', 'S'], ['0', 'O'], ['1', 'l'], ['8', 'B'], ['6', 'b'], ['9', 'q'], ['3', 'E'],
  ];

  const rows: OddOneOutRow[] = [];
  const rowCount = config.exerciseCount;

  const customTarget = (config.oddOneOutCustomTarget ?? '').trim();
  const allDigits = '0123456789'.split('');

  for (let r = 0; r < rowCount; r++) {
    const oddIndex = Math.floor(Math.random() * 5);
    let baseChar: string;
    let oddChar: string;

    if (customTarget.length === 1) {
      // Custom target: use it as the odd-one-out; pick a different base digit
      oddChar = customTarget;
      const fallback = allDigits.filter(d => d !== oddChar);
      baseChar = fallback[r % fallback.length];
    } else if (config.difficulty === 'easy') {
      const pair = easyPairs[r % easyPairs.length];
      baseChar = pair[0];
      oddChar = pair[1];
    } else if (config.difficulty === 'medium') {
      baseChar = mediumBase[r % mediumBase.length];
      const similar = SIMILAR_NUMBERS[baseChar] || [];
      oddChar = similar.length > 0 ? randomFrom(similar) : String((parseInt(baseChar) + 3) % 10);
    } else {
      const pair = hardPairs[r % hardPairs.length];
      baseChar = pair[0];
      oddChar = pair[1];
    }

    const textItems: string[] = [];
    const items: CellData[] = [];
    for (let i = 0; i < 5; i++) {
      textItems.push(i === oddIndex ? oddChar : baseChar);
      items.push({ shape: 'circle' }); // placeholder
    }
    rows.push({ items, oddIndex, textItems, oddText: oddChar });
  }

  return {
    mode: 'oddOneOut',
    instructions: 'Circle the odd number in each row!',
    skillLabel: 'Visual Discrimination · Number Recognition',
    oddOneOutRows: rows,
  };
}

// ========== MODE 8: MIRROR IMAGE ==========
function generateMirrorMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const gridSize = config.gridSize;
  // Fill a fraction of the grid so difficulty stays meaningful at every grid
  // size — a fixed count (3/5/7) collapsed to "all cells" on a 2×2 grid, so
  // easy and hard looked identical. Fraction of capacity never collapses.
  const cellCapacity = gridSize * gridSize;
  const fillFraction = config.difficulty === 'easy' ? 0.4 : config.difficulty === 'medium' ? 0.6 : 0.8;
  const shapeCount = Math.max(2, Math.min(cellCapacity - 1, Math.round(cellCapacity * fillFraction)));
  const puzzleCount = config.exerciseCount;

  const puzzles: MirrorPuzzle[] = [];
  for (let p = 0; p < puzzleCount; p++) {
    const sourceGrid: (CellData | null)[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => null)
    );

    const positions = shuffle(
      Array.from({ length: gridSize * gridSize }, (_, i) => i)
    ).slice(0, shapeCount);

    positions.forEach(pos => {
      const r = Math.floor(pos / gridSize);
      const c = pos % gridSize;
      sourceGrid[r][c] = {
        shape: randomFrom(shapes),
        rotation: getDifficultyRotation(config.difficulty),
      };
    });

    const mirroredGrid: (CellData | null)[][] = sourceGrid.map(row =>
      [...row].reverse().map(cell =>
        cell ? { ...cell } : null
      )
    );

    puzzles.push({ sourceGrid, mirroredGrid });
  }

  return {
    mode: 'mirror',
    instructions: 'Draw the mirror image on the right side!',
    skillLabel: 'Visual Spatial Relations · Form Constancy',
    mirrorPuzzles: puzzles,
  };
}

// ========== MODE 9: FIGURE GROUND ==========
function generateFigureGroundMode(config: WorksheetConfig): WorksheetData {
  const allShapes = getActiveShapes(config);
  const targetCount = config.difficulty === 'easy' ? 3 : config.difficulty === 'medium' ? 4 : 5;
  const shapeTotal = config.difficulty === 'easy' ? 6 : config.difficulty === 'medium' ? 8 : 10;
  const targetShapes = pickN(allShapes, Math.min(targetCount, allShapes.length));

  const placed: { shape: ShapeName; cx: number; cy: number; r: number; rotation: number }[] = [];
  const counts: Record<string, number> = {};
  targetShapes.forEach(s => (counts[s] = 0));

  const areaW = 400;
  const areaH = 400;

  // Effective drawn half-extent in 400-space (getShapeRawSVG draws at ≈0.4×r).
  const er = (r: number) => r * 0.4;
  // Figure-ground = pulling a figure out of a competing background, so contours
  // must cross. We build a few overlapping CLUSTERS whose centres sit on a
  // jittered grid: overlaps stay local within each cluster, and the clusters
  // spread across the whole field (easy = clusters of 1 = a sparse search).
  const clusterSize = config.difficulty === 'easy' ? 1 : config.difficulty === 'medium' ? 2 : 3;
  const nClusters = Math.ceil(shapeTotal / clusterSize);
  const gCols = Math.ceil(Math.sqrt(nClusters));
  const gRows = Math.ceil(nClusters / gCols);
  const cellW = areaW / gCols;
  const cellH = areaH / gRows;
  const cellOrder = shuffle(Array.from({ length: gCols * gRows }, (_, k) => k));
  const clusterAnchor: Record<number, { cx: number; cy: number; r: number }> = {};

  for (let i = 0; i < shapeTotal; i++) {
    const shape = randomFrom(targetShapes);
    counts[shape]++;
    // Shape size shrinks with difficulty — hard must be visibly smaller than
    // medium (it used to share medium's size pool, so only the count changed).
    const r = config.difficulty === 'easy'
      ? randomFrom([50, 60, 70])
      : config.difficulty === 'medium'
        ? randomFrom([38, 46, 55])
        : randomFrom([28, 34, 42]);
    const rotation = getDifficultyRotation(config.difficulty);
    const margin = er(r) + 8;
    const clamp = (v: number, max: number) => Math.max(margin, Math.min(max - margin, v));

    const clusterIdx = Math.floor(i / clusterSize);
    const anchor = clusterAnchor[clusterIdx];
    let cx: number;
    let cy: number;
    if (!anchor) {
      // First shape of a cluster: place at its distributed (jittered) cell.
      const cell = cellOrder[clusterIdx % cellOrder.length];
      const gx = cell % gCols;
      const gy = Math.floor(cell / gCols);
      cx = clamp(gx * cellW + cellW * (0.25 + 0.5 * Math.random()), areaW);
      cy = clamp(gy * cellH + cellH * (0.25 + 0.5 * Math.random()), areaH);
      clusterAnchor[clusterIdx] = { cx, cy, r };
    } else {
      // Later shapes overlap the cluster anchor: distance ∈ [0.45,0.8]×(er+er)
      // so outlines cross without being concentric.
      const reach = er(anchor.r) + er(r);
      const ang = Math.random() * Math.PI * 2;
      const dist = reach * (0.45 + 0.35 * Math.random());
      cx = clamp(anchor.cx + Math.cos(ang) * dist, areaW);
      cy = clamp(anchor.cy + Math.sin(ang) * dist, areaH);
    }
    placed.push({ shape, cx, cy, r, rotation });
  }

  return {
    mode: 'figureGround',
    instructions: 'Find and count each shape hiding in the picture!',
    skillLabel: 'Figure-Ground Perception',
    figureGroundPuzzle: {
      shapes: placed,
      targetShapes,
      counts: counts as Record<ShapeName, number>,
    },
  };
}

// ========== MODE 10: VISUAL CLOSURE ==========
function generateClosureMode(config: WorksheetConfig): WorksheetData {
  const shapes = getActiveShapes(config);
  const puzzleCount = config.exerciseCount;
  const puzzles: ClosurePuzzle[] = [];

  for (let i = 0; i < puzzleCount; i++) {
    const shape = randomFrom(shapes);
    // The missing-contour fraction IS the clinical grade for closure, so the
    // three levels must be visibly distinct: ~80% / ~62% / ~50% of the outline
    // present. (A computed formula with a min-gap floor used to collapse
    // easy and medium to the same dash pattern.)
    const dashArray = config.difficulty === 'easy' ? '12,3' : config.difficulty === 'medium' ? '8,5' : '6,6';

    const distractors = pickN(shapes.filter(s => s !== shape), Math.min(2, shapes.filter(s => s !== shape).length));
    const options = [shape, ...distractors];
    // Options must be distinct: with only 2 selected shapes, pad from the full
    // shape set so the correct answer never appears twice among A/B/C.
    if (options.length < 3) {
      const pad = shuffle(ALL_SHAPES.filter(s => !options.includes(s)));
      while (options.length < 3 && pad.length > 0) options.push(pad.pop()!);
    }
    const indices = shuffle([0, 1, 2]);
    const shuffledOptions = indices.map(i => options[i]);
    const correctIndex = indices.indexOf(0);

    puzzles.push({ shape, dashArray, options: shuffledOptions, correctIndex });
  }

  return {
    mode: 'closure',
    instructions: 'What shape is it? Circle the letter A, B or C!',
    skillLabel: 'Visual Closure',
    closurePuzzles: puzzles,
  };
}

// ========== MODE 11: TRACE YOUR NAME ==========
function generateTraceNameMode(config: WorksheetConfig): WorksheetData {
  // Keep the child's actual capitalization ("McKay" stays McKay). If the input
  // is all one case (emma / EMMA), normalize to the clinically standard name
  // form: capital first letter, lowercase rest.
  let name = (config.childName || 'Name').replace(/[^A-Za-z]/g, '');
  if (name && (name === name.toLowerCase() || name === name.toUpperCase())) {
    name = name[0].toUpperCase() + name.slice(1).toLowerCase();
  }
  const letters = name.split('');
  const sections: string[][] = [];
  for (let i = 0; i < letters.length; i += 5) {
    sections.push(letters.slice(i, i + 5));
  }

  return {
    mode: 'traceName',
    instructions: `Trace the letters of your name!`,
    skillLabel: 'Handwriting · Fine Motor',
    traceNameData: { letters, sections },
  };
}

// ========== MODE 12: HANDWRITING PRACTICE ==========
function generateHandwritingMode(config: WorksheetConfig): WorksheetData {
  const text = config.handwritingText || config.childName || 'Hello';
  return {
    mode: 'handwriting',
    instructions: 'Trace the dotted letters, then write by yourself!',
    skillLabel: 'Handwriting · Fine Motor',
    handwritingData: {
      text,
      rows: config.handwritingRows,
      paperStyle: config.handwritingPaperStyle,
      fontSize: config.handwritingFontSize,
      fontSizeMm: config.handwritingFontSizeMm,
      font: config.handwritingFont,
      subMode: config.handwritingSubMode,
      words: config.handwritingWords ? config.handwritingWords.split('\n').filter(w => w.trim()).slice(0, 8) : [],
    },
  };
}

// ========== MODE 13: MAZE ==========
function generateMazeMode(config: WorksheetConfig): WorksheetData {
  const sizeMap: Record<MazeSize, number> = { small: 8, medium: 12, large: 16 };
  const dim = sizeMap[config.mazeSize];
  const rows = dim;
  const cols = config.mazeShape === 'rectangle' ? Math.round(dim * 1.4) : dim;

  // Initialize grid
  const grid: MazeCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: true, right: true, bottom: true, left: true, visited: false,
    }))
  );

  // Recursive backtracking
  const stack: [number, number][] = [];
  const start: [number, number] = [0, 0];
  grid[0][0].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors: [number, number, string, string][] = [];
    if (cr > 0 && !grid[cr - 1][cc].visited) neighbors.push([cr - 1, cc, 'top', 'bottom']);
    if (cr < rows - 1 && !grid[cr + 1][cc].visited) neighbors.push([cr + 1, cc, 'bottom', 'top']);
    if (cc > 0 && !grid[cr][cc - 1].visited) neighbors.push([cr, cc - 1, 'left', 'right']);
    if (cc < cols - 1 && !grid[cr][cc + 1].visited) neighbors.push([cr, cc + 1, 'right', 'left']);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nr, nc, wall1, wall2] = neighbors[Math.floor(Math.random() * neighbors.length)];
      (grid[cr][cc] as any)[wall1] = false;
      (grid[nr][nc] as any)[wall2] = false;
      grid[nr][nc].visited = true;
      stack.push([nr, nc]);
    }
  }

  // Open extra passages so difficulty is graded: easy has many shortcuts
  // (forgiving, multiple routes), medium a few, hard is a true perfect maze
  // (single winding solution, maximal dead ends). Same maze size across all —
  // the "Maze Size" control is independent of difficulty.
  const openProb = config.difficulty === 'easy' ? 0.25 : config.difficulty === 'medium' ? 0.1 : 0;
  if (openProb > 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (Math.random() < openProb && grid[r][c].right) {
          grid[r][c].right = false;
          grid[r][c + 1].left = false;
        }
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < openProb && grid[r][c].bottom) {
          grid[r][c].bottom = false;
          grid[r + 1][c].top = false;
        }
      }
    }
  }

  // Solve maze with BFS for solution path
  const solution: [number, number][] = [];
  const endR = rows - 1;
  const endC = cols - 1;
  const visited2: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent: ([number, number] | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const queue: [number, number][] = [[0, 0]];
  visited2[0][0] = true;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    if (cr === endR && cc === endC) break;
    const moves: [number, number, string][] = [
      [cr - 1, cc, 'top'], [cr + 1, cc, 'bottom'], [cr, cc - 1, 'left'], [cr, cc + 1, 'right'],
    ];
    for (const [nr, nc, wall] of moves) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited2[nr][nc] && !(grid[cr][cc] as any)[wall]) {
        visited2[nr][nc] = true;
        parent[nr][nc] = [cr, cc];
        queue.push([nr, nc]);
      }
    }
  }

  let cur: [number, number] | null = [endR, endC];
  while (cur) {
    solution.unshift(cur);
    cur = parent[cur[0]][cur[1]];
  }

  // Circle mask: mark cells outside the circle as fully walled
  if (config.mazeShape === 'circle') {
    const centerR = (rows - 1) / 2;
    const centerC = (cols - 1) / 2;
    const radius = Math.min(rows, cols) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
        if (dist > radius) {
          grid[r][c].top = true;
          grid[r][c].right = true;
          grid[r][c].bottom = true;
          grid[r][c].left = true;
        }
      }
    }
  }

  return {
    mode: 'maze',
    instructions: 'Find your way from START to END!',
    skillLabel: 'Visual Motor Integration · Planning',
    mazeData: { grid, rows, cols, shape: config.mazeShape, solution },
  };
}

// ========== MODE 14: CONNECT THE DOTS ==========
// Exported: WorksheetPreview reuses these outlines as corner doodles (B3) —
// placement work, not new artwork.
export const DOT_SHAPE_PATHS: Record<ConnectDotsShape, (s: number) => { x: number; y: number }[]> = {
  star: (s) => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 2) + (2 * Math.PI * i) / 10;
      const r = i % 2 === 0 ? s * 0.48 : s * 0.2;
      pts.push({ x: s / 2 + Math.cos(angle) * r, y: s / 2 - Math.sin(angle) * r });
    }
    return pts;
  },
  heart: (s) => {
    const pts: { x: number; y: number }[] = [];
    const cx = s / 2, cy = s * 0.45;
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push({ x: cx + x * s * 0.025, y: cy + y * s * 0.025 });
    }
    return pts;
  },
  house: (s) => {
    const m = s * 0.1;
    return [
      { x: s / 2, y: m }, { x: s - m, y: s * 0.4 }, { x: s - m, y: s - m },
      { x: s * 0.65, y: s - m }, { x: s * 0.65, y: s * 0.65 }, { x: s * 0.35, y: s * 0.65 },
      { x: s * 0.35, y: s - m }, { x: m, y: s - m }, { x: m, y: s * 0.4 },
    ];
  },
  fish: (s) => [
    { x: s * 0.10, y: s * 0.50 },  // mouth
    { x: s * 0.16, y: s * 0.36 },  // upper lip
    { x: s * 0.26, y: s * 0.28 },  // upper body
    { x: s * 0.38, y: s * 0.25 },  // upper body peak
    { x: s * 0.50, y: s * 0.27 },  // upper mid-body
    { x: s * 0.60, y: s * 0.32 },  // upper body-tail
    { x: s * 0.68, y: s * 0.38 },  // tail base upper
    { x: s * 0.82, y: s * 0.20 },  // upper tail fin tip
    { x: s * 0.90, y: s * 0.50 },  // tail tip
    { x: s * 0.82, y: s * 0.80 },  // lower tail fin tip
    { x: s * 0.68, y: s * 0.62 },  // tail base lower
    { x: s * 0.60, y: s * 0.68 },  // lower body-tail
    { x: s * 0.50, y: s * 0.73 },  // lower mid-body
    { x: s * 0.38, y: s * 0.75 },  // lower body peak
    { x: s * 0.26, y: s * 0.72 },  // lower body
    { x: s * 0.16, y: s * 0.64 },  // lower lip
  ],
  sun: (s) => {
    const pts: { x: number; y: number }[] = [];
    const cx = s / 2, cy = s / 2;
    for (let i = 0; i < 16; i++) {
      const angle = (2 * Math.PI * i) / 16;
      const r = i % 2 === 0 ? s * 0.44 : s * 0.28;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    return pts;
  },
  butterfly: (s) => [
    { x: s * 0.50, y: s * 0.16 },  // body top
    { x: s * 0.58, y: s * 0.14 },  // right upper wing start
    { x: s * 0.70, y: s * 0.11 },
    { x: s * 0.82, y: s * 0.17 },
    { x: s * 0.90, y: s * 0.28 },
    { x: s * 0.88, y: s * 0.40 },
    { x: s * 0.78, y: s * 0.47 },  // right upper wing end
    { x: s * 0.56, y: s * 0.50 },  // waist right
    { x: s * 0.64, y: s * 0.54 },  // right lower wing start
    { x: s * 0.78, y: s * 0.62 },
    { x: s * 0.80, y: s * 0.74 },
    { x: s * 0.70, y: s * 0.82 },
    { x: s * 0.58, y: s * 0.80 },  // right lower wing end
    { x: s * 0.50, y: s * 0.84 },  // body bottom
    { x: s * 0.42, y: s * 0.80 },  // left lower wing start
    { x: s * 0.30, y: s * 0.82 },
    { x: s * 0.20, y: s * 0.74 },
    { x: s * 0.22, y: s * 0.62 },
    { x: s * 0.36, y: s * 0.54 },  // left lower wing end
    { x: s * 0.44, y: s * 0.50 },  // waist left
    { x: s * 0.22, y: s * 0.47 },  // left upper wing start
    { x: s * 0.12, y: s * 0.40 },
    { x: s * 0.10, y: s * 0.28 },
    { x: s * 0.18, y: s * 0.17 },
    { x: s * 0.30, y: s * 0.11 },
    { x: s * 0.42, y: s * 0.14 },  // left upper wing end
  ],
  rocket: (s) => {
    const m = s * 0.15;
    return [
      { x: s / 2, y: m }, { x: s * 0.65, y: s * 0.3 }, { x: s * 0.65, y: s * 0.65 },
      { x: s * 0.8, y: s * 0.85 }, { x: s * 0.65, y: s * 0.75 }, { x: s * 0.65, y: s - m },
      { x: s * 0.35, y: s - m }, { x: s * 0.35, y: s * 0.75 }, { x: s * 0.2, y: s * 0.85 },
      { x: s * 0.35, y: s * 0.65 }, { x: s * 0.35, y: s * 0.3 },
    ];
  },
  tree: (s) => {
    const m = s * 0.08;
    return [
      { x: s / 2, y: m }, { x: s * 0.75, y: s * 0.35 }, { x: s * 0.62, y: s * 0.35 },
      { x: s * 0.82, y: s * 0.58 }, { x: s * 0.68, y: s * 0.58 }, { x: s * 0.88, y: s * 0.78 },
      { x: s * 0.58, y: s * 0.78 }, { x: s * 0.58, y: s - m }, { x: s * 0.42, y: s - m },
      { x: s * 0.42, y: s * 0.78 }, { x: s * 0.12, y: s * 0.78 }, { x: s * 0.32, y: s * 0.58 },
      { x: s * 0.18, y: s * 0.58 }, { x: s * 0.38, y: s * 0.35 }, { x: s * 0.25, y: s * 0.35 },
    ];
  },
  catFace: (s) => [
    { x: s * 0.50, y: s * 0.10 },  // top center notch
    { x: s * 0.64, y: s * 0.08 },  // near right ear
    { x: s * 0.76, y: s * 0.04 },  // right ear tip
    { x: s * 0.80, y: s * 0.18 },  // right ear inner
    { x: s * 0.85, y: s * 0.30 },  // right temple
    { x: s * 0.88, y: s * 0.46 },  // right cheek
    { x: s * 0.84, y: s * 0.62 },  // right cheek lower
    { x: s * 0.74, y: s * 0.76 },  // right jaw
    { x: s * 0.60, y: s * 0.84 },  // right chin
    { x: s * 0.50, y: s * 0.86 },  // chin center
    { x: s * 0.40, y: s * 0.84 },  // left chin
    { x: s * 0.26, y: s * 0.76 },  // left jaw
    { x: s * 0.16, y: s * 0.62 },  // left cheek lower
    { x: s * 0.12, y: s * 0.46 },  // left cheek
    { x: s * 0.15, y: s * 0.30 },  // left temple
    { x: s * 0.20, y: s * 0.18 },  // left ear inner
    { x: s * 0.24, y: s * 0.04 },  // left ear tip
    { x: s * 0.36, y: s * 0.08 },  // near left ear
  ],
  flower: (s) => {
    const pts: { x: number; y: number }[] = [];
    const cx = s / 2, cy = s * 0.4;
    // Petals
    for (let i = 0; i < 24; i++) {
      const angle = (2 * Math.PI * i) / 24;
      const r = s * (0.28 + 0.1 * Math.cos(6 * angle));
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    // Stem
    pts.push({ x: cx + s * 0.02, y: cy + s * 0.28 }, { x: cx + s * 0.02, y: s * 0.92 },
      { x: cx - s * 0.02, y: s * 0.92 }, { x: cx - s * 0.02, y: cy + s * 0.28 });
    return pts;
  },
};

function generateConnectDotsMode(config: WorksheetConfig): WorksheetData {
  const shapeName = config.connectDotsShape;
  const dotCountRange: Record<Difficulty, [number, number]> = {
    easy: [10, 20], medium: [20, 40], hard: [40, 80],
  };
  const [minDots, maxDots] = dotCountRange[config.difficulty];
  const targetDots = Math.round(minDots + Math.random() * (maxDots - minDots));

  const shapeSize = 400;
  const rawPts = DOT_SHAPE_PATHS[shapeName](shapeSize);

  // Resample to target number of dots
  const dots: { x: number; y: number; index: number }[] = [];
  const totalPts = rawPts.length;

  if (targetDots >= totalPts) {
    // Interpolate between points
    const totalLen = rawPts.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const prev = rawPts[i - 1];
      return sum + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
    }, 0);
    const segLen = totalLen / targetDots;
    let accum = 0;
    let ptIdx = 0;
    dots.push({ x: rawPts[0].x, y: rawPts[0].y, index: 1 });
    for (let i = 1; i < rawPts.length && dots.length < targetDots; i++) {
      const dx = rawPts[i].x - rawPts[i - 1].x;
      const dy = rawPts[i].y - rawPts[i - 1].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      accum += d;
      while (accum >= segLen && dots.length < targetDots) {
        accum -= segLen;
        const t = 1 - accum / d;
        dots.push({
          x: rawPts[i - 1].x + dx * t,
          y: rawPts[i - 1].y + dy * t,
          index: dots.length + 1,
        });
      }
    }
  } else {
    // Subsample
    for (let i = 0; i < targetDots; i++) {
      const srcIdx = Math.round((i / targetDots) * (totalPts - 1));
      dots.push({ x: rawPts[srcIdx].x, y: rawPts[srcIdx].y, index: i + 1 });
    }
  }

  // Build completed path
  const completedPath = dots.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`).join(' ') + ' Z';

  return {
    mode: 'connectDots',
    instructions: `Connect the dots from 1 to ${dots.length} to reveal the picture!`,
    skillLabel: 'Visual Sequential Memory · Fine Motor',
    connectDotsData: { dots, shapeName, completedPath },
  };
}

// ========== MODE 15: TRACING PATHS ==========
function generateTracingPathsMode(config: WorksheetConfig): WorksheetData {
  const strokeTypes: TracingStrokeType[] = ['vertical', 'horizontal', 'diagonal', 'curved', 'waves', 'zigzag', 'spiral', 'loops'];
  const rowCount = config.tracingRows;
  const isEasy = config.difficulty === 'easy';
  const isMedium = config.difficulty === 'medium';
  const areaW = 460;
  const rowH = isEasy ? 100 : isMedium ? 80 : 60;

  const absoluteRows: TracingPathsData['rows'] = [];
  for (let i = 0; i < rowCount; i++) {
    const type = config.tracingStrokeType === 'mixed' ? strokeTypes[i % strokeTypes.length] : config.tracingStrokeType;
    const baseY = i * rowH;
    const margin = 20;
    let pathD = '';
    let sX = margin, sY = rowH / 2, eX = areaW - margin, eY = rowH / 2;

    switch (type) {
      case 'vertical':
        sX = areaW / 2; eX = areaW / 2; sY = 10; eY = rowH - 10;
        pathD = `M ${sX} ${baseY + sY} L ${eX} ${baseY + eY}`;
        break;
      case 'horizontal':
        pathD = `M ${sX} ${baseY + sY} L ${eX} ${baseY + eY}`;
        break;
      case 'diagonal':
        sY = 10; eY = rowH - 10;
        pathD = `M ${sX} ${baseY + sY} L ${eX} ${baseY + eY}`;
        break;
      case 'curved':
        pathD = `M ${sX} ${baseY + sY} Q ${areaW / 2} ${baseY + 10} ${eX} ${baseY + eY}`;
        break;
      case 'waves': {
        const amp = isEasy ? rowH * 0.3 : rowH * 0.35;
        const segments = isEasy ? 3 : isMedium ? 4 : 5;
        const segW = (areaW - 2 * margin) / segments;
        pathD = `M ${sX} ${baseY + sY}`;
        for (let s = 0; s < segments; s++) {
          const cx1 = sX + s * segW + segW * 0.25;
          const cx2 = sX + s * segW + segW * 0.75;
          const ex = sX + (s + 1) * segW;
          const dir = s % 2 === 0 ? -1 : 1;
          pathD += ` C ${cx1} ${baseY + sY + dir * amp} ${cx2} ${baseY + sY + dir * amp} ${ex} ${baseY + sY}`;
        }
        eX = sX + segments * segW;
        break;
      }
      case 'zigzag': {
        const points = isEasy ? 4 : isMedium ? 6 : 8;
        const segW = (areaW - 2 * margin) / points;
        const amp = isEasy ? rowH * 0.3 : rowH * 0.35;
        pathD = `M ${sX} ${baseY + sY}`;
        for (let p = 1; p <= points; p++) {
          const px = sX + p * segW;
          const py = baseY + sY + (p % 2 === 1 ? -amp : amp);
          pathD += ` L ${px} ${py}`;
          if (p === points) { eX = px; eY = py - baseY; }
        }
        break;
      }
      case 'spiral': {
        const cx = areaW / 2, cy = baseY + rowH / 2;
        const maxR = Math.min(rowH * 0.4, areaW * 0.2);
        const turns = isEasy ? 2 : 3;
        const steps = turns * 20;
        sX = cx + maxR; sY = rowH / 2;
        pathD = `M ${sX} ${cy}`;
        for (let s = 1; s <= steps; s++) {
          const angle = (s / steps) * turns * Math.PI * 2;
          const r = maxR * (1 - s / steps);
          pathD += ` L ${cx + Math.cos(angle) * r} ${cy + Math.sin(angle) * r}`;
          if (s === steps) { eX = cx + Math.cos(angle) * r; eY = cy + Math.sin(angle) * r - baseY; }
        }
        break;
      }
      case 'loops': {
        const loopCount = isEasy ? 3 : isMedium ? 4 : 5;
        const loopW = (areaW - 2 * margin) / loopCount;
        const loopR = Math.min(loopW * 0.4, rowH * 0.35);
        pathD = `M ${sX} ${baseY + sY}`;
        for (let l = 0; l < loopCount; l++) {
          const lx = sX + l * loopW + loopW / 2;
          pathD += ` Q ${lx - loopR} ${baseY + sY - loopR * 2} ${lx} ${baseY + sY}`;
          pathD += ` Q ${lx + loopR} ${baseY + sY + loopR * 2} ${lx + loopW / 2} ${baseY + sY}`;
        }
        eX = sX + loopCount * loopW;
        break;
      }
    }

    absoluteRows.push({ pathD, startX: sX, startY: baseY + sY, endX: eX, endY: baseY + eY, strokeType: type });
  }

  return {
    mode: 'tracingPaths',
    instructions: 'Trace along each path from the green dot to the red dot!',
    skillLabel: 'Pre-Writing Skills · Fine Motor',
    tracingPathsData: { rows: absoluteRows },
  };
}

// ========== MODE 16: SCISSOR SKILLS ==========
function generateScissorSkillsMode(config: WorksheetConfig): WorksheetData {
  const lineCount = config.scissorLineCount;
  const areaW = 460;
  const margin = 40;

  // Difficulty controls how demanding the cut is: easy = gentle, few turns;
  // hard = tighter amplitude and more direction changes (harder to stay on
  // the line). Straight lines are unaffected.
  const isEasy = config.difficulty === 'easy';
  const isHard = config.difficulty === 'hard';
  const wavySegments = isEasy ? 4 : isHard ? 6 : 5;
  const wavyAmp = isEasy ? 8 : isHard ? 18 : 12;
  const zigzagPoints = isEasy ? 6 : isHard ? 10 : 8;
  const zigzagAmp = isEasy ? 7 : isHard ? 14 : 10;

  const lineTypes: ScissorLineType[] = ['straight', 'wavy', 'zigzag'];
  const lines: ScissorSkillsData['lines'] = [];

  for (let i = 0; i < lineCount; i++) {
    const type = config.scissorLineType === 'mixed' ? lineTypes[i % lineTypes.length] : config.scissorLineType;
    const startX = margin;
    const y = 0; // will be offset in renderer
    let pathD = '';

    switch (type) {
      case 'straight':
        pathD = `M ${startX} 0 L ${areaW - margin} 0`;
        break;
      case 'wavy': {
        const segments = wavySegments;
        const segW = (areaW - 2 * margin) / segments;
        const amp = wavyAmp;
        pathD = `M ${startX} 0`;
        for (let s = 0; s < segments; s++) {
          const cx1 = startX + s * segW + segW * 0.25;
          const cx2 = startX + s * segW + segW * 0.75;
          const ex = startX + (s + 1) * segW;
          const dir = s % 2 === 0 ? -1 : 1;
          pathD += ` C ${cx1} ${dir * amp} ${cx2} ${dir * amp} ${ex} 0`;
        }
        break;
      }
      case 'zigzag': {
        const points = zigzagPoints;
        const segW = (areaW - 2 * margin) / points;
        const amp = zigzagAmp;
        pathD = `M ${startX} 0`;
        for (let p = 1; p <= points; p++) {
          pathD += ` L ${startX + p * segW} ${p % 2 === 1 ? -amp : amp}`;
        }
        break;
      }
    }

    lines.push({ pathD, startX, startY: y });
  }

  return {
    mode: 'scissorSkills',
    instructions: 'Cut along each line carefully! ✂️',
    skillLabel: 'Scissor Skills · Fine Motor · Bilateral Coordination',
    scissorSkillsData: { lines },
  };
}

// ========== MODE 22: VISUAL SCANNING ==========
function generateVisualScanningMode(config: WorksheetConfig): WorksheetData {
  const target = config.visualScanTarget || 'b';
  const density = config.visualScanDensity;
  const cols = density === 'small' ? 8 : density === 'medium' ? 10 : 12;
  const rows = density === 'small' ? 6 : density === 'medium' ? 8 : 10;
  // Target density falls with difficulty: fewer hits among more distractors
  // means the child must scan more of the field per find. The 'many' control
  // adds a fixed boost on top. (Was a flat 0.2/0.3, so age changed the grid
  // size but not the search effort per target.)
  const baseRatio = config.difficulty === 'easy' ? 0.25 : config.difficulty === 'medium' ? 0.2 : 0.15;
  const targetPercent = config.visualScanTargetCount === 'many' ? baseRatio + 0.1 : baseRatio;

  // Auto-select distractors
  const DISTRACTOR_MAP: Record<string, string[]> = {
    'b': ['d', 'p', 'q', 'g'],
    'd': ['b', 'p', 'q', 'g'],
    'p': ['b', 'd', 'q', 'g'],
    'q': ['b', 'd', 'p', 'g'],
    '3': ['8', 'E', '5', '6'],
    '6': ['9', '8', '0', '5'],
    '9': ['6', '8', '0', 'g'],
    'n': ['u', 'm', 'h', 'r'],
    'u': ['n', 'v', 'w', 'c'],
    'm': ['n', 'w', 'u', 'h'],
    'w': ['m', 'v', 'u', 'n'],
  };

  // Distractors must match the target's case — an uppercase 'B' hunt with
  // lowercase d/p/q distractors is trivially easy and defeats the reversal
  // practice. Build lowercase distractors, then uppercase them if the target
  // is an uppercase letter.
  const isUpperLetter = /[A-Z]/.test(target) && target === target.toUpperCase();
  const lowerDistractors = DISTRACTOR_MAP[target.toLowerCase()] || (() => {
    const alpha = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => c !== target.toLowerCase());
    return shuffle(alpha).slice(0, 4);
  })();
  const distractors = isUpperLetter
    ? lowerDistractors.map(d => (/[a-z]/.test(d) ? d.toUpperCase() : d))
    : lowerDistractors;

  const totalCells = rows * cols;
  const targetCount = Math.round(totalCells * targetPercent);

  const grid: string[][] = [];
  const targetPositions: [number, number][] = [];

  // Build flat array then reshape
  const cells: string[] = [];
  for (let i = 0; i < targetCount; i++) cells.push(target);
  for (let i = targetCount; i < totalCells; i++) cells.push(distractors[Math.floor(Math.random() * distractors.length)]);
  const shuffled = shuffle(cells);

  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      const ch = shuffled[r * cols + c];
      row.push(ch);
      if (ch === target) targetPositions.push([r, c]);
    }
    grid.push(row);
  }

  return {
    mode: 'visualScanning',
    instructions: `Circle every '${target}' and count how many you find!`,
    skillLabel: 'Visual Scanning · Visual Discrimination · Reversal Recognition',
    visualScanData: { grid, target, targetPositions, rows, cols },
  };
}

// ========== MODE 23: PIXEL ART ==========
const PIXEL_ART_PATTERNS: Record<PixelArtTheme, { grid: number[][]; colors: { color: string; name: string }[] }> = {
  heart: {
    grid: [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }],
  },
  smiley: {
    grid: [
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,2,1,1,2,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,2,1,1,1,1,2,1,0],
      [0,1,1,2,2,2,2,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#1E293B', name: 'Black' }],
  },
  star: {
    grid: [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,0,0,0,0,1,1,0],
      [1,1,0,0,0,0,0,0,1,1],
      [1,0,0,0,0,0,0,0,0,1],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }],
  },
  catFace: {
    grid: [
      [0,1,0,0,0,0,0,0,1,0],
      [0,1,1,0,0,0,0,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,2,1,1,2,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,3,3,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#F97316', name: 'Orange' }, { color: '#22C55E', name: 'Green' }, { color: '#EC4899', name: 'Pink' }],
  },
  fish: {
    grid: [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,0,0],
      [2,2,0,1,1,3,1,1,1,0],
      [2,2,2,1,1,1,1,1,1,0],
      [2,2,0,1,1,1,1,1,1,0],
      [0,0,0,1,1,1,1,1,0,0],
      [0,0,0,0,1,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#DBEAFE', name: 'Light Blue' }, { color: '#3B82F6', name: 'Blue' }, { color: '#F97316', name: 'Orange' }, { color: '#1E293B', name: 'Black' }],
  },
  house: {
    grid: [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [0,2,2,2,2,2,2,2,2,0],
      [0,2,3,3,2,2,3,3,2,0],
      [0,2,3,3,2,2,3,3,2,0],
      [0,2,2,2,4,4,2,2,2,0],
      [0,2,2,2,4,4,2,2,2,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#F97316', name: 'Orange' }, { color: '#93C5FD', name: 'Blue' }, { color: '#92400E', name: 'Brown' }],
  },
  sun: {
    grid: [
      [0,0,0,1,0,0,1,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [1,0,1,1,1,1,1,1,0,1],
      [0,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,0,1,1,1,1,1,1,0,1],
      [0,0,1,1,1,1,1,1,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,0,0,1,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }],
  },
  flower: {
    grid: [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,2,2,1,1,0,0],
      [0,1,1,2,3,3,2,1,1,0],
      [0,1,2,3,3,3,3,2,1,0],
      [0,1,1,2,3,3,2,1,1,0],
      [0,0,1,1,2,2,1,1,0,0],
      [0,0,0,0,4,4,0,0,0,0],
      [0,0,0,0,4,4,0,0,0,0],
      [0,0,0,0,4,4,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EC4899', name: 'Pink' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#F97316', name: 'Orange' }, { color: '#22C55E', name: 'Green' }],
  },
  rainbow: {
    grid: [
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,2,2,2,2,1,1,0],
      [1,1,2,3,3,3,3,2,1,1],
      [1,2,3,4,4,4,4,3,2,1],
      [1,2,3,4,0,0,4,3,2,1],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#F97316', name: 'Orange' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#22C55E', name: 'Green' }],
  },
  rocket: {
    grid: [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,1,2,2,1,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,3,1,1,1,1,3,0,0],
      [0,3,3,1,1,1,1,3,3,0],
      [0,0,0,4,0,0,4,0,0,0],
      [0,0,0,4,0,0,4,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#64748B', name: 'Grey' }, { color: '#60A5FA', name: 'Blue' }, { color: '#EF4444', name: 'Red' }, { color: '#F97316', name: 'Orange' }],
  },
};

// Easy variants: 8×8, bold silhouette, 2–3 palette entries — for children who
// are still matching one or two colors and need big cells to color inside.
const PIXEL_ART_PATTERNS_EASY: Record<PixelArtTheme, { grid: number[][]; colors: { color: string; name: string }[] }> = {
  heart: {
    grid: [
      [0,0,0,0,0,0,0,0],
      [0,1,1,0,0,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }],
  },
  smiley: {
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,2,1,1,2,1,1],
      [1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,2,1],
      [1,1,2,2,2,2,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#1E293B', name: 'Black' }],
  },
  star: {
    grid: [
      [0,0,0,1,1,0,0,0],
      [0,0,0,1,1,0,0,0],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,1,1,0,0,1,1,0],
      [1,1,0,0,0,0,1,1],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }],
  },
  catFace: {
    grid: [
      [1,0,0,0,0,0,0,1],
      [1,1,0,0,0,0,1,1],
      [1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,2,2,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#F97316', name: 'Orange' }, { color: '#1E293B', name: 'Black' }],
  },
  fish: {
    grid: [
      [0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,2,1,1,0,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1],
      [0,0,1,1,1,0,0,1],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#3B82F6', name: 'Blue' }, { color: '#1E293B', name: 'Black' }],
  },
  house: {
    grid: [
      [0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [0,2,2,2,2,2,2,0],
      [0,2,2,2,2,2,2,0],
      [0,2,2,0,0,2,2,0],
      [0,2,2,0,0,2,2,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#F97316', name: 'Orange' }],
  },
  sun: {
    grid: [
      [1,0,0,1,1,0,0,1],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [1,0,0,1,1,0,0,1],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }],
  },
  flower: {
    grid: [
      [0,0,1,1,1,0,0,0],
      [0,1,1,2,1,1,0,0],
      [0,1,2,2,2,1,0,0],
      [0,1,1,2,1,1,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,0,3,0,0,0,0],
      [0,0,0,3,0,0,0,0],
      [0,0,3,3,3,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EC4899', name: 'Pink' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#22C55E', name: 'Green' }],
  },
  rainbow: {
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,2,2,2,2,1,1],
      [1,2,2,3,3,2,2,1],
      [1,2,3,3,3,3,2,1],
      [1,2,3,0,0,3,2,1],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#3B82F6', name: 'Blue' }],
  },
  rocket: {
    grid: [
      [0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [0,0,2,2,2,2,0,0],
      [0,0,0,2,2,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#64748B', name: 'Grey' }, { color: '#F97316', name: 'Orange' }, { color: '#60A5FA', name: 'Blue' }],
  },
};

// Hard variants: 12×12, finer cells and 4–6 palette entries (shading, extra
// features) — more color discrimination and more precise coloring.
const PIXEL_ART_PATTERNS_HARD: Record<PixelArtTheme, { grid: number[][]; colors: { color: string; name: string }[] }> = {
  heart: {
    grid: [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,1,1,1,0,0],
      [0,1,3,3,1,1,1,1,1,1,1,0],
      [1,3,3,1,1,1,1,1,1,1,2,1],
      [1,3,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,2,2,1],
      [0,1,1,1,1,1,1,1,1,2,1,0],
      [0,0,1,1,1,1,1,1,2,1,0,0],
      [0,0,0,1,1,1,1,2,1,0,0,0],
      [0,0,0,0,1,1,2,1,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#B91C1C', name: 'Dark Red' }, { color: '#FDA4AF', name: 'Light Pink' }],
  },
  smiley: {
    grid: [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,2,2,1,1,2,2,1,1,0],
      [1,1,1,2,2,1,1,2,2,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,1,1,1,1,1,1,1,1,3,1],
      [1,3,2,1,1,1,1,1,1,2,3,1],
      [0,1,1,2,2,2,2,2,2,1,1,0],
      [0,1,1,1,1,1,1,1,1,4,1,0],
      [0,0,1,1,1,1,1,1,4,4,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#1E293B', name: 'Black' }, { color: '#FDA4AF', name: 'Pink' }, { color: '#D97706', name: 'Dark Yellow' }],
  },
  star: {
    grid: [
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,3,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,1,1,2,0,0,2,1,1,0,0],
      [0,1,1,2,0,0,0,0,2,1,1,0],
      [0,1,2,0,0,0,0,0,0,2,1,0],
      [1,1,0,0,0,0,0,0,0,0,1,1],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#F97316', name: 'Orange' }, { color: '#FEF3C7', name: 'Cream' }],
  },
  catFace: {
    grid: [
      [0,1,1,0,0,0,0,0,0,1,1,0],
      [0,1,4,1,0,0,0,0,1,4,1,0],
      [0,1,4,4,1,1,1,1,4,4,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,2,2,1,1,1,1,2,2,1,1],
      [1,1,2,2,1,1,1,1,2,2,1,1],
      [1,1,1,1,1,3,3,1,1,1,1,1],
      [0,1,1,1,1,3,3,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#F97316', name: 'Orange' }, { color: '#22C55E', name: 'Green' }, { color: '#EC4899', name: 'Pink' }, { color: '#FDA4AF', name: 'Light Pink' }],
  },
  fish: {
    grid: [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,3],
      [0,0,1,1,2,1,1,2,1,1,3,3],
      [0,1,1,4,1,2,1,1,2,1,3,3],
      [1,1,1,1,1,1,2,1,1,1,3,3],
      [1,1,1,1,1,1,1,2,1,1,3,3],
      [0,1,1,1,1,2,1,1,2,1,3,3],
      [0,0,1,1,1,1,1,1,1,1,3,3],
      [0,0,0,1,1,1,1,1,1,0,0,3],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#3B82F6', name: 'Blue' }, { color: '#1D4ED8', name: 'Dark Blue' }, { color: '#F97316', name: 'Orange' }, { color: '#1E293B', name: 'Black' }],
  },
  house: {
    grid: [
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,2,2,2,2,2,2,2,2,2,2,0],
      [0,2,3,3,2,2,2,2,3,3,2,0],
      [0,2,3,3,2,4,4,2,3,3,2,0],
      [0,2,2,2,2,4,4,2,2,2,2,0],
      [0,2,2,2,2,4,4,2,2,2,2,0],
      [0,5,5,2,2,4,4,2,2,5,5,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#F97316', name: 'Orange' }, { color: '#93C5FD', name: 'Blue' }, { color: '#92400E', name: 'Brown' }, { color: '#22C55E', name: 'Green' }],
  },
  sun: {
    grid: [
      [0,0,0,2,0,0,0,0,2,0,0,0],
      [2,0,0,0,2,1,1,2,0,0,0,2],
      [0,2,0,1,1,1,1,1,1,0,2,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,2,1,1,1,1,1,1,1,1,2,0],
      [0,1,1,1,1,3,3,1,1,1,1,0],
      [0,1,1,1,1,3,3,1,1,1,1,0],
      [0,2,1,1,1,1,1,1,1,1,2,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,2,0,1,1,1,1,1,1,0,2,0],
      [2,0,0,0,2,1,1,2,0,0,0,2],
      [0,0,0,2,0,0,0,0,2,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#F97316', name: 'Orange' }, { color: '#D97706', name: 'Deep Orange' }],
  },
  flower: {
    grid: [
      [0,0,0,1,1,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,2,1,1,2,1,1,1,0],
      [0,1,1,2,3,3,3,3,2,1,1,0],
      [0,0,1,3,3,3,3,3,3,1,0,0],
      [0,1,1,2,3,3,3,3,2,1,1,0],
      [0,1,1,1,2,1,1,2,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,0,4,4,0,0,0,0,0],
      [0,0,4,0,0,4,4,0,0,4,0,0],
      [0,4,4,4,0,4,4,0,4,4,4,0],
      [0,0,4,4,4,4,4,4,4,4,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EC4899', name: 'Pink' }, { color: '#BE185D', name: 'Magenta' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#22C55E', name: 'Green' }],
  },
  rainbow: {
    grid: [
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,2,2,2,2,2,2,1,1,0],
      [0,1,2,2,3,3,3,3,2,2,1,0],
      [1,1,2,3,3,4,4,3,3,2,1,1],
      [1,2,2,3,4,4,4,4,3,2,2,1],
      [1,2,3,3,4,5,5,4,3,3,2,1],
      [1,2,3,4,4,5,5,4,4,3,2,1],
      [6,6,3,4,5,0,0,5,4,3,6,6],
      [6,6,6,6,0,0,0,0,6,6,6,6],
      [0,6,6,0,0,0,0,0,0,6,6,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#EF4444', name: 'Red' }, { color: '#F97316', name: 'Orange' }, { color: '#FBBF24', name: 'Yellow' }, { color: '#22C55E', name: 'Green' }, { color: '#3B82F6', name: 'Blue' }, { color: '#CBD5E1', name: 'Grey' }],
  },
  rocket: {
    grid: [
      [0,0,0,0,0,2,2,0,0,0,0,0],
      [0,0,0,0,2,2,2,2,0,0,0,0],
      [0,0,0,0,2,2,2,2,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,0,1,1,3,3,1,1,0,0,0],
      [0,0,0,1,1,3,3,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,1,0,0,0],
      [0,0,2,1,1,1,1,1,1,2,0,0],
      [0,2,2,1,1,1,1,1,1,2,2,0],
      [0,2,2,2,1,1,1,1,2,2,2,0],
      [0,0,0,0,4,4,4,4,0,0,0,0],
      [0,0,0,0,0,4,4,0,0,0,0,0],
    ],
    colors: [{ color: '#F1F5F9', name: 'White' }, { color: '#64748B', name: 'Grey' }, { color: '#EF4444', name: 'Red' }, { color: '#60A5FA', name: 'Blue' }, { color: '#F97316', name: 'Orange' }],
  },
};

function generatePixelArtMode(config: WorksheetConfig): WorksheetData {
  const theme = config.pixelArtTheme;
  // Difficulty picks the artwork tier: 8×8 / 2–3 colors, 10×10 (the original
  // set), or 12×12 / 4–6 colors.
  const source = config.difficulty === 'easy'
    ? PIXEL_ART_PATTERNS_EASY
    : config.difficulty === 'hard'
      ? PIXEL_ART_PATTERNS_HARD
      : PIXEL_ART_PATTERNS;
  const pattern = source[theme];

  const colorKey = pattern.colors.map((c, i) => ({ index: i, color: c.color, name: c.name }));

  return {
    mode: 'pixelArt',
    instructions: `Colour by number to reveal the picture!`,
    skillLabel: 'Fine Motor · Visual Scanning · Colour Matching',
    pixelArtData: { grid: pattern.grid, colorKey, gridSize: pattern.grid.length },
  };
}

// Assign emoji to CellData based on shape→emoji mapping
function assignEmojiToCells(cells: CellData[], shapeToEmoji: Map<ShapeName, string>) {
  cells.forEach(cell => {
    if (shapeToEmoji.has(cell.shape)) {
      cell.emoji = shapeToEmoji.get(cell.shape);
    }
  });
}

function buildShapeEmojiMap(config: WorksheetConfig, shapes: ShapeName[]): Map<ShapeName, string> {
  const theme = EMOJI_THEMES[config.emojiTheme];
  const emojis = shuffle([...theme.emojis]);
  const map = new Map<ShapeName, string>();
  shapes.forEach((s, i) => {
    map.set(s, emojis[i % emojis.length]);
  });
  return map;
}

function applyEmojiToWorksheet(config: WorksheetConfig, result: WorksheetData) {
  if (!config.useEmoji || !EMOJI_ELIGIBLE_MODES.includes(config.mode)) return;

  // Collect all unique shapes used
  const allShapes = new Set<ShapeName>();

  if (result.grid) result.grid.forEach(row => row.forEach(c => allShapes.add(c.shape)));
  if (result.countPuzzle) result.countPuzzle.grid.forEach(row => row.forEach(c => allShapes.add(c.shape)));
  if (result.sequencePuzzles) result.sequencePuzzles.forEach(p => {
    p.sequence.forEach(c => allShapes.add(c.shape));
    p.options.forEach(c => allShapes.add(c.shape));
  });
  if (result.oddOneOutRows) result.oddOneOutRows.forEach(r => r.items.forEach(c => allShapes.add(c.shape)));
  if (result.figureGroundPuzzle) result.figureGroundPuzzle.shapes.forEach(s => allShapes.add(s.shape));
  if (result.closurePuzzles) result.closurePuzzles.forEach(p => {
    allShapes.add(p.shape);
    p.options.forEach(o => allShapes.add(o));
  });

  const map = buildShapeEmojiMap(config, Array.from(allShapes));

  // Apply to all cell data
  if (result.grid) result.grid.forEach(row => assignEmojiToCells(row, map));
  if (result.countPuzzle) {
    result.countPuzzle.grid.forEach(row => assignEmojiToCells(row, map));
    // Remap targetShapes emoji
    (result.countPuzzle as any)._emojiMap = Object.fromEntries(map);
  }
  if (result.sequencePuzzles) result.sequencePuzzles.forEach(p => {
    assignEmojiToCells(p.sequence, map);
    assignEmojiToCells(p.options, map);
    if (p.answer) p.answer.emoji = map.get(p.answer.shape);
  });
  if (result.oddOneOutRows) result.oddOneOutRows.forEach(r => assignEmojiToCells(r.items, map));
  if (result.figureGroundPuzzle) {
    result.figureGroundPuzzle.shapes.forEach(s => {
      (s as any).emoji = map.get(s.shape);
    });
    (result.figureGroundPuzzle as any)._emojiMap = Object.fromEntries(map);
  }
  if (result.closurePuzzles) {
    result.closurePuzzles.forEach(p => {
      (p as any).emoji = map.get(p.shape);
      (p as any).optionEmojis = p.options.map(o => map.get(o));
    });
  }

  // Also store on targetShape
  if (result.targetShape) (result as any)._targetEmoji = map.get(result.targetShape);

  // Instructions reference shape names ("Find every square…") which is wrong
  // when cells render as emoji — a parent reading the sheet aloud would name a
  // shape the child cannot see. Swap in emoji-appropriate wording.
  if (result.mode === 'find' && result.targetShape) {
    const emoji = map.get(result.targetShape);
    result.instructions = emoji
      ? `Find every ${emoji} and put a tick on each one!`
      : 'Find every one that matches the picture and put a tick on each one!';
  } else if (result.mode === 'count') {
    result.instructions = 'Count how many of each picture you can find. Write the number in the box!';
  }
}

export function generateWorksheet(config: WorksheetConfig): WorksheetData {
  let result: WorksheetData;
  switch (config.mode) {
    case 'find': result = generateFindMode(config); break;
    case 'pattern': result = generatePatternMode(config); break;
    case 'count': result = generateCountMode(config); break;
    case 'copy': result = generateCopyMode(config); break;
    case 'sequence': result = generateSequenceMode(config); break;
    case 'oddOneOut': result = generateOddOneOutMode(config); break;
    case 'mirror': result = generateMirrorMode(config); break;
    case 'figureGround': result = generateFigureGroundMode(config); break;
    case 'closure': result = generateClosureMode(config); break;
    case 'traceName': result = generateTraceNameMode(config); break;
    case 'handwriting': result = generateHandwritingMode(config); break;
    case 'maze': result = generateMazeMode(config); break;
    case 'connectDots': result = generateConnectDotsMode(config); break;
    case 'tracingPaths': result = generateTracingPathsMode(config); break;
    case 'scissorSkills': result = generateScissorSkillsMode(config); break;
    case 'visualScanning': result = generateVisualScanningMode(config); break;
    case 'pixelArt': result = generatePixelArtMode(config); break;
  }
  // Apply emoji mapping
  applyEmojiToWorksheet(config, result);
  // Apply custom instruction override
  if (config.customInstruction.trim()) {
    result.instructions = config.customInstruction.trim();
  }
  return result;
}

export function getShapeSVG(shape: ShapeName, cx: number, cy: number, r: number, fill: string, stroke: string, strokeWidth: number, rotation?: number): string {
  const raw = getShapeRawSVG(shape, cx, cy, r);
  const transform = rotation ? ` transform="rotate(${rotation}, ${cx}, ${cy})"` : '';
  return raw.replace('/>', ` fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transform} />`);
}

export function getShapeRawSVG(shape: ShapeName, cx: number, cy: number, r: number): string {
  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r * 0.42}" />`;
    case 'square':
      return `<rect x="${cx - r * 0.38}" y="${cy - r * 0.38}" width="${r * 0.76}" height="${r * 0.76}" />`;
    case 'triangle': {
      const h = r * 0.42;
      return `<polygon points="${cx},${cy - h} ${cx - h},${cy + h * 0.7} ${cx + h},${cy + h * 0.7}" />`;
    }
    case 'cross': {
      const w = r * 0.18;
      const l = r * 0.42;
      return `<polygon points="${cx - w},${cy - l} ${cx + w},${cy - l} ${cx + w},${cy - w} ${cx + l},${cy - w} ${cx + l},${cy + w} ${cx + w},${cy + w} ${cx + w},${cy + l} ${cx - w},${cy + l} ${cx - w},${cy + w} ${cx - l},${cy + w} ${cx - l},${cy - w} ${cx - w},${cy - w}" />`;
    }
    case 'diamond': {
      const d = r * 0.42;
      return `<polygon points="${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}" />`;
    }
    case 'star': {
      const outer = r * 0.42;
      const inner = r * 0.18;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const aOuter = (Math.PI / 2 + (2 * Math.PI * i) / 5) * -1 + Math.PI;
        const aInner = aOuter + Math.PI / 5;
        pts.push(`${cx + Math.cos(aOuter) * outer},${cy + Math.sin(aOuter) * outer}`);
        pts.push(`${cx + Math.cos(aInner) * inner},${cy + Math.sin(aInner) * inner}`);
      }
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'rectangle':
      return `<rect x="${cx - r * 0.42}" y="${cy - r * 0.26}" width="${r * 0.84}" height="${r * 0.52}" rx="2" />`;
    case 'oval':
      return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.42}" ry="${r * 0.28}" />`;
    case 'heart': {
      const s = r * 0.32;
      return `<path d="M ${cx} ${cy + s * 0.9} Q ${cx - s * 0.4} ${cy + s * 0.5} ${cx - s * 0.9} ${cy - s * 0.1} A ${s * 0.55} ${s * 0.55} 0 0 1 ${cx} ${cy - s * 0.7} A ${s * 0.55} ${s * 0.55} 0 0 1 ${cx + s * 0.9} ${cy - s * 0.1} Q ${cx + s * 0.4} ${cy + s * 0.5} ${cx} ${cy + s * 0.9} Z" />`;
    }
    case 'arrow': {
      const w = r * 0.2;
      const l = r * 0.42;
      const headW = r * 0.36;
      return `<polygon points="${cx},${cy - l} ${cx + headW},${cy - l * 0.2} ${cx + w},${cy - l * 0.2} ${cx + w},${cy + l} ${cx - w},${cy + l} ${cx - w},${cy - l * 0.2} ${cx - headW},${cy - l * 0.2}" />`;
    }
    case 'hexagon': {
      const s = r * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${cx + Math.cos(angle) * s},${cy + Math.sin(angle) * s}`);
      }
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'pentagon': {
      const s = r * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${cx + Math.cos(angle) * s},${cy + Math.sin(angle) * s}`);
      }
      return `<polygon points="${pts.join(' ')}" />`;
    }
    default:
      return '';
  }
}
