import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv, searchForWorkspaceRoot } from "vite";

// Activity Ideas, mounted at /ideas/. The page talks to two places and the
// CSP below names them exactly:
//   - the site's Supabase project (the reel list, suggestions, owner sign-in).
//     The address lives in one file, apps/iep/.env, shared with the IEP Writer.
//   - www.instagram.com, in a frame only, once a visitor opens the feed.
//     No Instagram script ever runs in this page.

const SUPABASE_ORIGIN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
export const INSTAGRAM_ORIGIN = "https://www.instagram.com";

export function cspFor(supabaseOrigin: string): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src ${supabaseOrigin || "'none'"}`,
    `frame-src ${INSTAGRAM_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../iep", "VITE_");
  const url = (env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  if (url && !SUPABASE_ORIGIN.test(url)) throw new Error(`VITE_SUPABASE_URL must look like https://<project>.supabase.co, got ${url}`);
  const on = url !== "" && key !== "";
  const cspOnBuild = {
    name: "ideas-csp",
    apply: "build" as const,
    transformIndexHtml(html: string) {
      return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspFor(on ? url : "")}" />`);
    },
  };
  return {
    // Mounted under /ideas on the Therapistools site. Routing uses the URL
    // hash, so the server needs no fallback rule for this app.
    base: "/ideas/",
    plugins: [react(), cspOnBuild],
    define: {
      __SUPABASE_URL__: JSON.stringify(on ? url : ""),
      __SUPABASE_KEY__: JSON.stringify(on ? key : ""),
    },
    server: { host: "127.0.0.1", port: 5174, fs: { allow: [searchForWorkspaceRoot("."), "../../shared"] } },
    test: { environment: "node", include: ["test/**/*.test.ts"] },
  };
});
