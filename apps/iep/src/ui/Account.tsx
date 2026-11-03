import { useEffect, useState, type FormEvent } from "react";
import { useAccount, type SyncState } from "../account/AccountProvider";
import { KIND_LABEL } from "../model/privacy";

/**
 * Everything a writer sees about their account: the sign-in button in the
 * header, the sign-in dialog, the status of the account copy, and the card in
 * Settings. Shown only when the build has an account server.
 */

const timeOf = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Browser network errors read like "Failed to fetch"; say what that means. */
export function plainError(err: unknown): string {
  const m = err instanceof Error ? err.message : "";
  if (!m) return "Something went wrong. Try again.";
  if (/fetch|network|load failed/i.test(m)) return "Could not reach the account server. Check your internet connection and try again.";
  return m;
}

export function SyncStatus({ sync, long = false }: { sync: SyncState; long?: boolean }) {
  switch (sync.kind) {
    case "off":
    case "idle":
      return null;
    case "syncing":
      return <span className="hint">Checking your account…</span>;
    case "saved":
      return (
        <span className="sync-status">
          <span className="hint">Template saved to your account {timeOf(sync.at)}</span>
          {long && sync.names.length > 0 && (
            <span className="hint warn">
              Capitalised words the privacy check does not know: {sync.names.slice(0, 8).map((w) => w.text).join(", ")}
              {sync.names.length > 8 ? "…" : ""}. Test and product names are fine. If one is a real name, remove it from the template.
            </span>
          )}
        </span>
      );
    case "blocked":
      return (
        <span className="sync-status">
          <span className="hint warn">
            Not saved to your account: the template holds something that looks personal. Remove it and it will save on the next edit.
          </span>
          {long && (
            <ul className="warning-list">
              {sync.warnings.slice(0, 10).map((w, i) => (
                <li key={i}>
                  <strong>{KIND_LABEL[w.kind]}:</strong> “{w.text}” <span className="hint">{w.snippet}</span>
                </li>
              ))}
            </ul>
          )}
        </span>
      );
    case "conflict":
      return <span className="hint warn">Your account and this browser have different templates.</span>;
    case "error":
      return <span className="hint warn">Could not reach your account: {sync.message}</span>;
  }
}

/** The header button: "Sign in", or who is signed in. */
export function AccountButton() {
  const { enabled, ready, user, sync } = useAccount();
  const [open, setOpen] = useState(false);
  if (!enabled || !ready) return null;
  return (
    <>
      <button type="button" className="btn btn-sm account-btn" onClick={() => setOpen(true)} title={user ? `Signed in as ${user.email ?? "a writer"}` : "Sign in to keep your template in your account"}>
        {user ? (
          <>
            <span className="account-dot" aria-hidden="true" data-state={sync.kind} />
            {user.email ?? "Signed in"}
          </>
        ) : (
          "Sign in"
        )}
      </button>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function AccountDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAccount();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="account-title">{user ? "Your account" : "Sign in"}</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {user ? <SignedInPanel /> : <SignInForm onDone={onClose} />}
      </div>
    </div>
  );
}

function SignedInPanel() {
  const { user, sync, signOut, syncNow } = useAccount();
  if (!user) return null;
  return (
    <div className="account-panel">
      <p>
        Signed in as <strong>{user.email ?? "a writer"}</strong> with {user.provider === "google" ? "Google" : "an email code"}.
      </p>
      <WhatIsStored />
      <SyncStatus sync={sync} long />
      <div className="row gap wrap modal-actions">
        <button type="button" className="btn btn-sm" onClick={() => void syncNow()} disabled={sync.kind === "syncing"}>
          Check again
        </button>
        <button type="button" className="btn btn-sm" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      <p className="hint">Signing out keeps the template in this browser. It stays in your account too, for the next device you sign in on.</p>
    </div>
  );
}

export function WhatIsStored() {
  return (
    <div className="account-stored">
      <p className="hint">
        <strong>Kept in your account:</strong> your report template (wording, labels, sample sentences, dropdown choices, rating grids, which
        paragraphs are hidden), so it follows you to another browser or computer.
      </p>
      <p className="hint">
        <strong>Never in your account:</strong> the report you are writing, the blanks you filled, ratings, recipes and your sentence library.
        Those stay in this browser only. The privacy check runs before every save and holds the template back if it finds a date, phone number
        or email address.
      </p>
    </div>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const { signInWithGoogle, sendCode, verifyCode } = useAccount();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"start" | "code">("start");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, then?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      then?.();
    } catch (err) {
      setError(plainError(err));
    } finally {
      setBusy(false);
    }
  };

  const onEmail = (e: FormEvent) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr.includes("@")) {
      setError("Type the email address you want to sign in with.");
      return;
    }
    void run(() => sendCode(addr), () => setStage("code"));
  };
  const onCode = (e: FormEvent) => {
    e.preventDefault();
    if (code.replace(/\s+/g, "").length < 6) {
      setError("Type the code from the email.");
      return;
    }
    void run(() => verifyCode(email.trim(), code), onDone);
  };

  return (
    <div className="account-panel">
      <p className="hint">An account keeps your report template so you can open it on another computer. Nothing else is stored.</p>
      <button type="button" className="btn btn-primary google-btn" disabled={busy} onClick={() => void run(signInWithGoogle)}>
        Continue with Google
      </button>
      <div className="account-or" role="separator">
        <span>or</span>
      </div>
      {stage === "start" ? (
        <form onSubmit={onEmail} className="account-form">
          <label className="field">
            <span className="field-label">Email address</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.org" disabled={busy} />
          </label>
          <button type="submit" className="btn" disabled={busy}>
            Email me a sign-in code
          </button>
        </form>
      ) : (
        <form onSubmit={onCode} className="account-form">
          <p className="hint">
            We sent a code to <strong>{email.trim()}</strong>. Type it here, or open the link in that email on this device.
          </p>
          <label className="field">
            <span className="field-label">Code</span>
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" disabled={busy} />
          </label>
          <div className="row gap wrap">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Sign in
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => (setStage("start"), setCode(""), setError(null))}>
              Use a different email
            </button>
          </div>
        </form>
      )}
      {error && <p className="hint warn" role="alert">{error}</p>}
      <WhatIsStored />
    </div>
  );
}

const WELCOME_KEY = "easyiep.welcome.seen";

/**
 * First visit in this browser, when accounts are on and nobody is signed in:
 * sign in to use your own template, or try the built-in sample first. Shown
 * once; the flag holds nothing but "seen".
 */
export function WelcomeNotice() {
  const { enabled, ready, user } = useAccount();
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY) === "1";
    } catch {
      return true;
    }
  });
  const [signIn, setSignIn] = useState(false);
  const dismiss = () => {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setSeen(true);
  };
  useEffect(() => {
    if (user && !seen) dismiss();
  }, [user, seen]);
  useEffect(() => {
    if (seen || !enabled || !ready || user) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seen, enabled, ready, user]);
  if (signIn) return <AccountDialog onClose={() => setSignIn(false)} />;
  if (seen || !enabled || !ready || user) return null;
  return (
    <div className="modal-backdrop" onClick={dismiss} role="presentation">
      <div className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="welcome-title">Welcome to the IEP Writer</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={dismiss} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="account-panel">
          <p>
            <strong>Sign in</strong> to use your own report template. It is kept in your account and follows you to any computer.
          </p>
          <p>
            Or <strong>try it first</strong> with the built-in sample template: generic wording with fictional examples, which you can edit
            as you go. You can sign in later from the button at the top.
          </p>
          <p className="hint">Either way, the reports you write and the blanks you fill never leave this browser.</p>
          <div className="row gap wrap modal-actions">
            <button type="button" className="btn btn-primary" onClick={() => (dismiss(), setSignIn(true))}>
              Sign in
            </button>
            <button type="button" className="btn" onClick={dismiss}>
              Try it with the sample template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shown under the header when the account and this browser disagree. */
export function ConflictNotice() {
  const { conflicts, resolveConflict, sync } = useAccount();
  if (!conflicts.length) return null;
  const busy = sync.kind === "syncing";
  return (
    <div className="notice notice-info" role="alert">
      Your account holds a different template than this browser does. Which one do you want to keep? The other is replaced.
      <div className="row gap wrap modal-actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void resolveConflict("account")}>
          Use the one in my account
        </button>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void resolveConflict("browser")}>
          Keep this browser's copy
        </button>
      </div>
    </div>
  );
}

/** The Settings card. */
export function AccountCard() {
  const { enabled, ready, user, sync } = useAccount();
  const [open, setOpen] = useState(false);
  if (!enabled) return null;
  return (
    <section className="card">
      <h2>Account</h2>
      {!ready ? (
        <p className="hint">Checking…</p>
      ) : user ? (
        <>
          <p className="hint">
            Signed in as <strong>{user.email ?? "a writer"}</strong>. Your template saves to your account a moment after each edit.
          </p>
          <SyncStatus sync={sync} long />
        </>
      ) : (
        <p className="hint">Sign in to keep your report template in an account and open it on another computer. Without an account everything stays in this browser, as before.</p>
      )}
      <WhatIsStored />
      <div className="row gap wrap">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} disabled={!ready}>
          {user ? "Manage account" : "Sign in"}
        </button>
      </div>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </section>
  );
}
