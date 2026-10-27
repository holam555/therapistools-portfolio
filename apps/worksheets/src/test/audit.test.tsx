import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { WorksheetConfig } from '@/lib/shapes';
import { generateWorksheetSeeded } from '@/lib/seededGenerate';
import { defaultConfig } from '@/lib/defaultConfig';
import WorksheetPreview from '@/components/WorksheetPreview';

/**
 * Control-reflection audit. For every control the editor exposes, prove the
 * change actually reaches the worksheet — either in the generated DATA (puzzle
 * content) or in the rendered SVG (visual-only controls). Uses a fixed seed so
 * the only variable between two outputs is the control under test.
 */
const SEED = 987654;
const gen = (o: Partial<WorksheetConfig>) => generateWorksheetSeeded({ ...defaultConfig, ...o }, SEED);
const J = (o: Partial<WorksheetConfig>) => JSON.stringify(gen(o));

/** Render the full preview to its SVG string (visual-only control checks). */
function svg(config: Partial<WorksheetConfig>, data = gen(config)) {
  const { container } = render(<WorksheetPreview config={{ ...defaultConfig, ...config }} data={data} />);
  const html = container.innerHTML;
  cleanup();
  return html;
}

// ---------------------------------------------------------------------------
// DATA-LEVEL controls — changing them must change the generated puzzle.
// ---------------------------------------------------------------------------
describe('data-level controls change the puzzle', () => {
  it('find: selectedShapes restricts the shapes used', () => {
    const data = gen({ mode: 'find', selectedShapes: ['circle', 'square'] });
    const shapes = (data.grid ?? []).flat().map((c) => c.shape);
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.every((s) => s === 'circle' || s === 'square')).toBe(true);
  });

  it('find: useEmoji puts emoji on cells', () => {
    const data = gen({ mode: 'find', useEmoji: true, emojiTheme: 'animals' });
    expect((data.grid ?? []).flat().some((c) => !!c.emoji)).toBe(true);
  });

  it('find: gridSize changes grid dimensions', () => {
    expect(gen({ mode: 'find', gridSize: 5 }).grid?.length).toBe(5);
    expect(gen({ mode: 'find', gridSize: 2 }).grid?.length).toBe(2);
  });

  it('find: difficulty changes output', () => {
    expect(J({ mode: 'find', difficulty: 'easy' })).not.toBe(J({ mode: 'find', difficulty: 'hard' }));
  });

  it('sequence: exerciseCount sets number of puzzles', () => {
    expect(gen({ mode: 'sequence', exerciseCount: 8 }).sequencePuzzles?.length).toBe(8);
    expect(gen({ mode: 'sequence', exerciseCount: 3 }).sequencePuzzles?.length).toBe(3);
  });

  it('oddOneOut: item type letters with custom target uses that letter', () => {
    const data = gen({ mode: 'oddOneOut', oddOneOutType: 'letters', oddOneOutCustomTarget: 'b', exerciseCount: 5 });
    const rows = data.oddOneOutRows ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.oddText === 'b')).toBe(true);
  });

  it('oddOneOut: shapes vs letters produce different data', () => {
    expect(J({ mode: 'oddOneOut', oddOneOutType: 'shapes' })).not.toBe(J({ mode: 'oddOneOut', oddOneOutType: 'numbers' }));
  });

  it('count: gridSize changes the grid', () => {
    expect(J({ mode: 'count', gridSize: 3 })).not.toBe(J({ mode: 'count', gridSize: 5 }));
  });

  it('copy: gridSize and exerciseCount change output', () => {
    expect(J({ mode: 'copy', gridSize: 2 })).not.toBe(J({ mode: 'copy', gridSize: 4 }));
    expect(J({ mode: 'copy', exerciseCount: 3 })).not.toBe(J({ mode: 'copy', exerciseCount: 8 }));
  });

  it('mirror & closure: exerciseCount changes output', () => {
    expect(J({ mode: 'mirror', exerciseCount: 3 })).not.toBe(J({ mode: 'mirror', exerciseCount: 8 }));
    expect(J({ mode: 'closure', exerciseCount: 3 })).not.toBe(J({ mode: 'closure', exerciseCount: 8 }));
  });

  it('pattern: grid-size preset changes output', () => {
    expect(J({ mode: 'pattern', gridSize: 2, exerciseCount: 3 })).not.toBe(J({ mode: 'pattern', gridSize: 4, exerciseCount: 2 }));
  });

  it('figureGround: difficulty changes output', () => {
    expect(J({ mode: 'figureGround', difficulty: 'easy' })).not.toBe(J({ mode: 'figureGround', difficulty: 'hard' }));
  });

  it('maze: size and shape change the maze', () => {
    expect(gen({ mode: 'maze', mazeSize: 'small' }).mazeData?.rows).not.toBe(gen({ mode: 'maze', mazeSize: 'large' }).mazeData?.rows);
    expect(gen({ mode: 'maze', mazeShape: 'square' }).mazeData?.shape).toBe('square');
    expect(gen({ mode: 'maze', mazeShape: 'circle' }).mazeData?.shape).toBe('circle');
  });

  it('connectDots: shape changes the dots', () => {
    expect(J({ mode: 'connectDots', connectDotsShape: 'star' })).not.toBe(J({ mode: 'connectDots', connectDotsShape: 'heart' }));
  });

  it('tracingPaths: stroke type and rows change output', () => {
    expect(J({ mode: 'tracingPaths', tracingStrokeType: 'vertical' })).not.toBe(J({ mode: 'tracingPaths', tracingStrokeType: 'spiral' }));
    expect(J({ mode: 'tracingPaths', tracingRows: 2 })).not.toBe(J({ mode: 'tracingPaths', tracingRows: 6 }));
  });

  it('scissorSkills: line type and count change output', () => {
    expect(J({ mode: 'scissorSkills', scissorLineType: 'straight' })).not.toBe(J({ mode: 'scissorSkills', scissorLineType: 'zigzag' }));
    expect(J({ mode: 'scissorSkills', scissorLineCount: 3 })).not.toBe(J({ mode: 'scissorSkills', scissorLineCount: 10 }));
  });

  it('visualScanning: target, density and frequency change output', () => {
    expect(J({ mode: 'visualScanning', visualScanTarget: 'b' })).not.toBe(J({ mode: 'visualScanning', visualScanTarget: 'p' }));
    expect(J({ mode: 'visualScanning', visualScanDensity: 'small' })).not.toBe(J({ mode: 'visualScanning', visualScanDensity: 'large' }));
    expect(J({ mode: 'visualScanning', visualScanTargetCount: 'few' })).not.toBe(J({ mode: 'visualScanning', visualScanTargetCount: 'many' }));
  });

  it('pixelArt: theme changes the grid', () => {
    expect(J({ mode: 'pixelArt', pixelArtTheme: 'heart' })).not.toBe(J({ mode: 'pixelArt', pixelArtTheme: 'star' }));
  });

  it('handwriting: text, rows, font size and sub-mode change output', () => {
    expect(J({ mode: 'handwriting', handwritingText: 'cat' })).not.toBe(J({ mode: 'handwriting', handwritingText: 'dog' }));
    expect(J({ mode: 'handwriting', handwritingRows: 2 })).not.toBe(J({ mode: 'handwriting', handwritingRows: 8 }));
    expect(J({ mode: 'handwriting', handwritingFontSizeMm: 10 })).not.toBe(J({ mode: 'handwriting', handwritingFontSizeMm: 30 }));
  });

  it('traceName: childName drives the letters', () => {
    // Since D1, names render in their natural mixed case (not force-uppercased).
    expect(gen({ mode: 'traceName', childName: 'Alex' }).traceNameData?.letters).toEqual(['A', 'l', 'e', 'x']);
    expect(J({ mode: 'traceName', childName: 'Alex' })).not.toBe(J({ mode: 'traceName', childName: 'Maya' }));
  });

  it('customInstruction reaches the worksheet instructions', () => {
    expect(gen({ mode: 'find', customInstruction: 'ZZZ-UNIQUE' }).instructions).toContain('ZZZ-UNIQUE');
  });
});

// ---------------------------------------------------------------------------
// RENDER-ONLY controls — changing them must change the rendered SVG.
// ---------------------------------------------------------------------------
describe('render-only controls change the SVG', () => {
  const base = { mode: 'find' as const };
  const data = gen(base);
  const diff = (a: Partial<WorksheetConfig>, b: Partial<WorksheetConfig>) =>
    expect(svg({ ...base, ...a }, data)).not.toBe(svg({ ...base, ...b }, data));

  it('useColor', () => diff({ useColor: true }, { useColor: false }));
  it('borderStyle', () => diff({ borderStyle: 'plain' }, { borderStyle: 'dotted' }));
  it('instructionFontSize', () => diff({ instructionFontSize: 'small' }, { instructionFontSize: 'large' }));
  it('instructionBold', () => diff({ instructionBold: false }, { instructionBold: true }));
  it('headerBold', () => diff({ headerBold: false }, { headerBold: true }));
  it('showAnswerKey', () => diff({ showAnswerKey: false }, { showAnswerKey: true }));
  it('showReward', () => diff({ showReward: false }, { showReward: true }));

  it('childName appears in the header', () => {
    expect(svg({ mode: 'find', childName: 'Zoe-Test' }, data)).toContain('Zoe-Test');
  });

  it('tracingThickness changes the SVG', () => {
    const d = gen({ mode: 'tracingPaths' });
    expect(svg({ mode: 'tracingPaths', tracingThickness: 'thick' }, d)).not.toBe(svg({ mode: 'tracingPaths', tracingThickness: 'thin' }, d));
  });

  it('visualScan char size & dyslexia font change the SVG', () => {
    const d = gen({ mode: 'visualScanning' });
    expect(svg({ mode: 'visualScanning', visualScanCharSize: 'large' }, d)).not.toBe(svg({ mode: 'visualScanning', visualScanCharSize: 'small' }, d));
    expect(svg({ mode: 'visualScanning', visualScanFontStyle: 'standard' }, d)).not.toBe(svg({ mode: 'visualScanning', visualScanFontStyle: 'dyslexia' }, d));
  });

  it('pixelArt B&W changes the SVG', () => {
    const d = gen({ mode: 'pixelArt' });
    expect(svg({ mode: 'pixelArt', pixelArtBW: false }, d)).not.toBe(svg({ mode: 'pixelArt', pixelArtBW: true }, d));
  });

  it('traceName renders the letter strokes (not an empty body)', () => {
    // Regression: traceName must route to renderTraceNameMode, which draws the
    // reference letters as <polyline>s. A mis-route to handwriting renders nothing.
    const out = svg({ mode: 'traceName', childName: 'Emma' });
    expect(out).toContain('polyline');
    expect(svg({ mode: 'traceName', childName: 'Alex' })).not.toBe(svg({ mode: 'traceName', childName: 'Maya' }));
  });

  it('handwriting coloured lines & line mode change the SVG', () => {
    const d = gen({ mode: 'handwriting', handwritingLayout: 'triline', handwritingText: 'abc' });
    expect(svg({ mode: 'handwriting', handwritingShowColoredLines: true, handwritingLineColor: 'red' }, d))
      .not.toBe(svg({ mode: 'handwriting', handwritingShowColoredLines: true, handwritingLineColor: 'green' }, d));
    expect(svg({ mode: 'handwriting', handwritingLineMode: '3-line' }, d))
      .not.toBe(svg({ mode: 'handwriting', handwritingLineMode: '4-line' }, d));
  });
});

// ---------------------------------------------------------------------------
// DECORATION layer (design B2/B3). Safety-critical half: doodles must NEVER
// appear on perception/matching sheets, where an extra outline can read as
// task content and break solvability.
// ---------------------------------------------------------------------------
describe('decoration: instruction icons + corner doodles', () => {
  it('instruction icon matches the skill family', () => {
    expect(svg({ mode: 'find' })).toContain('data-instr-icon="eye"');
    expect(svg({ mode: 'pattern' })).toContain('data-instr-icon="puzzle"');
    expect(svg({ mode: 'scissorSkills' })).toContain('data-instr-icon="scissors"');
    expect(svg({ mode: 'handwriting', handwritingText: 'cat' })).toContain('data-instr-icon="pencil"');
    expect(svg({ mode: 'pixelArt' })).toContain('data-instr-icon="crayon"');
  });

  it('over-long custom instructions drop the icon instead of overflowing', () => {
    const longInstr = 'Circle every single shape that matches the example shown in the box at the top of this page!';
    expect(svg({ mode: 'find', customInstruction: longInstr })).not.toContain('data-instr-icon');
  });

  // Configs that make every doodle-eligible mode actually render content.
  const doodleConfigs: Partial<WorksheetConfig>[] = [
    { mode: 'handwriting', handwritingText: 'cat sat' },
    { mode: 'traceName', childName: 'Emma' },
    { mode: 'tracingPaths' },
    { mode: 'scissorSkills' },
    { mode: 'connectDots' },
    { mode: 'maze' },
  ];

  it('cornerDoodles toggle adds/removes doodles on every eligible mode', () => {
    for (const cfg of doodleConfigs) {
      const data = gen(cfg);
      expect(svg({ ...cfg, cornerDoodles: true }, data), `${cfg.mode} ON`).toContain('data-doodle');
      expect(svg({ ...cfg, cornerDoodles: false }, data), `${cfg.mode} OFF`).not.toContain('data-doodle');
    }
  });

  it('doodles are BANNED on perception/matching modes even when enabled', () => {
    const banned: WorksheetConfig['mode'][] = [
      'find', 'count', 'pattern', 'copy', 'sequence', 'oddOneOut', 'mirror',
      'figureGround', 'closure', 'visualScanning', 'pixelArt',
    ];
    for (const mode of banned) {
      expect(svg({ mode, cornerDoodles: true }), mode).not.toContain('data-doodle');
    }
  });

  it('maze corner doodle never echoes the goal-star marker', () => {
    const out = svg({ mode: 'maze', cornerDoodles: true });
    expect(out).not.toContain('data-doodle="star"');
  });

  it('7–8 age band defaults cornerDoodles off, younger bands on', async () => {
    const { ageBandConfig } = await import('@/lib/defaultConfig');
    expect(ageBandConfig('3-4').cornerDoodles).toBe(true);
    expect(ageBandConfig('5-6').cornerDoodles).toBe(true);
    expect(ageBandConfig('7-8').cornerDoodles).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SOLVABILITY / CORRECTNESS — puzzles must have exactly one right answer and
// the odd item must be visibly different. Regression tests for the 2026-07-05
// therapeutic-correctness fixes.
// ---------------------------------------------------------------------------
describe('puzzles are solvable and unambiguous', () => {
  it('closure: A/B/C options are always distinct, even with 2 selected shapes', () => {
    for (let seed = 0; seed < 60; seed++) {
      const data = generateWorksheetSeeded(
        { ...defaultConfig, mode: 'closure', selectedShapes: ['circle', 'square'], exerciseCount: 5 },
        seed
      );
      for (const p of data.closurePuzzles ?? []) {
        expect(new Set(p.options).size).toBe(3);
        expect(p.options[p.correctIndex]).toBe(p.shape);
      }
    }
  });

  it('sequence: A/B/C options are always distinct shapes', () => {
    for (let seed = 0; seed < 60; seed++) {
      const data = generateWorksheetSeeded(
        { ...defaultConfig, mode: 'sequence', selectedShapes: ['circle', 'square'], exerciseCount: 5, difficulty: 'easy' },
        seed
      );
      for (const p of data.sequencePuzzles ?? []) {
        const shapes = p.options.map((o) => o.shape);
        expect(new Set(shapes).size).toBe(3);
      }
    }
  });

  it('oddOneOut hard: the odd item is visibly different (no symmetric rotations)', () => {
    // Rotations that leave the shape looking identical.
    const symmetric: Record<string, (d: number) => boolean> = {
      circle: () => true,
      oval: (d) => d % 180 === 0,
      square: (d) => d % 90 === 0,
      rectangle: (d) => d % 180 === 0,
      cross: (d) => d % 90 === 0,
      diamond: (d) => d % 90 === 0,
      hexagon: (d) => d % 60 === 0,
    };
    for (let seed = 0; seed < 80; seed++) {
      const data = generateWorksheetSeeded(
        { ...defaultConfig, mode: 'oddOneOut', difficulty: 'hard', childAge: 8, selectedShapes: ['circle', 'square', 'triangle', 'cross'], exerciseCount: 5 },
        seed
      );
      for (const row of data.oddOneOutRows ?? []) {
        const odd = row.items[row.oddIndex];
        const base = row.items[(row.oddIndex + 1) % row.items.length];
        if (odd.shape === base.shape) {
          const delta = Math.abs((odd.rotation ?? 0) - (base.rotation ?? 0)) % 360;
          const isSame = delta === 0 || (symmetric[odd.shape]?.(delta) ?? false);
          expect(isSame).toBe(false);
        }
      }
    }
  });

  it('find + emoji: instruction no longer names an invisible shape', () => {
    const data = gen({ mode: 'find', useEmoji: true, emojiTheme: 'animals' });
    expect(data.instructions).not.toMatch(/circle|square|triangle|cross|diamond|star|rectangle|oval|heart|arrow|hexagon|pentagon/);
  });
});

// ---------------------------------------------------------------------------
// PHASE 1 — difficulty semantics now produce measurable differences, and
// visual-scan distractors match the target's case.
// ---------------------------------------------------------------------------
describe('phase 1: difficulty is meaningful across modes', () => {
  const seeded = (o: Partial<WorksheetConfig>, seed = 42) =>
    generateWorksheetSeeded({ ...defaultConfig, ...o }, seed);

  it('copy: easy uses a smaller shape palette than hard', () => {
    const palette = (o: Partial<WorksheetConfig>) => {
      const data = seeded({ mode: 'copy', selectedShapes: ['circle', 'square', 'triangle', 'cross', 'star', 'heart'], exerciseCount: 1, ...o });
      return new Set((data.copyPuzzles![0].sourceGrid).flat().map((c) => c.shape)).size;
    };
    expect(palette({ difficulty: 'easy', gridSize: 4 })).toBeLessThanOrEqual(2);
    expect(palette({ difficulty: 'hard', gridSize: 4 })).toBeGreaterThan(2);
  });

  it('mirror: shape count scales with difficulty and never fills the whole grid', () => {
    const count = (d: WorksheetConfig['difficulty']) => {
      const data = seeded({ mode: 'mirror', gridSize: 4, difficulty: d, exerciseCount: 1 });
      return data.mirrorPuzzles![0].sourceGrid.flat().filter(Boolean).length;
    };
    expect(count('easy')).toBeLessThan(count('hard'));
    expect(count('hard')).toBeLessThan(16); // leaves empty cells — still a puzzle
  });

  it('maze: easy has more open passages (fewer walls) than hard', () => {
    const walls = (d: WorksheetConfig['difficulty']) => {
      const g = seeded({ mode: 'maze', mazeSize: 'medium', difficulty: d }).mazeData!.grid;
      let n = 0;
      g.forEach((row) => row.forEach((c) => { n += [c.top, c.right, c.bottom, c.left].filter(Boolean).length; }));
      return n;
    };
    expect(walls('easy')).toBeLessThan(walls('hard'));
  });

  it('scissor: hard cutting lines differ from easy (amplitude/complexity)', () => {
    const easy = JSON.stringify(seeded({ mode: 'scissorSkills', scissorLineType: 'wavy', difficulty: 'easy' }).scissorSkillsData);
    const hard = JSON.stringify(seeded({ mode: 'scissorSkills', scissorLineType: 'wavy', difficulty: 'hard' }).scissorSkillsData);
    expect(easy).not.toBe(hard);
  });

  it('visualScanning: uppercase target gets uppercase distractors', () => {
    const data = gen({ mode: 'visualScanning', visualScanTarget: 'B', visualScanDensity: 'small' });
    const chars = data.visualScanData!.grid.flat();
    expect(chars.every((c) => c === c.toUpperCase())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D1 — lowercase name tracing (letterforms + mixed case). See DEFER_TO_FABLE D1.
// ---------------------------------------------------------------------------
describe('lowercase name tracing', () => {
  it('all 26 lowercase letters have stroke paths inside the letter box', async () => {
    const { LOWERCASE_PATHS, hasDescender } = await import('@/lib/letterPaths');
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      const strokes = LOWERCASE_PATHS[ch];
      expect(strokes, `missing path for '${ch}'`).toBeDefined();
      expect(strokes.length).toBeGreaterThan(0);
      let maxY = 0;
      for (const stroke of strokes) {
        expect(stroke.length).toBeGreaterThanOrEqual(2);
        for (const [x, y] of stroke) {
          expect(x, `'${ch}' x out of box`).toBeGreaterThanOrEqual(0);
          expect(x, `'${ch}' x out of box`).toBeLessThanOrEqual(1);
          expect(y, `'${ch}' y out of box`).toBeGreaterThanOrEqual(0);
          expect(y, `'${ch}' y below descender line`).toBeLessThanOrEqual(1.4);
          maxY = Math.max(maxY, y);
        }
      }
      // Descenders (and only descenders) dip below the baseline.
      if (hasDescender(ch)) expect(maxY, `'${ch}' should descend`).toBeGreaterThan(1);
      else expect(maxY, `'${ch}' should NOT descend`).toBeLessThanOrEqual(1.001);
    }
  });

  it('tall lowercase sticks are drawn top → bottom (teaching direction)', async () => {
    const { LOWERCASE_PATHS } = await import('@/lib/letterPaths');
    for (const ch of 'bhkl') {
      const first = LOWERCASE_PATHS[ch][0];
      expect(first[0][1], `'${ch}' first stroke should start at the top`).toBeLessThan(first[first.length - 1][1]);
    }
  });

  it('traceName preserves mixed case and normalizes single-case input', () => {
    const letters = (name: string) => gen({ mode: 'traceName', childName: name }).traceNameData!.letters;
    expect(letters('emma')).toEqual(['E', 'm', 'm', 'a']);
    expect(letters('EMMA')).toEqual(['E', 'm', 'm', 'a']);
    expect(letters('Emma')).toEqual(['E', 'm', 'm', 'a']);
    expect(letters('McKay')).toEqual(['M', 'c', 'K', 'a', 'y']);
  });

  it('lowercase and descender names render strokes (not empty)', () => {
    const out = svg({ mode: 'traceName', childName: 'bpqgy' });
    expect(out).toContain('polyline');
    // Mixed-case renders differently from a different mixed-case name.
    expect(svg({ mode: 'traceName', childName: 'EmMa' })).not.toBe(svg({ mode: 'traceName', childName: 'Emma' }));
  });
});

// ---------------------------------------------------------------------------
// D2 — pixel-art difficulty tiers. See DEFER_TO_FABLE D2.
// ---------------------------------------------------------------------------
describe('pixel art difficulty tiers', () => {
  const THEMES = ['heart', 'smiley', 'star', 'catFace', 'fish', 'house', 'sun', 'flower', 'rainbow', 'rocket'] as const;
  const SIZE: Record<string, number> = { easy: 8, medium: 10, hard: 12 };

  it('every theme × difficulty is a well-formed grid with a valid palette', () => {
    for (const theme of THEMES) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const data = gen({ mode: 'pixelArt', pixelArtTheme: theme, difficulty });
        const pa = data.pixelArtData!;
        expect(pa.grid.length, `${theme}/${difficulty} rows`).toBe(SIZE[difficulty]);
        for (const row of pa.grid) {
          expect(row.length, `${theme}/${difficulty} cols`).toBe(SIZE[difficulty]);
          for (const cell of row) {
            expect(cell, `${theme}/${difficulty} color index in palette`).toBeLessThan(pa.colorKey.length);
            expect(cell).toBeGreaterThanOrEqual(0);
          }
        }
        // A real picture uses at least one non-background color.
        expect(pa.colorKey.length).toBeGreaterThanOrEqual(2);
        expect(pa.grid.flat().some((c) => c > 0)).toBe(true);
      }
    }
  });

  it('difficulty tiers actually differ (grid + color count grows)', () => {
    for (const theme of THEMES) {
      const easy = gen({ mode: 'pixelArt', pixelArtTheme: theme, difficulty: 'easy' }).pixelArtData!;
      const hard = gen({ mode: 'pixelArt', pixelArtTheme: theme, difficulty: 'hard' }).pixelArtData!;
      expect(hard.grid.length).toBeGreaterThan(easy.grid.length);
      expect(hard.colorKey.length, `${theme}: hard should have ≥ colors of easy`).toBeGreaterThanOrEqual(easy.colorKey.length);
    }
  });
});

// ---------------------------------------------------------------------------
// AGE-BAND GRADING — age must change the task's SCOPE (search field size,
// item count, line thickness…), not just the hidden difficulty flag. This is
// what makes the Age buttons / child profiles / template age bands meaningful.
// ---------------------------------------------------------------------------
describe('age-band grading presets', () => {
  it('find: the search field grows with age (3x3 → 4x4 → 5x5)', async () => {
    const { agePresetForMode } = await import('@/lib/grading');
    expect(agePresetForMode('find', '3-4').gridSize).toBe(3);
    expect(agePresetForMode('find', '5-6').gridSize).toBe(4);
    expect(agePresetForMode('find', '7-8').gridSize).toBe(5);
    // and it reaches the generated worksheet
    const grid = (band: '3-4' | '5-6' | '7-8') =>
      gen({ mode: 'find', ...agePresetForMode('find', band) }).grid!.length;
    expect(grid('3-4')).toBe(3);
    expect(grid('7-8')).toBe(5);
  });

  it('every mode with a preset produces different configs across age bands', async () => {
    const { agePresetForMode } = await import('@/lib/grading');
    const graded: import('@/lib/shapes').WorksheetMode[] = [
      'find', 'count', 'copy', 'mirror', 'pattern', 'sequence', 'oddOneOut',
      'closure', 'maze', 'tracingPaths', 'scissorSkills', 'visualScanning', 'handwriting',
    ];
    for (const mode of graded) {
      const a = JSON.stringify(agePresetForMode(mode, '3-4'));
      const c = JSON.stringify(agePresetForMode(mode, '7-8'));
      expect(a, `${mode} should grade by age`).not.toBe(c);
    }
  });

  it('preset keys are valid WorksheetConfig fields', async () => {
    const { agePresetForMode } = await import('@/lib/grading');
    const bands = ['3-4', '5-6', '7-8'] as const;
    const modes: import('@/lib/shapes').WorksheetMode[] = [
      'find', 'count', 'copy', 'sequence', 'oddOneOut', 'mirror', 'figureGround', 'closure',
      'traceName', 'handwriting', 'maze', 'connectDots', 'tracingPaths', 'scissorSkills',
      'visualScanning', 'pixelArt', 'pattern',
    ];
    for (const mode of modes) for (const band of bands) {
      for (const key of Object.keys(agePresetForMode(mode, band))) {
        expect(key in defaultConfig, `${mode}/${band}: unknown config key '${key}'`).toBe(true);
      }
    }
  });

  it('templateConfig: curated template overrides beat the age preset', async () => {
    const { getTemplate, templateConfig } = await import('@/data/templates');
    // match-pattern (7-8) explicitly sets gridSize 3; preset would say 4.
    const t = getTemplate('match-pattern')!;
    expect(templateConfig(t).gridSize).toBe(3);
    // find-shapes has no gridSize override → the 5-6 preset (4) applies.
    const f = getTemplate('find-shapes')!;
    expect(templateConfig(f).gridSize).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// CHALLENGE — the parent-facing nudge relative to age. Replaces the old
// Advanced Easy/Medium/Hard override.
// ---------------------------------------------------------------------------
describe('challenge grading', () => {
  it('resolves age + challenge into level: 5-6 easier/standard/harder = 3x3/4x4/5x5 find', async () => {
    const { applyGrading } = await import('@/lib/grading');
    expect(applyGrading('find', '5-6', 'easier').gridSize).toBe(3);
    expect(applyGrading('find', '5-6', 'standard').gridSize).toBe(4);
    expect(applyGrading('find', '5-6', 'harder').gridSize).toBe(5);
  });

  it('difficulty ladder follows the level but respects the 3-4 age cap', async () => {
    const { applyGrading } = await import('@/lib/grading');
    expect(applyGrading('find', '3-4', 'standard').difficulty).toBe('easy');
    expect(applyGrading('find', '3-4', 'harder').difficulty).toBe('medium'); // capped, never hard
    expect(applyGrading('find', '5-6', 'harder').difficulty).toBe('hard');
    expect(applyGrading('find', '7-8', 'standard').difficulty).toBe('hard');
    expect(applyGrading('find', '7-8', 'easier').difficulty).toBe('medium');
  });

  it('7-8 vs 5-6 now differ even for difficulty-only modes (pixelArt tier)', async () => {
    const { ageBandConfig } = await import('@/lib/defaultConfig');
    const grid = (band: '5-6' | '7-8') =>
      gen({ mode: 'pixelArt', pixelArtTheme: 'heart', ...ageBandConfig(band) }).pixelArtData!.grid.length;
    expect(grid('5-6')).toBe(10);
    expect(grid('7-8')).toBe(12);
  });

  it('oddOneOut letters hard: case pairs are visually distinct (no c/C, o/O, s/S...)', () => {
    const AMBIGUOUS = new Set('cosuvwxzkjy'.split(''));
    for (let seed = 0; seed < 30; seed++) {
      const data = generateWorksheetSeeded(
        { ...defaultConfig, mode: 'oddOneOut', oddOneOutType: 'letters', difficulty: 'hard', childAge: 8, exerciseCount: 8 },
        seed
      );
      for (const row of data.oddOneOutRows ?? []) {
        const base = (row.textItems ?? []).find((t, i) => i !== row.oddIndex) ?? '';
        expect(AMBIGUOUS.has(base.toLowerCase()), `ambiguous hard pair for base '${base}'`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// GRADING AUDIT (2026-07-05 full-matrix sweep) — regressions for the two
// generator-level collapses it found. See GRADING_AUDIT.md.
// ---------------------------------------------------------------------------
describe('grading audit fixes', () => {
  it('closure: the missing-contour fraction differs at every difficulty', () => {
    const dash = (d: WorksheetConfig['difficulty']) =>
      gen({ mode: 'closure', difficulty: d, childAge: 8 }).closurePuzzles![0].dashArray;
    const gaps = new Set([dash('easy'), dash('medium'), dash('hard')]);
    expect(gaps.size).toBe(3); // easy and medium used to collapse to '8,3'
  });

  it('figureGround: shapes get visibly smaller at every difficulty step', () => {
    const avgR = (d: WorksheetConfig['difficulty']) => {
      const s = gen({ mode: 'figureGround', difficulty: d, childAge: 8 }).figureGroundPuzzle!.shapes;
      return s.reduce((a, x) => a + x.r, 0) / s.length;
    };
    expect(avgR('easy')).toBeGreaterThan(avgR('medium'));
    expect(avgR('medium')).toBeGreaterThan(avgR('hard')); // hard used to share medium's size pool
  });
});

// ---------------------------------------------------------------------------
// GRADING FOLLOW-UPS (F1–F5, 2026-07-06). See GRADING_AUDIT.md.
// ---------------------------------------------------------------------------
describe('grading follow-up fixes', () => {
  const er = (r: number) => r * 0.4;

  it('F1 figureGround: medium/hard overlap ≥60% AND stay spread out (not one clump)', () => {
    for (const difficulty of ['medium', 'hard'] as const) {
      let total = 0, overlapping = 0, spreadSum = 0;
      const N = 30;
      for (let seed = 0; seed < N; seed++) {
        const p = generateWorksheetSeeded({ ...defaultConfig, mode: 'figureGround', difficulty, childAge: 8 }, seed).figureGroundPuzzle!.shapes;
        p.forEach((a, i) => { total++; if (p.some((b, j) => i !== j && Math.hypot(a.cx - b.cx, a.cy - b.cy) < er(a.r) + er(b.r))) overlapping++; });
        const xs = p.map(s => s.cx), ys = p.map(s => s.cy);
        spreadSum += ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (400 * 400);
      }
      expect(overlapping / total, `${difficulty} overlap`).toBeGreaterThanOrEqual(0.6);
      expect(spreadSum / N, `${difficulty} spread (not clumped)`).toBeGreaterThan(0.2);
    }
  });

  it('F1 figureGround: easy stays sparse (little overlap)', () => {
    let total = 0, overlapping = 0;
    for (let seed = 0; seed < 30; seed++) {
      const p = generateWorksheetSeeded({ ...defaultConfig, mode: 'figureGround', difficulty: 'easy', childAge: 4 }, seed).figureGroundPuzzle!.shapes;
      p.forEach((a, i) => { total++; if (p.some((b, j) => i !== j && Math.hypot(a.cx - b.cx, a.cy - b.cy) < er(a.r) + er(b.r))) overlapping++; });
    }
    expect(overlapping / total).toBeLessThan(0.5);
  });

  it('F1 figureGround: answer-key counts equal the placed shapes', () => {
    for (let seed = 0; seed < 30; seed++) {
      const fg = generateWorksheetSeeded({ ...defaultConfig, mode: 'figureGround', difficulty: 'hard', childAge: 8 }, seed).figureGroundPuzzle!;
      const actual: Record<string, number> = {};
      fg.shapes.forEach(s => { actual[s.shape] = (actual[s.shape] ?? 0) + 1; });
      for (const [shape, count] of Object.entries(fg.counts)) expect(actual[shape] ?? 0).toBe(count);
    }
  });

  it('F4 visualScanning: target density falls with difficulty', () => {
    const ratio = (d: WorksheetConfig['difficulty']) => {
      const v = generateWorksheetSeeded({ ...defaultConfig, mode: 'visualScanning', difficulty: d, childAge: 8, visualScanDensity: 'medium' }, 5).visualScanData!;
      return v.targetPositions.length / (v.rows * v.cols);
    };
    expect(ratio('easy')).toBeGreaterThan(ratio('medium'));
    expect(ratio('medium')).toBeGreaterThan(ratio('hard'));
  });

  it('F5 sequence: every medium sheet contains at least one period-3 row', () => {
    for (let seed = 0; seed < 100; seed++) {
      const p = generateWorksheetSeeded({ ...defaultConfig, mode: 'sequence', difficulty: 'medium', childAge: 8, exerciseCount: 5 }, seed).sequencePuzzles!;
      expect(p.some(x => new Set(x.sequence.map(c => c.shape)).size === 3), `seed ${seed}`).toBe(true);
    }
  });

  it('F2 traceName: reference stroke weight grades by difficulty', () => {
    const refWidth = (d: WorksheetConfig['difficulty']) => {
      const out = svg({ mode: 'traceName', childName: 'Emma', difficulty: d });
      const m = out.match(/polyline[^>]*stroke-width="([\d.]+)"/);
      return m ? parseFloat(m[1]) : NaN;
    };
    expect(refWidth('easy')).toBeGreaterThan(refWidth('hard'));
  });
});
