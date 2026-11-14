import { describe, expect, it } from 'vitest';
import { groupingWarnings } from './grouping';
import type { Workspace } from './types';
import { emptyWorkspace } from './types';

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.grades.push(
    { id: 'gK', name: 'Grade K', level: 0, templatePolarity: 'blocked', templateBlocks: [] },
    { id: 'g1', name: 'Grade 1', level: 1, templatePolarity: 'blocked', templateBlocks: [] },
    { id: 'g3', name: 'Grade 3', level: 3, templatePolarity: 'blocked', templateBlocks: [] },
    { id: 'gX', name: 'Mystery', level: undefined, templatePolarity: 'blocked', templateBlocks: [] },
  );
  const mk = (id: string, gradeId: string) => ({
    id,
    displayId: id.slice(2),
    gradeId,
    serviceGoals: [],
    overrides: [],
  });
  ws.students.push(mk('stA', 'gK'), mk('stB', 'gK'), mk('stC', 'g1'), mk('stD', 'g3'), mk('stE', 'gX'));
  return ws;
}

describe('groupingWarnings', () => {
  it('single student never warns', () => {
    const ws = fixture();
    ws.grouping.policy = 'same-grade';
    expect(groupingWarnings(['stA'], ws)).toEqual([]);
  });

  it('policy any: no grade warnings', () => {
    const ws = fixture();
    expect(groupingWarnings(['stA', 'stD'], ws)).toEqual([]);
  });

  it('same-grade: warns on mixed grades, silent on same grade', () => {
    const ws = fixture();
    ws.grouping.policy = 'same-grade';
    expect(groupingWarnings(['stA', 'stB'], ws)).toEqual([]);
    expect(groupingWarnings(['stA', 'stC'], ws)).toEqual([
      { type: 'mixed-grades', gradeNames: ['Grade K', 'Grade 1'] },
    ]);
  });

  it('adjacent-grade: allows ±1 level, warns beyond', () => {
    const ws = fixture();
    ws.grouping.policy = 'adjacent-grade';
    expect(groupingWarnings(['stA', 'stC'], ws)).toEqual([]); // K and 1
    expect(groupingWarnings(['stA', 'stD'], ws)).toEqual([
      { type: 'grade-spread', gradeNames: ['Grade K', 'Grade 3'], spread: 3 },
    ]);
  });

  it('adjacent-grade: warns when a grade has no level set', () => {
    const ws = fixture();
    ws.grouping.policy = 'adjacent-grade';
    expect(groupingWarnings(['stA', 'stE'], ws)).toEqual([
      { type: 'unknown-level', gradeNames: ['Grade K', 'Mystery'] },
    ]);
  });

  it('cannot-pair warns regardless of policy', () => {
    const ws = fixture();
    ws.grouping.cannotPairs.push(['stA', 'stB']);
    expect(groupingWarnings(['stA', 'stB'], ws)).toEqual([
      { type: 'cannot-pair', studentIds: ['stA', 'stB'] },
    ]);
    expect(groupingWarnings(['stA', 'stC'], ws)).toEqual([]);
  });
});
