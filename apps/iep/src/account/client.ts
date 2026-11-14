import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, accountEnabled } from "./config";

/** Where supabase-js keeps the session in this browser (rule 7: internal names stay). */
export const AUTH_STORAGE_KEY = "easyiep.auth";

let client: SupabaseClient | null = null;

/**
 * The one client, made on first use. PKCE is the flow for code that runs in a
 * browser: the sign-in redirect returns a one-time code that only this browser
 * can exchange. Nothing connects until someone signs in (or has before).
 */
export function supabase(): SupabaseClient | null {
  if (!accountEnabled()) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_STORAGE_KEY },
  });
  return client;
}
