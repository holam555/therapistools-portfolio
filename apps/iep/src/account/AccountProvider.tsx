import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { PrivacyWarning } from "../model/privacy";
import { useApp } from "../ui/state";
import { supabase } from "./client";
import { accountEnabled } from "./config";
import { TEMPLATE_CHANGED, type TemplateChangedDetail, type TemplateKind } from "./events";
import { KINDS, canon, checkTemplate, decide, fetchRemote, pushRemote, readLastSynced, readLocal, writeLastSynced, writeLocal } from "./sync";

/** Browser network errors read like "Failed to fetch"; say what that means. */
function reachError(err: unknown): SyncState {
  const m = err instanceof Error ? err.message : "";
  return { kind: "error", message: /fetch|network|load failed/i.test(m) || !m ? "check your internet connection and try again." : m };
}

/**
 * Signs a writer in and keeps their template in step with their account.
 * Lives inside AppProvider, so it knows the discipline and the library (for
 * the privacy check) and remounts when the discipline changes.
 */

export interface AccountUser {
  id: string;
  email: string | null;
  /** "google" or "email". */
  provider: string;
}

export type SyncState =
  | { kind: "off" }
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "saved"; at: Date; names: PrivacyWarning[] }
  /** Checked, and the account already holds this browser's template. */
  | { kind: "matched"; at: Date }
  | { kind: "blocked"; warnings: PrivacyWarning[] }
  | { kind: "conflict" }
  | { kind: "error"; message: string };

interface AccountContext {
  /** False when the build has no account server: show nothing about accounts. */
  enabled: boolean;
  /** True once the saved session (if any) has been checked. */
  ready: boolean;
  user: AccountUser | null;
  signInWithGoogle: () => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  sync: SyncState;
  /** Templates that changed both here and in the account; the writer picks one. */
  conflicts: TemplateKind[];
  resolveConflict: (keep: "account" | "browser") => Promise<void>;
  syncNow: () => Promise<void>;
  /** Bumps when the account's template replaced the browser's, so open editors reload it. */
  templateEpoch: number;
}

const Ctx = createContext<AccountContext | null>(null);

const DEBOUNCE_MS = 1200;

function userOf(session: Session | null): AccountUser | null {
  if (!session?.user) return null;
  const u = session.user;
  return { id: u.id, email: u.email ?? null, provider: u.app_metadata?.provider ?? "email" };
}

/** Keep the same object while the same person is signed in, so a token refresh does not start a sync. */
const samePerson = (next: AccountUser | null) => (prev: AccountUser | null) => (prev && next && prev.id === next.id ? prev : next);

/** Drop the one-time sign-in code (and any error) from the address bar after the redirect. */
function cleanUrl(): void {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const p of ["code", "error", "error_code", "error_description"]) if (url.searchParams.has(p)) (url.searchParams.delete(p), (changed = true));
    if (changed) window.history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
  } catch {
    /* not in a browser */
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const enabled = accountEnabled();
  const { discipline, lib } = useApp();
  const [ready, setReady] = useState(!enabled);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sync, setSync] = useState<SyncState>({ kind: enabled ? "idle" : "off" });
  const [conflicts, setConflicts] = useState<TemplateKind[]>([]);
  const [templateEpoch, setTemplateEpoch] = useState(0);
  const timer = useRef<number | null>(null);
  const libRef = useRef(lib);
  libRef.current = lib;

  // ----- session -----
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    // The Sign in button waits for this check. If the check fails or never answers, show the button anyway.
    const giveUp = window.setTimeout(() => alive && setReady(true), 4000);
    sb.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setUser(samePerson(userOf(data.session)));
        setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      })
      .finally(() => window.clearTimeout(giveUp));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setUser(samePerson(userOf(session)));
      if (event === "SIGNED_IN") cleanUrl();
      if (event === "SIGNED_OUT") {
        setSync({ kind: "idle" });
        setConflicts([]);
      }
    });
    return () => {
      alive = false;
      window.clearTimeout(giveUp);
      sub.subscription.unsubscribe();
    };
  }, []);

  // ----- moving templates -----

  /** Upload one template if the browser's copy moved on since the last agreed copy. */
  const pushKind = useCallback(
    async (userId: string, kind: TemplateKind, force = false): Promise<SyncState | null> => {
      const local = readLocal(discipline, kind);
      const localC = canon(local);
      const last = readLastSynced(userId, discipline, kind);
      if (!force && localC === last) return null;
      if (local !== null) {
        const check = checkTemplate(local, libRef.current);
        if (check.blocking.length) return { kind: "blocked", warnings: check.blocking };
        await pushRemote(userId, discipline, kind, local);
        writeLastSynced(userId, discipline, kind, localC);
        return { kind: "saved", at: new Date(), names: check.names };
      }
      await pushRemote(userId, discipline, kind, null);
      writeLastSynced(userId, discipline, kind, "");
      return { kind: "saved", at: new Date(), names: [] };
    },
    [discipline],
  );

  const pushAll = useCallback(
    async (userId: string) => {
      setSync({ kind: "syncing" });
      try {
        let result: SyncState | null = null;
        for (const kind of KINDS) {
          const r = await pushKind(userId, kind);
          // A block or the newest save is what the writer should see.
          if (r && (r.kind === "blocked" || !result || result.kind !== "blocked")) result = r;
        }
        setSync(result ?? { kind: "matched", at: new Date() });
      } catch (err) {
        setSync(reachError(err));
      }
    },
    [pushKind],
  );

  /** On sign-in: compare each template here with the account and move the newer one. */
  const reconcile = useCallback(
    async (userId: string) => {
      setSync({ kind: "syncing" });
      try {
        const remote = await fetchRemote(discipline);
        const clashes: TemplateKind[] = [];
        let changedHere = false;
        let result: SyncState | null = null;
        for (const kind of KINDS) {
          const local = readLocal(discipline, kind);
          const localC = canon(local);
          const remoteC = canon(remote[kind]);
          switch (decide(localC, remoteC, readLastSynced(userId, discipline, kind))) {
            case "none":
              if (localC && readLastSynced(userId, discipline, kind) !== localC) writeLastSynced(userId, discipline, kind, localC);
              break;
            case "download":
              writeLastSynced(userId, discipline, kind, remoteC);
              writeLocal(discipline, kind, remote[kind]);
              changedHere = true;
              break;
            case "upload": {
              const r = await pushKind(userId, kind, true);
              if (r && (r.kind === "blocked" || !result || result.kind !== "blocked")) result = r;
              break;
            }
            case "conflict":
              clashes.push(kind);
          }
        }
        if (changedHere) setTemplateEpoch((n) => n + 1);
        setConflicts(clashes);
        setSync(clashes.length ? { kind: "conflict" } : (result ?? { kind: "matched", at: new Date() }));
      } catch (err) {
        setSync(reachError(err));
      }
    },
    [discipline, pushKind],
  );

  useEffect(() => {
    if (user) void reconcile(user.id);
  }, [user, reconcile]);

  // Templates saved in this browser go up a moment after the last edit.
  useEffect(() => {
    if (!user) return;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<TemplateChangedDetail>).detail;
      if (!detail || detail.discipline !== discipline) return;
      if (conflicts.length) return; // wait for the writer's choice
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void pushAll(user.id), DEBOUNCE_MS);
    };
    window.addEventListener(TEMPLATE_CHANGED, onChange);
    return () => {
      window.removeEventListener(TEMPLATE_CHANGED, onChange);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [user, discipline, conflicts.length, pushAll]);

  const resolveConflict = useCallback(
    async (keep: "account" | "browser") => {
      if (!user) return;
      setSync({ kind: "syncing" });
      try {
        if (keep === "account") {
          const remote = await fetchRemote(discipline);
          for (const kind of conflicts) {
            writeLastSynced(user.id, discipline, kind, canon(remote[kind]));
            writeLocal(discipline, kind, remote[kind]);
          }
          setConflicts([]);
          setTemplateEpoch((n) => n + 1);
          setSync({ kind: "idle" });
        } else {
          let result: SyncState | null = null;
          for (const kind of conflicts) {
            const r = await pushKind(user.id, kind, true);
            if (r && (r.kind === "blocked" || !result || result.kind !== "blocked")) result = r;
          }
          setConflicts([]);
          setSync(result ?? { kind: "matched", at: new Date() });
        }
      } catch (err) {
        setSync(reachError(err));
      }
    },
    [user, discipline, conflicts, pushKind],
  );

  // ----- signing in and out -----
  const signInWithGoogle = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname } });
    if (error) throw new Error(error.message);
  }, []);

  const sendCode = useCallback(async (email: string) => {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname } });
    if (error) throw new Error(error.message);
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.auth.verifyOtp({ email, token: code.replace(/\s+/g, ""), type: "email" });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    await sb.auth.signOut();
    setUser(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (user) await reconcile(user.id);
  }, [user, reconcile]);

  const value = useMemo<AccountContext>(
    () => ({ enabled, ready, user, signInWithGoogle, sendCode, verifyCode, signOut, sync, conflicts, resolveConflict, syncNow, templateEpoch }),
    [enabled, ready, user, signInWithGoogle, sendCode, verifyCode, signOut, sync, conflicts, resolveConflict, syncNow, templateEpoch],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}
