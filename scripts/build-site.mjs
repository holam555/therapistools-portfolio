/**
 * Builds every tool and assembles one static site in ./dist:
 *
 *   dist/index.html, robots.txt, llms.txt   home page (apps/home)
 *   dist/shared/                             brand.css, fonts, Therapistools bar (shared/)
 *   dist/worksheets/                         apps/worksheets (prerendered SPA)
 *   dist/scheduler/                          apps/scheduler (hash-routed SPA)
 *   dist/iep/index.html                      apps/iep (single offline file)
 *   dist/iep/therapistools-iep-writer.html    same file, offered as a download
 */
import { execSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
const app = (name, ...p) => join(root, "apps", name, ...p);

function build(name) {
  console.log(`\n=== building ${name} ===`);
  execSync("npm run build", { cwd: app(name), stdio: "inherit" });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

build("worksheets");
cpSync(app("worksheets", "dist"), join(out, "worksheets"), { recursive: true });

build("scheduler");
cpSync(app("scheduler", "dist"), join(out, "scheduler"), { recursive: true });

build("iep");
mkdirSync(join(out, "iep"), { recursive: true });
copyFileSync(app("iep", "dist", "easyiep.html"), join(out, "iep", "index.html"));
copyFileSync(app("iep", "dist", "easyiep.html"), join(out, "iep", "therapistools-iep-writer.html"));

cpSync(app("home"), out, { recursive: true });
// Shared brand files (stylesheet, fonts, Therapistools bar) for the static home page.
cpSync(join(root, "shared"), join(out, "shared"), { recursive: true, filter: (src) => !src.endsWith(".d.ts") });

// Sanity checks: every entry point exists, and no local file paths leaked into the output.
const required = ["shared/brand.css", "shared/suite-bar.js", "index.html", "privacy/index.html", "robots.txt", "llms.txt", "worksheets/index.html", "scheduler/index.html", "iep/index.html"];
for (const f of required) if (!existsSync(join(out, f))) throw new Error(`missing ${f} in dist`);
function* files(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}
for (const f of files(out)) {
  if (!/\.(html|js|css|txt|xml|json)$/.test(f)) continue;
  if (readFileSync(f, "utf8").includes("/Users/")) throw new Error(`local path leaked into ${f}`);
}
console.log(`\nSite assembled in dist/ (${required.length} entry points checked).`);
