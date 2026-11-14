import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { loadEnv, searchForWorkspaceRoot } from "vite";
import { fileURLToPath } from "node:url";

// Everything is bundled into one HTML file so the app can be opened by
// double-clicking it. No external script/style URLs are allowed anywhere.
//
// Two builds come out of this file:
//   vite build                 the website page. If apps/iep/.env names an
//                              account server, the CSP lets the page talk to
//                              that one origin and nothing else.
//   vite build --mode offline  the downloadable file: no account server, the
//                              supabase library is swapped for a stub, and the
//                              CSP forbids every connection (connect-src 'none').

/** Only a Supabase project address is accepted, so the CSP can never widen by accident. */
export const SUPABASE_ORIGIN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;

export function cspFor(connectOrigin: string): string {
  const connect = connectOrigin ? connectOrigin : "'none'";
  return `default-src 'self' 'unsafe-inline' data: blob:; connect-src ${connect}; img-src 'self' data: blob:;`;
}

/** The account server named in .env, or "" when it is unset or the build is offline. */
export function accountOrigin(env: Record<string, string>, offline: boolean): string {
  if (offline) return "";
  const url = (env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  if (!url && !key) return "";
  if (!url || !key) throw new Error("apps/iep/.env must set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or neither.");
  if (!SUPABASE_ORIGIN.test(url)) throw new Error(`VITE_SUPABASE_URL must look like https://<project>.supabase.co, got ${url}`);
  return url;
}

export default defineConfig(({ mode }) => {
  const offline = mode === "offline";
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const origin = accountOrigin(env, offline);
  const CSP = cspFor(origin);
  // The CSP is injected only on build because the dev server needs its own live-reload socket.
  const cspOnBuild = {
    name: "easyiep-csp",
    apply: "build" as const,
    transformIndexHtml(html: string) {
      return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
  return {
    base: "./",
    plugins: [react(), cspOnBuild, viteSingleFile()],
    define: {
      __SUPABASE_URL__: JSON.stringify(origin),
      __SUPABASE_KEY__: JSON.stringify(origin ? (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim() : ""),
    },
    resolve: offline ? { alias: { "@supabase/supabase-js": fileURLToPath(new URL("./src/account/supabase-stub.ts", import.meta.url)) } } : undefined,
    build: {
      outDir: offline ? "dist-offline" : "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: { output: { entryFileNames: "easyiep.js" } },
    },
    // Allow the shared brand files in ../../shared during development.
    server: { host: "127.0.0.1", port: 5173, fs: { allow: [searchForWorkspaceRoot(process.cwd()), "../../shared"] } },
    test: {
      environment: "node",
      include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    },
  };
});
