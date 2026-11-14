/**
 * Fails when infra/Caddyfile and scripts/site-routes.mjs disagree about the
 * site's redirects or app fallbacks, or when a Cache-Control header in the
 * Caddyfile loses no-transform. Production routing lives in the
 * Caddyfile and local preview routing in site-routes.mjs, so a rule added to
 * one and not the other would work locally and break live (or the reverse).
 * Run by `npm test`. No dependencies.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REDIRECTS, SPA_FALLBACKS } from "./site-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const caddy = readFileSync(join(root, "infra", "Caddyfile"), "utf8");

function block(name) {
  const m = caddy.match(new RegExp(`# route: begin ${name}\\n([\\s\\S]*?)# route: end ${name}`));
  if (!m) throw new Error(`infra/Caddyfile: no "# route: begin/end ${name}" markers`);
  return m[1];
}

const problems = [];
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// Redirects: the preview answers both "/from" and "/from/", so Caddy must too.
const wantRedirects = REDIRECTS.flatMap((r) => [`${r.from} ${r.to}`, `${r.from}/ ${r.to}`]);
const haveRedirects = [...block("redirects").matchAll(/^\s*redir (\S+) (\S+) 308$/gm)].map((m) => `${m[1]} ${m[2]}`);
if (!same(wantRedirects, haveRedirects)) {
  problems.push(`redirects differ\n  site-routes.mjs: ${wantRedirects.join(", ")}\n  Caddyfile:       ${haveRedirects.join(", ")}`);
}

// App fallbacks: one handle per prefix, whose last try_files entry is the shell.
const wantSpa = SPA_FALLBACKS.map((r) => `${r.prefix} ${r.shell}`);
const haveSpa = [...block("spa").matchAll(/handle (\S+)\* \{\s*try_files \{path\} \{path\}\/index\.html \{path\}\.html (\S+)\s*\n\s*file_server/g)].map(
  (m) => `${m[1]} ${m[2]}`,
);
if (!same(wantSpa, haveSpa)) {
  problems.push(`app fallbacks differ\n  site-routes.mjs: ${wantSpa.join(", ")}\n  Caddyfile:       ${haveSpa.join(", ")}`);
}

// Every response must carry no-transform: without it Cloudflare injects its
// Web Analytics beacon into each HTML page, and the site promises none.
const cacheLines = [...caddy.matchAll(/header (?:\S+ )?Cache-Control "([^"]*)"/g)].map((m) => m[1]);
if (!cacheLines.length || cacheLines.some((v) => !v.includes("no-transform"))) {
  problems.push(`every Cache-Control header needs no-transform, found: ${JSON.stringify(cacheLines)}`);
}

if (problems.length) {
  console.error(`infra/Caddyfile is out of step with scripts/site-routes.mjs:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`Caddyfile matches site-routes.mjs and keeps no-transform (${REDIRECTS.length} redirects, ${SPA_FALLBACKS.length} app fallbacks).`);
