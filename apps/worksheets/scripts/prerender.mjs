/**
 * Build-time prerenderer. Runs after `vite build` (client) and
 * `vite build --ssr src/entry-prerender.tsx` (server bundle).
 *
 * For every route in entry-prerender's `routes`, it renders the React tree to
 * HTML and writes a static file into dist/ with a per-route <title>, meta
 * description and canonical link. Crawlers and AI answer engines that don't run
 * JS get real content; the SPA still takes over on load (createRoot).
 *
 * Robustness: if a single route throws during render, we log it and keep going
 * with the original (empty-#root) shell for that route, so one bad route never
 * fails the whole build.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const ssrEntry = pathToFileURL(join(root, 'dist-ssr', 'entry-prerender.js')).href;

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const { render, routes, canonical } = await import(ssrEntry);

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Swap the base head tags for route-specific ones. */
function applyHead(html, route) {
  const title = escapeAttr(route.title);
  const desc = escapeAttr(route.description);
  const url = canonical(route.path);
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[\s\S]*?(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:title" content=")[\s\S]*?(")/, `$1${title}$2`)
    .replace(/(<meta name="twitter:title" content=")[\s\S]*?(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[\s\S]*?(")/, `$1${desc}$2`)
    .replace(/(<meta name="twitter:description" content=")[\s\S]*?(")/, `$1${desc}$2`)
    .replace(/(<link rel="canonical" href=")[\s\S]*?(")/, `$1${escapeAttr(url)}$2`)
    .replace(/(<meta property="og:url" content=")[\s\S]*?(")/, `$1${escapeAttr(url)}$2`);
}

/** Output path: "/" -> dist/index.html, "/edit/x" -> dist/edit/x/index.html. */
function outFile(path) {
  if (path === '/') return join(dist, 'index.html');
  return join(dist, path.replace(/^\//, ''), 'index.html');
}

let ok = 0;
let failed = 0;
for (const route of routes) {
  let appHtml = '';
  try {
    appHtml = render(route.path);
  } catch (err) {
    failed++;
    console.warn(`[prerender] render failed for ${route.path}: ${err.message} — writing shell only`);
  }
  const html = applyHead(template, route).replace('<!--app-html-->', appHtml);
  const file = outFile(route.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html, 'utf8');
  ok++;
}

console.log(`[prerender] wrote ${ok} routes (${failed} rendered as shell only)`);
