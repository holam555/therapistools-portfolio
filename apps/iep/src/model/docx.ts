import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { Assembled } from "./assemble";

/**
 * Build a simple Word document: section headings, one paragraph per task,
 * with the domain name in bold in front of a domain's first paragraph. Unfilled blanks stay visible as [[name]]. Nothing in the
 * file identifies a student; the file name carries only the date.
 */
export function buildDocx(a: Assembled): Document {
  const children: Paragraph[] = [];
  for (const section of a.sections) {
    children.push(new Paragraph({ text: section.sectionName, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } }));
    for (const block of section.blocks)
      for (const p of block.paragraphs)
        children.push(
          new Paragraph({
            children: p.label ? [new TextRun({ text: `${p.label}: `, bold: true }), new TextRun(p.text)] : [new TextRun(p.text)],
            spacing: { after: 160 },
          }),
        );
  }
  if (children.length === 0) children.push(new Paragraph({ text: "(No sentences were selected.)" }));
  return new Document({
    creator: "Therapistools IEP Writer",
    title: "IEP draft",
    styles: {
      default: { document: { run: { font: "Calibri", size: 24 } } }, // 12 pt
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Calibri" } },
      ],
    },
    sections: [{ children }],
  });
}

export function docxToBlob(doc: Document): Promise<Blob> {
  return Packer.toBlob(doc);
}

export function docxToBuffer(doc: Document): Promise<Uint8Array> {
  return Packer.toBuffer(doc);
}

export function docxFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `IEP-draft-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.docx`;
}
