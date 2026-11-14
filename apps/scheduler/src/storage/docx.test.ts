import { describe, expect, it } from 'vitest';
import { packDocx, xmlEscape, zipStore } from './docx';
import { buildCardsDocumentXml, buildStudentCardsDocx } from './exportStudentCardsDocx';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const u32 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24);

describe('zipStore', () => {
  it('writes a readable local header and end-of-directory record', () => {
    const zip = zipStore([{ name: 'a.txt', bytes: encoder.encode('hello') }]);
    expect(u32(zip, 0) >>> 0).toBe(0x04034b50);
    expect(u32(zip, zip.length - 22) >>> 0).toBe(0x06054b50);
    expect(decoder.decode(zip).includes('hello')).toBe(true);
  });

  it('checksums each entry (a known CRC32 for "hello")', () => {
    const zip = zipStore([{ name: 'a.txt', bytes: encoder.encode('hello') }]);
    expect((u32(zip, 14) >>> 0).toString(16)).toBe('3610a686');
  });

  it('is deterministic, so the same workspace exports the same bytes', () => {
    const once = zipStore([{ name: 'a.txt', bytes: encoder.encode('hi') }]);
    const twice = zipStore([{ name: 'a.txt', bytes: encoder.encode('hi') }]);
    expect(Array.from(once)).toEqual(Array.from(twice));
  });
});

describe('xmlEscape', () => {
  it('escapes every metacharacter so user text cannot break the document', () => {
    expect(xmlEscape(`Bob & "co" <x> 'y'`)).toBe('Bob &amp; &quot;co&quot; &lt;x&gt; &apos;y&apos;');
  });
});

describe('packDocx', () => {
  it('includes the three parts Word needs, content types first', () => {
    const text = decoder.decode(packDocx('<w:document/>'));
    expect(text.indexOf('[Content_Types].xml')).toBeLessThan(text.indexOf('word/document.xml'));
    expect(text).toContain('_rels/.rels');
  });
});

describe('buildCardsDocumentXml', () => {
  const card = {
    studentId: '7',
    rows: [{ provider: 'OT', days: 'Monday', time: '10:30-11:00' }],
  };

  it('sizes the card at three inches across three equal columns', () => {
    const xml = buildCardsDocumentXml([card]);
    expect(xml).toContain('<w:tblW w:w="4320" w:type="dxa"/>');
    expect(xml.match(/<w:gridCol w:w="1440"\/>/g)).toHaveLength(3);
    expect(xml).toContain('<w:tblLayout w:type="fixed"/>');
  });

  it('heads the card with the student number across the full width', () => {
    const xml = buildCardsDocumentXml([card]);
    expect(xml).toContain('<w:gridSpan w:val="3"/>');
    expect(xml).toContain('Student: 7');
  });

  it('stops a card being split across two printed pages', () => {
    const xml = buildCardsDocumentXml([card]);
    expect(xml.match(/<w:cantSplit\/>/g)).toHaveLength(3); // title, header, one service
  });

  it('writes one table per student', () => {
    const xml = buildCardsDocumentXml([card, { ...card, studentId: '8' }]);
    expect(xml.match(/<w:tbl>/g)).toHaveLength(2);
  });

  it('escapes provider text rather than emitting raw markup', () => {
    const xml = buildCardsDocumentXml([{ studentId: '1', rows: [{ provider: 'A & B', days: 'Monday', time: '9-9:30' }] }]);
    expect(xml).toContain('A &amp; B');
    expect(xml).not.toContain('A & B');
  });

  it('produces a zip whose first bytes identify it as one', () => {
    const bytes = buildStudentCardsDocx([card]);
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]); // "PK"
  });
});
