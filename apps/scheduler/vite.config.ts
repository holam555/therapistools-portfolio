import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Mounted under /scheduler on the Therapistools site. Routing uses the URL
  // hash, so only asset paths depend on this.
  base: '/scheduler/',
  plugins: [react()],
  // Allow the shared brand files in ../../shared during development.
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../../shared'] } },
})
