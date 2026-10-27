// Renders a provider's week (booked sessions + accepted Auto-Plan proposals)
// as a nicely formatted .xlsx grid: 5-minute rows, Mon-Fri columns, merged
// cells for session durations, provider color for booked, accent for
// proposed, lunch marked. Student numbers only - never names.

import type { ProposedSession } from '../domain/autoSchedule';
import type { DayOfWeek, Minutes, Provider, Workspace } from '../domain/types';
import { DAY_NAMES, formatMinutes } from '../domain/types';

interface ExportOpts {
  provider: Provider;
  ws: Workspace;
  proposals?: ProposedSession[];
  lunches?: Array<{ day: DayOfWeek; start: Minutes }>;
  lunchMin?: number;
}

interface Entry {
  day: DayOfWeek;
  start: Minutes;
  end: Minutes;
  /** One line per session sharing the slot - each with its own exact times,
   * so week-A/week-B alternates keep their different lengths visible. */
  lines: Array<{ start: Minutes; end: Minutes; label: string }>;
  kind: 'booked' | 'proposed' | 'lunch';
}

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase();

/** Build the workbook (separated from download so tests can inspect cells). */
export async function buildPlanWorkbook({ provider, ws, proposals = [], lunches = [], lunchMin = 30 }: ExportOpts) {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(`${provider.name} schedule`);

  const startMin = ws.settings.schoolDayStart;
  const endMin = ws.settings.schoolDayEnd;
  const rowFor = (m: Minutes) => 2 + (m - startMin) / 5; // row 1 = header
  const displayId = (id: string) => ws.students.find((s) => s.id === id)?.displayId ?? '?';

  // Build entries: booked sessions and accepted proposals, grouped by slot so
  // alternating week-A/B pairs share one cell.
  const grouped = new Map<string, Entry>();
  const addEntry = (day: DayOfWeek, start: Minutes, len: number, label: string, kind: Entry['kind']) => {
    const key = `${kind}:${day}:${start}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.lines.push({ start, end: start + len, label });
      existing.end = Math.max(existing.end, start + len);
    } else {
      grouped.set(key, { day, start, end: start + len, lines: [{ start, end: start + len, label }], kind });
    }
  };

  for (const s of ws.sessions.filter((x) => x.providerId === provider.id)) {
    const tag = s.recurrence === 'biweekly' ? ` (wk ${s.weekParity})` : '';
    const note = s.note ? ` · ${s.note}` : '';
    addEntry(s.day, s.start, s.durationMin, `St ${s.studentIds.map(displayId).join(', ')}${tag}${note}`, 'booked');
  }
  for (const p of proposals) {
    const tag = p.recurrence === 'biweekly' ? ` (wk ${p.weekParity})` : '';
    addEntry(p.day, p.start, p.durationMin, `St ${p.studentIds.map(displayId).join(', ')}${tag}`, 'proposed');
  }
  for (const l of lunches) {
    addEntry(l.day, l.start, lunchMin, 'Lunch', 'lunch');
  }

  // Header row.
  sheet.getCell(1, 1).value = 'Time';
  for (let d = 0; d < 5; d++) sheet.getCell(1, d + 2).value = DAY_NAMES[d];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };
  sheet.getColumn(1).width = 8;
  for (let c = 2; c <= 6; c++) sheet.getColumn(c).width = 22;

  // Time labels every 15 minutes.
  for (let m = startMin; m < endMin; m += 5) {
    if (m % 15 === 0) sheet.getCell(rowFor(m), 1).value = formatMinutes(m);
    sheet.getRow(rowFor(m)).height = 11;
  }
  sheet.getColumn(1).font = { size: 8, color: { argb: 'FF888888' } };

  // Gray out off-site time.
  const availByDay = new Map<number, Array<{ start: number; end: number }>>();
  for (const a of provider.availability) {
    const list = availByDay.get(a.day) ?? [];
    list.push({ start: a.start, end: a.end });
    availByDay.set(a.day, list);
  }
  for (let d = 0; d < 5; d++) {
    const avail = availByDay.get(d) ?? [];
    for (let m = startMin; m < endMin; m += 5) {
      const onSite = avail.some((a) => m >= a.start && m + 5 <= a.end);
      if (!onSite) {
        sheet.getCell(rowFor(m), d + 2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEEEEE' },
        };
      }
    }
  }

  const fills: Record<Entry['kind'], string> = {
    booked: argb(provider.color),
    proposed: 'FFC75B39',
    lunch: 'FFF6E3B4',
  };

  // Sort so shorter/later entries don't collide with an earlier merge; if a
  // merge overlaps something already merged (team rows), fall back to writing
  // into the first free cell without merging.
  const entries = [...grouped.values()].sort((a, b) => a.day - b.day || a.start - b.start);
  const used = new Set<string>();
  for (const e of entries) {
    const col = e.day + 2;
    const r1 = rowFor(e.start);
    const r2 = rowFor(e.end) - 1;
    let collision = false;
    for (let r = r1; r <= r2; r++) if (used.has(`${r}:${col}`)) collision = true;
    const top = collision ? r1 : r1;
    if (!collision) {
      for (let r = r1; r <= r2; r++) used.add(`${r}:${col}`);
      if (r2 > r1) sheet.mergeCells(r1, col, r2, col);
    }
    const cell = sheet.getCell(top, col);
    cell.value = e.lines
      .map((l) => `${formatMinutes(l.start)}-${formatMinutes(l.end)} ${l.label}`)
      .join('\n');
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.font = { size: 9, bold: true, color: { argb: e.kind === 'lunch' ? 'FF7A5C00' : 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fills[e.kind] } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Legend under the grid.
  const legendRow = rowFor(endMin) + 2;
  sheet.getCell(legendRow, 1).value = `${provider.name} - booked & planned schedule (student ID numbers only)`;
  sheet.getCell(legendRow, 1).font = { italic: true, size: 9 };

  return wb;
}

export async function exportPlanXlsx(opts: ExportOpts) {
  const wb = await buildPlanWorkbook(opts);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.provider.name}-schedule-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
