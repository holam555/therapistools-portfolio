/**
 * Serves ./dist locally with the same routing rules as production
 * (see infra/Caddyfile and scripts/site-routes.mjs). No dependencies.
 *   npm run build && npm run preview   then open http://localhost:4300
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { REDIRECTS, SPA_FALLBACKS } from "./site-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT) || 4300;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};

function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const direct = join(root, clean);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  if (existsSync(join(direct, "index.html"))) return join(direct, "index.html");
  if (existsSync(direct + ".html")) return direct + ".html";
  const withSlash = clean.endsWith("/") ? clean : clean + "/";
  const spa = SPA_FALLBACKS.find((r) => withSlash.startsWith(r.prefix));
  return spa ? join(root, spa.shell) : null;
}

if (!existsSync(root)) {
  console.error("No dist/ folder. Run `npm run build` first.");
  process.exit(1);
}
createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  const redirect = REDIRECTS.find((r) => path === r.from || path === r.from + "/");
  if (redirect) {
    res.writeHead(308, { location: redirect.to });
    return res.end();
  }
  const file = resolve(path);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(port, "127.0.0.1", () => console.log(`Therapistools preview: http://localhost:${port}`));
