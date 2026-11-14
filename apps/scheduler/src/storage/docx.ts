/*
 * A very small .docx writer.
 *
 * A .docx is a ZIP holding three XML parts. Writing those by hand is a few
 * dozen lines and keeps a public app free of another dependency, which
 * matters more here than the convenience of a full Word library. Entries
 * are stored uncompressed: the documents are a few KB of text, so the
 * saving would not pay for a deflate implementation.
 */

const encoder = new TextEncoder();

/** Escapes the five XML metacharacters. User text reaches these documents verbatim. */
export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

/**
 * Store-only ZIP. Timestamps are fixed rather than "now" so the same
 * workspace always exports byte-identical files, which is what makes the
 * output testable.
 */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.bytes);
    const size = entry.bytes.length;

    const local = Uint8Array.from([
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // stored
      ...u16(0), // time - fixed
      ...u16(0x0021), // date - 1980-01-01
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra field length
      ...nameBytes,
    ]);
    chunks.push(local, entry.bytes);

    central.push(
      Uint8Array.from([
        ...u32(0x02014b50),
        ...u16(20), // version made by
        ...u16(20), // version needed
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0x0021),
        ...u32(crc),
        ...u32(size),
        ...u32(size),
        ...u16(nameBytes.length),
        ...u16(0), // extra
        ...u16(0), // comment
        ...u16(0), // disk number
        ...u16(0), // internal attrs
        ...u32(0), // external attrs
        ...u32(offset),
        ...nameBytes,
      ]),
    );
    offset += local.length + size;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = Uint8Array.from([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralSize),
    ...u32(offset),
    ...u16(0), // comment length
  ]);

  const all = [...chunks, ...central, end];
  const total = all.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of all) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

/** Wraps a finished word/document.xml in the parts that make it a readable .docx. */
export function packDocx(documentXml: string): Uint8Array {
  return zipStore([
    { name: '[Content_Types].xml', bytes: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', bytes: encoder.encode(ROOT_RELS) },
    { name: 'word/document.xml', bytes: encoder.encode(documentXml) },
  ]);
}
