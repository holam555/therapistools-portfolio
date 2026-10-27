import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from "docx";
import type { PronounSet } from "../model/types";
import type { ReportSection, ReportValues } from "./types";
import { renderSection, type Run } from "./render";

/**
 * The Word draft: the report's headings, fixed wording and sentence openers,
 * with he/she filled in, [STUDENT] once per section, values the writer chose
 * written in, and every blank still empty highlighted yellow.
 */

function runs(rs: Run[], bold = false): TextRun[] {
  // Only set bold when on: an explicit "bold off" mark is misread as bold by some converters.
  return rs.map((r) => new TextRun({ text: r.text, ...(bold ? { bold: true } : {}), ...(r.blank ? { highlight: "yellow" } : {}) }));
}

export function buildReportDocx(title: string, sections: ReportSection[], pronoun: PronounSet, values: ReportValues = {}): Document {
  const children: Paragraph[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT, spacing: { after: 240 } })];
  let numberedInstance = 0;
  for (const s of sections) {
    children.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 } }));
    numberedInstance++;
    for (const b of renderSection(s, pronoun, values)) {
      const label = b.label ? [new TextRun({ text: `${b.label}${b.kind === "bullet" ? " – " : ": "}`, bold: true })] : [];
      if (b.kind === "subheading" || b.kind === "heading") {
        children.push(new Paragraph({ children: runs(b.runs, true), spacing: { before: 200, after: 80 } }));
      } else if (b.kind === "bullet") {
        children.push(new Paragraph({ children: [...label, ...runs(b.runs)], numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 } }));
      } else if (b.kind === "numbered") {
        children.push(
          new Paragraph({ children: runs(b.runs), numbering: { reference: "objectives", level: 0, instance: numberedInstance }, spacing: { after: 80 } }),
        );
      } else {
        children.push(new Paragraph({ children: [...label, ...runs(b.runs)], spacing: { after: 140 } }));
      }
    }
  }
  return new Document({
    creator: "Therapistools IEP Writer",
    title,
    styles: {
      default: { document: { run: { font: "Calibri", size: 24 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { size: 36, bold: true, font: "Calibri" } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Calibri" } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "objectives", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 } } }, children }],
  });
}

export function reportDocxBlob(doc: Document): Promise<Blob> {
  return Packer.toBlob(doc);
}
export function reportDocxBuffer(doc: Document): Promise<Uint8Array> {
  return Packer.toBuffer(doc);
}
