import type { DisciplineId } from "../model/disciplines";
import { buildAllowList, scanText, type PrivacyWarning } from "../model/privacy";
import type { Library } from "../model/types";
import { loadPack, normalizePack, savePack } from "../report/pack";
import { templateWords } from "../report/privacy-words";
import { supabase } from "./client";
import type { TemplateKind } from "./events";

/**
 * What an account holds: the writer's template pack for each discipline, and
 * nothing else. Drafts, filled values, ratings, recipes and the sentence
 * library are never read here, so they can never be uploaded. Rows of the
 * retired kind "overrides" are neither read nor removed.
 */
export const KINDS: TemplateKind[] = ["pack"];
export const TABLE = "templates";

// ---------- the browser's copy ----------

/** The template saved in this browser, or null when there is none. */
export function readLocal(d: DisciplineId, _kind: TemplateKind): unknown | null {
  return loadPack(d);
}

/** Replace the browser's copy with the account's. Null removes it. */
export function writeLocal(d: DisciplineId, _kind: TemplateKind, data: unknown | null): void {
  savePack(d, normalizePack(data));
}

// ---------- comparing copies ----------

/**
 * JSON with keys in a fixed order, so the same template reads the same whether
 * it came from this browser or from the database (which reorders keys).
 * Empty string stands for "no template".
 */
export function canon(data: unknown): string {
  if (data === null || data === undefined) return "";
  return stable(data);
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

export type SyncDecision = "none" | "upload" | "download" | "conflict";

/**
 * Which way a template should move. `lastSynced` is the copy both sides agreed
 * on last time this browser talked to this account (null when they never have).
 * The side that changed since then wins; when both changed, the writer decides.
 */
export function decide(local: string, remote: string, lastSynced: string | null): SyncDecision {
  if (local === remote) return "none";
  if (lastSynced === null) {
    if (!local) return "download";
    if (!remote) return "upload";
    return "conflict";
  }
  if (local === lastSynced) return "download";
  if (remote === lastSynced) return "upload";
  return "conflict";
}

const SYNCED_KEY = (userId: string, d: DisciplineId, kind: TemplateKind) => `easyiep.account.synced.${userId}.${d}.${kind}`;

export function readLastSynced(userId: string, d: DisciplineId, kind: TemplateKind): string | null {
  try {
    return localStorage.getItem(SYNCED_KEY(userId, d, kind));
  } catch {
    return null;
  }
}

export function writeLastSynced(userId: string, d: DisciplineId, kind: TemplateKind, canonical: string): void {
  try {
    localStorage.setItem(SYNCED_KEY(userId, d, kind), canonical);
  } catch {
    /* storage unavailable */
  }
}

// ---------- the privacy gate ----------

/** Every piece of text in a template, for the privacy check. */
export function templateStrings(data: unknown, out: string[] = []): string[] {
  if (typeof data === "string") out.push(data);
  else if (Array.isArray(data)) for (const v of data) templateStrings(v, out);
  else if (data && typeof data === "object") for (const v of Object.values(data as Record<string, unknown>)) templateStrings(v, out);
  return out;
}

export interface TemplateCheck {
  /** Dates, phone numbers, email addresses and never-allow words: the template is not uploaded while these are in it. */
  blocking: PrivacyWarning[];
  /** Capitalised words the check does not know. Shown so the writer can look; test and product names land here too. */
  names: PrivacyWarning[];
}

/**
 * Run before anything is uploaded. A template is wording, not a report, so it
 * should never hold a full date, a phone number, an email address or a word on
 * the writer's never-allow list; if it does, it stays in the browser until fixed.
 */
export function checkTemplate(data: unknown, lib: Library): TemplateCheck {
  const allow = buildAllowList(lib);
  for (const w of templateWords()) allow.add(w);
  const warnings = scanText(templateStrings(data).join("\n"), { neverAllow: lib.neverAllow, allow });
  return { blocking: warnings.filter((w) => w.kind !== "name"), names: warnings.filter((w) => w.kind === "name") };
}

// ---------- the account's copy ----------

export type RemoteTemplates = Record<TemplateKind, unknown | null>;

/** The row the client sends. Only these columns, so nothing else can ride along. */
export interface TemplateRow {
  user_id: string;
  discipline: DisciplineId;
  kind: TemplateKind;
  data: unknown;
}

export function rowFor(userId: string, d: DisciplineId, kind: TemplateKind, data: unknown): TemplateRow {
  return { user_id: userId, discipline: d, kind, data };
}

export async function fetchRemote(d: DisciplineId): Promise<RemoteTemplates> {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up.");
  const { data, error } = await sb.from(TABLE).select("kind,data").eq("discipline", d);
  if (error) throw new Error(error.message);
  const out: RemoteTemplates = { pack: null };
  for (const row of (data ?? []) as { kind: string; data: unknown }[]) {
    if (row.kind === "pack") out.pack = row.data ?? null;
  }
  return out;
}

export async function pushRemote(userId: string, d: DisciplineId, kind: TemplateKind, data: unknown | null): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up.");
  if (data === null) {
    const { error } = await sb.from(TABLE).delete().eq("user_id", userId).eq("discipline", d).eq("kind", kind);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await sb.from(TABLE).upsert(rowFor(userId, d, kind, data), { onConflict: "user_id,discipline,kind" });
  if (error) throw new Error(error.message);
}
