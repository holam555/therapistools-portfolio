import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isGrade, isSkill } from "./taxonomy";
import type { Kind, Reel, Status } from "./reels";

/**
 * The only network code in this app. It talks to the site's Supabase project:
 * reading the published reel list (anyone), sending a suggestion (anyone,
 * lands as "pending"), and the owner's edits after sign-in. What each caller
 * may do is enforced by the database (supabase/migrations), not by this file.
 */
const URL_ = typeof __SUPABASE_URL__ === "undefined" ? "" : __SUPABASE_URL__;
const KEY = typeof __SUPABASE_KEY__ === "undefined" ? "" : __SUPABASE_KEY__;
export const backendEnabled = URL_ !== "" && KEY !== "";

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  // The same session store as the IEP Writer, so one sign-in covers both.
  client ??= createClient(URL_, KEY, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "easyiep.auth" } });
  return client;
}

const TABLE = "ideas_reels";
interface Row {
  code: string;
  kind: string;
  title: string;
  how_to: string;
  creator_handle: string;
  skill_areas: string[];
  grade_bands: string[];
  status: string;
  source: string;
  submitter_name: string;
  submitter_note: string;
  created_at: string;
}

export function fromRow(r: Row): Reel {
  return {
    code: r.code,
    kind: r.kind === "p" ? "p" : "reel",
    title: r.title ?? "",
    howTo: r.how_to ?? "",
    creator: r.creator_handle ?? "",
    skills: (r.skill_areas ?? []).filter(isSkill),
    grades: (r.grade_bands ?? []).filter(isGrade),
    status: (["pending", "published", "rejected", "unpublished"].includes(r.status) ? r.status : "pending") as Status,
    source: r.source === "submission" ? "submission" : "owner",
    submitterName: r.submitter_name ?? "",
    submitterNote: r.submitter_note ?? "",
    createdAt: r.created_at ?? "",
  };
}

function toRow(r: Reel) {
  return {
    code: r.code,
    kind: r.kind,
    title: r.title.trim(),
    how_to: r.howTo.trim(),
    creator_handle: r.creator.trim().replace(/^@/, ""),
    skill_areas: r.skills,
    grade_bands: r.grades,
    status: r.status,
    source: r.source,
    submitter_name: r.submitterName.trim(),
    submitter_note: r.submitterNote.trim(),
  };
}

/** Published reels for visitors; every reel for the owner (the database decides which). Newest first. */
export async function fetchReels(): Promise<Reel[]> {
  const { data, error } = await sb().from(TABLE).select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return (data as Row[]).map(fromRow);
}

export type SuggestResult = "ok" | "duplicate" | "error";

/** A visitor's suggestion. It is stored as pending and shown to nobody until the owner publishes it. */
export async function suggestReel(s: { kind: Kind; code: string; note: string; name: string; skill: string }): Promise<SuggestResult> {
  const { error } = await sb()
    .from(TABLE)
    .insert({ code: s.code, kind: s.kind, status: "pending", source: "submission", submitter_note: s.note.trim().slice(0, 300), submitter_name: s.name.trim().slice(0, 60), skill_areas: isSkill(s.skill) ? [s.skill] : [] });
  if (!error) return "ok";
  return error.code === "23505" ? "duplicate" : "error";
}

// --- Owner only (the database refuses these for anyone else) ---

export async function saveReel(r: Reel): Promise<void> {
  const { error } = await sb().from(TABLE).upsert(toRow(r), { onConflict: "code" });
  if (error) throw new Error(error.message);
}

export async function addReels(reels: Reel[]): Promise<void> {
  const { error } = await sb().from(TABLE).upsert(reels.map(toRow), { onConflict: "code", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function deleteReel(code: string): Promise<void> {
  const { error } = await sb().from(TABLE).delete().eq("code", code);
  if (error) throw new Error(error.message);
}

export async function isOwner(): Promise<boolean> {
  const { data: s } = await sb().auth.getSession();
  if (!s.session) return false;
  const { data, error } = await sb().rpc("ideas_is_admin");
  return !error && data === true;
}

/** True when this browser holds a session, without any network request. */
export function hasStoredSession(): boolean {
  try {
    return localStorage.getItem("easyiep.auth") !== null;
  } catch {
    return false;
  }
}

export async function sendCode(email: string): Promise<void> {
  const { error } = await sb().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await sb().auth.verifyOtp({ email, token: code.replace(/\s+/g, ""), type: "email" });
  if (error) throw new Error(error.message);
}
