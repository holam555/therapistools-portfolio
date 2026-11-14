// Grouping-preference checks. These produce WARNINGS, not conflicts: the
// booking dialog shows them but never blocks the booking.

import type { Workspace } from './types';

export type GroupingWarning =
  | { type: 'mixed-grades'; gradeNames: string[] }
  | { type: 'grade-spread'; gradeNames: string[]; spread: number }
  | { type: 'cannot-pair'; studentIds: [string, string] }
  | { type: 'unknown-level'; gradeNames: string[] };

export function groupingWarnings(studentIds: string[], ws: Workspace): GroupingWarning[] {
  if (studentIds.length < 2) return [];
  const warnings: GroupingWarning[] = [];
  const students = studentIds
    .map((id) => ws.students.find((s) => s.id === id))
    .filter((s) => s !== undefined);
  const grades = students.map((s) => ws.grades.find((g) => g.id === s.gradeId));
  const gradeNames = [...new Set(grades.map((g) => g?.name ?? 'unknown grade'))];

  if (ws.grouping.policy === 'same-grade') {
    if (new Set(students.map((s) => s.gradeId)).size > 1) {
      warnings.push({ type: 'mixed-grades', gradeNames });
    }
  } else if (ws.grouping.policy === 'adjacent-grade') {
    const levels = grades.map((g) => g?.level);
    if (levels.some((l) => l === undefined)) {
      warnings.push({ type: 'unknown-level', gradeNames });
    } else {
      const nums = levels as number[];
      const spread = Math.max(...nums) - Math.min(...nums);
      if (spread > 1) warnings.push({ type: 'grade-spread', gradeNames, spread });
    }
  }

  for (const [a, b] of ws.grouping.cannotPairs) {
    if (studentIds.includes(a) && studentIds.includes(b)) {
      warnings.push({ type: 'cannot-pair', studentIds: [a, b] });
    }
  }
  return warnings;
}

export function describeGroupingWarning(w: GroupingWarning, ws: Workspace): string {
  const studentName = (id: string) =>
    `Student ${ws.students.find((s) => s.id === id)?.displayId ?? '?'}`;
  switch (w.type) {
    case 'mixed-grades':
      return `Mixed grades in one group (${w.gradeNames.join(', ')}) - your preference is same-grade groups`;
    case 'grade-spread':
      return `Grades are ${w.spread} years apart (${w.gradeNames.join(', ')}) - your preference is within 1 year`;
    case 'cannot-pair':
      return `${studentName(w.studentIds[0])} and ${studentName(w.studentIds[1])} are marked "do not group together"`;
    case 'unknown-level':
      return `Can't check grade spacing - set a numeric level for: ${w.gradeNames.join(', ')} in School Setup`;
  }
}
