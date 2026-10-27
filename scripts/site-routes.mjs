/**
 * Where each tool lives on the site. Shared by the build and the local preview
 * server so both agree; infra/Caddyfile mirrors the same rules for production
 * (scripts/check-caddy-routes.mjs fails when they drift).
 */
/** Permanent redirects (old address -> new address). */
export const REDIRECTS = [
  { from: "/worksheets/privacy", to: "/privacy/#worksheets" },
];

export const SPA_FALLBACKS = [
  // Single-page apps: any unknown path under the prefix serves the app shell.
  { prefix: "/worksheets/", shell: "/worksheets/index.html" },
  { prefix: "/scheduler/", shell: "/scheduler/index.html" },
];
