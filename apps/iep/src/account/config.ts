/**
 * Where the account server is. The values come from apps/iep/.env at build
 * time (vite.config.ts); the offline download gets empty strings, so it never
 * shows a sign-in button and never opens a connection.
 */
const read = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const SUPABASE_URL = read(typeof __SUPABASE_URL__ === "undefined" ? "" : __SUPABASE_URL__).replace(/\/+$/, "");
export const SUPABASE_KEY = read(typeof __SUPABASE_KEY__ === "undefined" ? "" : __SUPABASE_KEY__);

/** Accounts exist only when both values are set. */
export function accountEnabled(): boolean {
  return SUPABASE_URL !== "" && SUPABASE_KEY !== "";
}
