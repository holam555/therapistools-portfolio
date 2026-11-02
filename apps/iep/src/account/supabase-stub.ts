/**
 * Stands in for @supabase/supabase-js in the offline build (vite.config.ts
 * aliases the package here when mode is "offline"). That build has no account
 * server configured, so this is never called; it exists so the offline file
 * bundles no network code at all.
 */
export type SupabaseClient = never;
export function createClient(): never {
  throw new Error("The offline IEP Writer has no account server.");
}
