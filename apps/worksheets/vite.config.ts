import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Mounted under /worksheets on the Therapistools site (see src/lib/site.ts).
  base: "/worksheets/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Allow the shared brand files in ../../shared during development.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), path.resolve(__dirname, "../../shared")] },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure a single React instance in dev (avoids "Invalid hook call / more
    // than one copy of React" if a dependency pulls in its own copy).
    dedupe: ["react", "react-dom"],
  },
}));
