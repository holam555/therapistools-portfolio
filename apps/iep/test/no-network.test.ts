import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Hard rule: no external network calls. Source must not use fetch/XHR/WebSocket
// or load anything from a URL, and the built file must not reference one.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

describe("no network", () => {
  it("source code has no fetch, XMLHttpRequest, WebSocket, or external URLs", () => {
    const src = join(__dirname, "..", "src");
    for (const file of walk(src)) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/\bfetch\s*\(/);
      expect(text, file).not.toMatch(/XMLHttpRequest|WebSocket|navigator\.sendBeacon|EventSource/);
      expect(text, file).not.toMatch(/https?:\/\//);
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

  it("built page has no external script, link, or image sources (if built)", () => {
    const dist = join(__dirname, "..", "dist", "index.html");
    if (!existsSync(dist)) return;
    const html = readFileSync(dist, "utf8");
    expect(html).not.toMatch(/<(script|link|img|iframe)[^>]+(src|href)=["']https?:/i);
    expect(html).not.toMatch(/\/Users\//);
    expect(html).toMatch(/Content-Security-Policy[^>]*connect-src 'none'/);
  });
});
