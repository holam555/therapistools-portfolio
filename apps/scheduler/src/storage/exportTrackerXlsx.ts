// Excel export for the IEP tracker. Same shape as the paper tracker it
// replaces, with one deliberate change: the student column carries the
// app's student number, never a name.

import type { IepCase, Workspace } from '../domain/types';
import { IEP_STEPS } from '../domain/types';
import { serviceSummary } from '../domain/iepTracker';
import { goalProgress, isoDate, owedMakeups } from '../domain/serviceLog';

function download(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportIepXlsx(ws: Workspace, cases: IepCase[], schoolName: string) {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('IEP tracker');

  const header = [
    'Student',
    'Grade',
    'School',
    'Date Due',
    'IN/RE/AN',
    'Services',
    'Services (indirect)',
    'Booked/week',
    'Progress',
    'Owed make-up',
    ...IEP_STEPS.map(([, label]) => label),
    'Notes',
  ];
  sheet.addRow(header);
  sheet.getRow(1).font = { bold: true };

  for (const c of cases) {
    const student = ws.students.find((s) => s.id === c.studentId);
    const grade = ws.grades.find((g) => g.id === student?.gradeId);
    const services = serviceSummary(ws, c.studentId);
    sheet.addRow([
      student ? `Student ${student.displayId}` : '?',
      grade?.name ?? '',
      schoolName,
      c.dateDue,
      c.kind,
      services.direct,
      services.indirect,
      services.bookedPerWeek ? `${services.bookedPerWeek} min` : '',
      goalProgress(ws, c.studentId, isoDate(new Date()))
        .map((g) => `${g.delivered}/${g.target} ${g.label.split('/')[1]}${g.met ? ' met' : ''}`)
        .join(', '),
      (() => {
        const owed = owedMakeups(ws, c.studentId).reduce((sum, l) => sum + l.minutes, 0);
        return owed > 0 ? `${owed} min` : '';
      })(),
      ...IEP_STEPS.map(([key]) => c[key]),
      c.notes,
    ]);
  }

  sheet.columns.forEach((col, i) => {
    col.width = i === header.length - 1 ? 28 : 14;
  });

  download(
    (await wb.xlsx.writeBuffer()) as ArrayBuffer,
    `iep-tracker-${schoolName.replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
