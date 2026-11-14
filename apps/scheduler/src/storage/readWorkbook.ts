// Extracts an .xlsx worksheet into the neutral SheetData shape the domain
// parser understands: cell text, solid-fill colors, and merged ranges.

import type { SheetCell, SheetData } from '../domain/importWorkbook';

/** Excel serial/Date/string cell → display text ("7:40" for time cells). */
function excelCellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return `${value.getUTCHours()}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'object') {
    const v = value as { richText?: Array<{ text: string }>; result?: unknown; text?: string };
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.text) return v.text;
    if (v.result !== undefined) return excelCellText(v.result);
    return '';
  }
  return String(value);
}

export async function readWorkbook(file: File): Promise<SheetData> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error('The file has no worksheets.');

  const maxRow = Math.min(sheet.rowCount, 300);
  const maxCol = Math.min(sheet.columnCount || 12, 15);
  const cells: SheetCell[][] = [];
  for (let r = 1; r <= maxRow; r++) {
    const row: SheetCell[] = [];
    for (let c = 1; c <= maxCol; c++) {
      const cell = sheet.getRow(r).getCell(c);
      const fill = cell.fill;
      let color: string | undefined;
      if (fill && fill.type === 'pattern' && fill.pattern !== 'none') {
        const argb = fill.fgColor?.argb;
        if (argb && argb.length >= 6) color = argb.slice(-6).toUpperCase();
      }
      row.push({ text: excelCellText(cell.value), color });
    }
    cells.push(row);
  }

  const colIndex = (letters: string) =>
    letters.split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  const merges = ((sheet.model.merges as string[] | undefined) ?? []).flatMap((ref) => {
    const m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!m) return [];
    return [{ c1: colIndex(m[1]), r1: Number(m[2]) - 1, c2: colIndex(m[3]), r2: Number(m[4]) - 1 }];
  });
  return { cells, merges };
}

