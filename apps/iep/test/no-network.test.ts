import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Hard rule: the only network code is the account module (src/account), and
// it only ever talks to the one origin the build names. Everything else must
// not use fetch/XHR/WebSocket or load anything from a URL. The offline
// download bundles no network code at all and forbids every connection.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

const src = join(__dirname, "..", "src");
const account = join(src, "account");

describe("no network", () => {
  it("source outside src/account has no fetch, XMLHttpRequest, WebSocket, external URLs or supabase", () => {
    for (const file of walk(src).filter((f) => !f.startsWith(account))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/\bfetch\s*\(/);
      expect(text, file).not.toMatch(/XMLHttpRequest|WebSocket|navigator\.sendBeacon|EventSource/);
      expect(text, file).not.toMatch(/https?:\/\//);
      expect(text, file).not.toMatch(/@supabase/);
    }
  });

  it("src/account has no address written into it: the server comes from the build config", () => {
    for (const file of walk(account)) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/https?:\/\//);
      expect(text, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|EventSource/);
    }
  });

  it("shared brand files it bundles make no network calls", () => {
    const shared = join(__dirname, "..", "..", "..", "shared");
    for (const file of walk(shared).filter((f) => /\.(js|css)$/.test(f))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/\bfetch\s*\(/);
      expect(text, file).not.toMatch(/XMLHttpRequest|WebSocket|navigator\.sendBeacon|EventSource|@import/);
      // CSS may only load fonts from this folder, never from a URL.
      expect(text, file).not.toMatch(/url\(\s*["']?https?:/);
    }
  });

  it("built website page has no external sources and lets connections reach one Supabase origin at most (if built)", () => {
    const dist = join(__dirname, "..", "dist", "easyiep.html");
    if (!existsSync(dist)) return;
    const html = readFileSync(dist, "utf8");
    expect(html).not.toMatch(/<(script|link|img|iframe)[^>]+(src|href)=["']https?:/i);
    expect(html).not.toMatch(/\/Users\//);
    expect(html).toMatch(/Content-Security-Policy[^>]*connect-src (?:'none'|https:\/\/[a-z0-9-]+\.supabase\.co);/);
  });

  it("built offline file forbids every connection and bundles no account code (if built)", () => {
    const dist = join(__dirname, "..", "dist", "easyiep-offline.html");
    if (!existsSync(dist)) return;
    const html = readFileSync(dist, "utf8");
    expect(html).not.toMatch(/<(script|link|img|iframe)[^>]+(src|href)=["']https?:/i);
    expect(html).not.toMatch(/\/Users\//);
    expect(html).toMatch(/Content-Security-Policy[^>]*connect-src 'none'/);
    expect(html).not.toMatch(/supabase\.co|gotrue|postgrest/i);
  });
});
