/**
 * Where this app lives on the web. The worksheet generator is one tool inside
 * the Therapistools site, mounted under /worksheets. The site address itself
 * lives in shared/brand.js; keep APP_BASE in sync with `base` in vite.config.ts.
 */
import { SITE_ORIGIN } from "../../../../shared/brand.js";

export { SITE_ORIGIN };
export const APP_BASE = "/worksheets";
export const APP_URL = `${SITE_ORIGIN}${APP_BASE}`;
/** Short form printed on worksheets. Leaves out "www." to keep the line short; the bare domain redirects to www. */
export const APP_URL_SHORT = `${SITE_ORIGIN.replace(/^https?:\/\/(www\.)?/, "")}${APP_BASE}`;
