/*
 * Exports the student service cards as a Word document: one 3-inch table
 * per student, sized to be printed and cut out.
 *
 * Measurements are in twips (1/20 pt, 1440 per inch).
 */

import type { StudentCard } from '../domain/studentCards';
import { packDocx, xmlEscape } from './docx';

const CARD_WIDTH = 4320; // 3 inches
const COL_WIDTH = 1440; // 1 inch each
const FONT = 'Arial';
const FONT_HALF_POINTS = 22; // 11pt

function para(text: string, opts: { center?: boolean } = {}): string {
  const justify = opts.center ? '<w:jc w:val="center"/>' : '';
  return (
    `<w:p><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/>${justify}</w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:sz w:val="${FONT_HALF_POINTS}"/></w:rPr>` +
    `<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`
  );
}

function cell(text: string, opts: { span?: number; center?: boolean } = {}): string {
  const span = opts.span && opts.span > 1 ? `<w:gridSpan w:val="${opts.span}"/>` : '';
  const width = COL_WIDTH * (opts.span ?? 1);
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span}` +
    `<w:vAlign w:val="center"/></w:tcPr>${para(text, { center: opts.center })}</w:tc>`
  );
}

/** cantSplit keeps a card whole: printing must never slice one across two pages. */
function row(cells: string): string {
  return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr>`;
}

const BORDER = '<w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/>';

function cardTable(card: StudentCard): string {
  const head =
    `<w:tbl><w:tblPr><w:tblW w:w="${CARD_WIDTH}" w:type="dxa"/>` +
    `<w:tblBorders>${BORDER}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
    '<w:tblCellMar><w:top w:w="28" w:type="dxa"/><w:left w:w="72" w:type="dxa"/>' +
    '<w:bottom w:w="28" w:type="dxa"/><w:right w:w="72" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
    `<w:tblGrid><w:gridCol w:w="${COL_WIDTH}"/><w:gridCol w:w="${COL_WIDTH}"/><w:gridCol w:w="${COL_WIDTH}"/></w:tblGrid>`;

  const rows = [
    row(cell(`Student: ${card.studentId}`, { span: 3 })),
    row(cell('Provider', { center: true }) + cell('Days', { center: true }) + cell('Time', { center: true })),
    ...card.rows.map((r) => row(cell(r.provider) + cell(r.days) + cell(r.time))),
  ].join('');

  // A blank paragraph after each card gives the scissors somewhere to go.
  return `${head}${rows}</w:tbl><w:p/>`;
}

/** Builds word/document.xml. Separated from packaging so tests can read the XML. */
export function buildCardsDocumentXml(cards: StudentCard[]): string {
  const body = cards.map(cardTable).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    body +
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>'
  );
}

export function buildStudentCardsDocx(cards: StudentCard[]): Uint8Array {
  return packDocx(buildCardsDocumentXml(cards));
}

export function downloadStudentCardsDocx(cards: StudentCard[], filename: string): void {
  const bytes = buildStudentCardsDocx(cards);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
