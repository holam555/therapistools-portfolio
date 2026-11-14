import JSZip from "jszip";

/**
 * Read a Word file into paragraphs and tables with just the formatting the
 * template builder cares about: bold, italic, colour, highlight, heading
 * styles and list items. Runs out of the way: struck-through text is dropped.
 * Everything happens in the browser; the file never leaves it.
 */

export interface DocRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Hex colour from the file when it isn't black or automatic, e.g. "FF0000". */
  color?: string;
  /** Highlight name from the file, e.g. "yellow", "green". */
  highlight?: string;
}

export type DocItem =
  | { kind: "para"; runs: DocRun[]; heading?: number; list?: boolean }
  | { kind: "table"; rows: DocRun[][][] };

// Elements and attributes are matched by their "w:" qualified names, as document.xml always writes them.
const isOn = (el: Element | null) => !!el && !["0", "false", "off"].includes(el.getAttribute("w:val") ?? "");

function firstChild(el: Element, name: string): Element | null {
  for (const c of Array.from(el.children)) if (c.localName === name) return c;
  return null;
}

function runsOf(p: Element): DocRun[] {
  const runs: DocRun[] = [];
  for (const r of Array.from(p.getElementsByTagName("w:r"))) {
    // Runs inside a nested table's paragraphs belong to that table.
    if (r.closest("w\\:tc") !== p.closest("w\\:tc")) continue;
    const pr = firstChild(r, "rPr");
    if (pr && (isOn(firstChild(pr, "strike")) || isOn(firstChild(pr, "dstrike")))) continue;
    let text = "";
    for (const c of Array.from(r.children)) {
      if (c.localName === "t") text += c.textContent ?? "";
      else if (c.localName === "tab") text += "\t";
      else if (c.localName === "br" || c.localName === "cr") text += "\n";
      else if (c.localName === "sym") text += "☐";
    }
    if (!text) continue;
    const run: DocRun = { text };
    if (pr) {
      if (isOn(firstChild(pr, "b"))) run.bold = true;
      if (isOn(firstChild(pr, "i"))) run.italic = true;
      const color = firstChild(pr, "color")?.getAttribute("w:val")?.toUpperCase();
      if (color && color !== "AUTO" && color !== "000000") run.color = color;
      const hl = firstChild(pr, "highlight")?.getAttribute("w:val");
      if (hl && hl !== "none") run.highlight = hl;
      const shade = firstChild(pr, "shd")?.getAttribute("w:fill")?.toUpperCase();
      if (!run.highlight && shade && shade !== "AUTO" && shade !== "FFFFFF") run.highlight = "shaded";
    }
    runs.push(run);
  }
  return runs;
}

function paraItem(p: Element): DocItem {
  const pr = firstChild(p, "pPr");
  const item: DocItem = { kind: "para", runs: runsOf(p) };
  const style = pr ? firstChild(pr, "pStyle")?.getAttribute("w:val") ?? "" : "";
  const m = /^(?:Heading|heading)\s?(\d)$/.exec(style);
  if (m) item.heading = Number(m[1]);
  else if (/^Title$/i.test(style)) item.heading = 0;
  if (pr && firstChild(pr, "numPr")) item.list = true;
  return item;
}

function tableItem(tbl: Element): DocItem {
  const rows: DocRun[][][] = [];
  for (const tr of Array.from(tbl.children)) {
    if (tr.localName !== "tr") continue;
    const cells: DocRun[][] = [];
    for (const tc of Array.from(tr.children)) {
      if (tc.localName !== "tc") continue;
      const runs: DocRun[] = [];
      for (const p of Array.from(tc.children)) {
        if (p.localName !== "p") continue;
        const r = runsOf(p);
        if (runs.length && r.length) runs.push({ text: "\n" });
        runs.push(...r);
      }
      cells.push(runs);
    }
    rows.push(cells);
  }
  return { kind: "table", rows };
}

/** The document's body as paragraphs and tables, in order. */
export function itemsFromDocumentXml(xml: string): DocItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = doc.getElementsByTagName("w:body")[0];
  if (!body) throw new Error("This file does not look like a Word document.");
  const items: DocItem[] = [];
  const walk = (parent: Element) => {
    for (const el of Array.from(parent.children)) {
      if (el.localName === "p") items.push(paraItem(el));
      else if (el.localName === "tbl") items.push(tableItem(el));
      else if (el.localName === "sdt" || el.localName === "sdtContent") walk(el);
    }
  };
  walk(body);
  return items;
}

export async function readDocx(data: ArrayBuffer | Uint8Array): Promise<DocItem[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error("That file could not be opened. Save it as a Word document (.docx) and try again.");
  }
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("This file does not look like a Word document (.docx).");
  return itemsFromDocumentXml(await file.async("string"));
}

export const runsText = (runs: DocRun[]) => runs.map((r) => r.text).join("");

/**
 * Pasted text as items: one paragraph per line; lines with tabs or vertical
 * bars in a row form a table. Formatting is unknown, so headings are guessed
 * later from the words alone.
 */
export function itemsFromText(text: string): DocItem[] {
  const items: DocItem[] = [];
  let table: DocRun[][][] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    // Keep trailing tabs: they are empty cells at the end of a table row.
    const line = raw.replace(/[ \r]+$/, "");
    const cells = line.includes("\t") ? line.split("\t") : line.includes(" | ") ? line.split(" | ") : null;
    if (cells && cells.length >= 2) {
      if (!table) {
        table = [];
        items.push({ kind: "table", rows: table });
      }
      table.push(cells.map((c) => [{ text: c.trim() }]));
      continue;
    }
    table = null;
    if (!line.trim()) continue;
    const m = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
    items.push({ kind: "para", runs: [{ text: (m ? m[1] : line).trim() }], ...(m ? { list: true } : {}) });
  }
  return items;
}
