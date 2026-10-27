import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { searchForWorkspaceRoot } from "vite";

// Everything is bundled into one HTML file so the app can be opened by
// double-clicking it. No external script/style URLs are allowed anywhere.

// The built file carries a Content-Security-Policy that forbids every network
// connection. It is injected only on build because the dev server needs its
// own live-reload socket.
export const CSP = "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'none'; img-src 'self' data: blob:;";
const cspOnBuild = {
  name: "easyiep-csp",
  apply: "build" as const,
  transformIndexHtml(html: string) {
    return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
  },
};

export default defineConfig({
  base: "./",
  plugins: [react(), cspOnBuild, viteSingleFile()],
  build: {
    outDir: "dist",
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
});
