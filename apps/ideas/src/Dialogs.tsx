import { useEffect, useRef, useState, type ReactNode } from "react";
import * as api from "./api";
import { BLOCKED_MESSAGE, checkEmbed } from "./embedCheck";
import { blankReel, parseBulk, parseInstagramUrl, permalink, type Reel, type Status } from "./reels";
import { GRADE_BANDS, SKILL_AREAS, readPastedDetails, skillLabel, suggestTags, type GradeId, type SkillId } from "./taxonomy";

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}

function Chips<T extends string>({ label, options, value, onChange, single }: { label: string; options: readonly { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; single?: boolean }) {
  return (
    <fieldset className="chipset">
      <legend>{label}</legend>
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button type="button" key={o.id} className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== o.id) : single ? [o.id] : [...value, o.id])}>
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}

/** A visitor suggests a reel. It waits, unseen, until the owner publishes it. */
export function Suggest({ known, onClose }: { known: Reel[]; onClose: () => void }) {
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<SkillId[]>([]);
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"form" | "sending" | "done">("form");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInstagramUrl(link);
    if (!parsed) return setError("That doesn't look like an Instagram reel or post link. In Instagram, tap Share, then Copy link.");
    if (note.trim().length < 5) return setError("Add a few words on what the activity works on.");
    if (known.some((r) => r.code === parsed.code)) return setError("Good news: that one is already in the library.");
    setError("");
    setState("sending");
    if (!trap && (await checkEmbed(parsed)) === "blocked") {
      setState("form");
      return setError(BLOCKED_MESSAGE);
    }
    // A filled trap field means a bot; pretend it worked.
    const result = trap ? "ok" : await api.suggestReel({ ...parsed, note, name, skill: skill[0] ?? "" });
    if (result === "error") {
      setState("form");
      return setError("That didn't go through. Please try again in a little while.");
    }
    setState("done");
  }

  return (
    <Sheet title="Suggest a reel" onClose={onClose}>
      {state === "done" ? (
        <div className="sheet-body">
          <p>
            <strong>Thank you!</strong> We watch every suggestion before it joins the library, so it won't show up right away.
          </p>
          <button className="tt-btn tt-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className="sheet-body" onSubmit={submit}>
          <label>
            Instagram link
            <input type="url" inputMode="url" required value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/reel/…" autoComplete="off" />
          </label>
          <label>
            What does it work on? <span className="hint">One sentence</span>
            <textarea required maxLength={300} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Chips label="Skill area (optional)" options={SKILL_AREAS} value={skill} onChange={setSkill} single />
          <label>
            Your name or handle, for credit <span className="hint">Optional, shown publicly</span>
            <input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </label>
          <label className="trap" aria-hidden="true">
            Leave this empty
            <input tabIndex={-1} value={trap} onChange={(e) => setTrap(e.target.value)} autoComplete="off" />
          </label>
          <p className="small">We receive the link, your sentence, and the name if you give one. Nothing else. Please don't include student names or details.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="tt-btn tt-btn-primary" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Send suggestion"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

/** The owner signs in with a code emailed to them, the same way as the IEP Writer. */
export function OwnerSignIn({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Owner sign-in" onClose={onClose}>
      <form
        className="sheet-body"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (!sent) {
              await api.sendCode(email.trim());
              setSent(true);
            } else {
              await api.verifyCode(email.trim(), code);
              if (!(await api.isOwner())) throw new Error("You're signed in, but this account can't edit the library.");
              await onDone();
            }
          });
        }}
      >
        <p className="small">This is for the people who look after the library. Browsing, saving and suggesting need no sign-in.</p>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} autoComplete="email" />
        </label>
        {sent && (
          <label>
            Code from the email
            <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="tt-btn tt-btn-primary" disabled={busy}>
          {sent ? "Sign in" : "Email me a code"}
        </button>
      </form>
    </Sheet>
  );
}

/** The owner adds a reel or edits one: title, how-to, tags, and whether it is public. */
export function EditReel({ reel, isNew, known, onClose, onSaved }: { reel: Reel; isNew: boolean; known: Reel[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [link, setLink] = useState("");
  const [draft, setDraft] = useState<Reel>(() => {
    // A suggestion arrives with the contributor's sentence: pre-tick what it points to.
    if (isNew || reel.skills.length + reel.grades.length > 0 || !reel.submitterNote) return reel;
    const s = suggestTags(reel.submitterNote);
    return { ...reel, skills: [...new Set([...reel.skills, ...s.skills])], grades: s.grades };
  });
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<Reel>) => setDraft((d) => ({ ...d, ...patch }));

  function readCaption(text: string) {
    setCaption(text);
    const s = suggestTags(text);
    const handle = text.match(/@([A-Za-z0-9._]{2,30})/)?.[1];
    setDraft((d) => ({
      ...d,
      skills: [...new Set<SkillId>([...d.skills, ...s.skills])],
      grades: [...new Set<GradeId>([...d.grades, ...s.grades])],
      creator: d.creator || handle || "",
    }));
  }

  async function save(status: Status) {
    let target = draft;
    if (isNew) {
      const parsed = parseInstagramUrl(link);
      if (!parsed) return setError("That doesn't look like an Instagram reel or post link.");
      if (known.some((r) => r.code === parsed.code)) return setError("That reel is already in the library.");
      target = { ...blankReel(parsed.kind, parsed.code), ...draft, kind: parsed.kind, code: parsed.code };
    }
    if (status === "published" && !target.title.trim()) return setError("Give it a title before publishing.");
    setBusy(true);
    setError("");
    if (status === "published" && (await checkEmbed(target)) === "blocked") {
      setBusy(false);
      return setError(BLOCKED_MESSAGE);
    }
    try {
      await api.saveReel({ ...target, status });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this reel from the library for good?")) return;
    setBusy(true);
    try {
      await api.deleteReel(draft.code);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  return (
    <Sheet title={isNew ? "Add a reel" : "Edit reel"} onClose={onClose}>
      <form className="sheet-body" onSubmit={(e) => (e.preventDefault(), void save("published"))}>
        {isNew ? (
          <label>
            Instagram link <span className="hint">In Instagram: Share, then Copy link</span>
            <input type="url" inputMode="url" required value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/reel/…" autoComplete="off" />
          </label>
        ) : (
          <p className="small">
            <a href={permalink(draft)} target="_blank" rel="noreferrer">
              Open on Instagram
            </a>
            {draft.submitterNote && <> · Contributor wrote: “{draft.submitterNote}”</>}
          </p>
        )}
        <label>
          Title
          <input maxLength={80} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label>
          How to do it <span className="hint">In your own words, for when the video is blocked</span>
          <textarea maxLength={600} rows={3} value={draft.howTo} onChange={(e) => set({ howTo: e.target.value })} />
        </label>
        <label>
          Creator's handle
          <input maxLength={31} value={draft.creator} onChange={(e) => set({ creator: e.target.value.replace(/[^A-Za-z0-9._@]/g, "") })} placeholder="@handle" autoComplete="off" />
        </label>
        <label>
          Paste the caption to suggest tags <span className="hint">Read here to tick tags, then thrown away. Never saved</span>
          <textarea rows={2} value={caption} onChange={(e) => readCaption(e.target.value)} />
        </label>
        <Chips label="Skill areas" options={SKILL_AREAS} value={draft.skills} onChange={(skills) => set({ skills })} />
        <Chips label="Grades (none ticked means all)" options={GRADE_BANDS} value={draft.grades} onChange={(grades) => set({ grades })} />
        {draft.submitterName !== "" && (
          <label>
            Suggested by <span className="hint">Shown publicly; clear it to hide</span>
            <input maxLength={60} value={draft.submitterName} onChange={(e) => set({ submitterName: e.target.value })} />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row2">
          <button className="tt-btn tt-btn-primary" disabled={busy}>
            {draft.status === "published" && !isNew ? "Save" : "Publish"}
          </button>
          {!isNew && draft.status === "published" && (
            <button type="button" className="tt-btn" disabled={busy} onClick={() => void save("unpublished")}>
              Hide from library
            </button>
          )}
          {!isNew && draft.status === "pending" && (
            <button type="button" className="tt-btn" disabled={busy} onClick={() => void save("rejected")}>
              Reject
            </button>
          )}
          {!isNew && (
            <button type="button" className="tt-btn danger" disabled={busy} onClick={() => void remove()}>
              Delete
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

/** The owner checks every reel with Instagram's embed service and hides the ones it refuses. */
export function CheckReels({ reels, onClose, onChanged }: { reels: Reel[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const [done, setDone] = useState(0);
  const [blocked, setBlocked] = useState<Reel[]>([]);
  const [unknown, setUnknown] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState("");
  const list = useRef(reels.filter((r) => r.status === "published" || r.status === "pending"));
  const finished = done >= list.current.length;

  useEffect(() => {
    let stop = false;
    void (async () => {
      // One at a time, with a short pause, so the service is never flooded.
      for (const r of list.current) {
        if (stop) return;
        const answer = await checkEmbed(r);
        if (stop) return;
        if (answer === "blocked") setBlocked((b) => [...b, r]);
        if (answer === "unknown") setUnknown((n) => n + 1);
        setDone((n) => n + 1);
        await new Promise((res) => setTimeout(res, 300));
      }
    })();
    return () => {
      stop = true;
    };
  }, []);

  async function hide(r: Reel) {
    setError("");
    try {
      await api.saveReel({ ...r, status: r.status === "pending" ? "rejected" : "unpublished" });
      setHidden((h) => [...h, r.code]);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not hide it.");
    }
  }

  return (
    <Sheet title="Check all reels" onClose={onClose}>
      <div className="sheet-body">
        <p role="status">
          {finished ? `Checked ${done} reels.` : `Checking ${done + 1} of ${list.current.length}…`} {finished && blocked.length === 0 && unknown === 0 && "Instagram allows all of them."}
        </p>
        {blocked.length > 0 && (
          <>
            <p>
              <strong>Instagram won't show these on other sites:</strong>
            </p>
            <ul className="check-list">
              {blocked.map((r) => (
                <li key={r.code}>
                  <a href={permalink(r)} target="_blank" rel="noreferrer">
                    {r.title || `Untitled (${r.code})`}
                  </a>
                  {hidden.includes(r.code) ? (
                    <span className="small">Hidden</span>
                  ) : (
                    <button className="tt-btn" onClick={() => void hide(r)}>
                      Hide
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {finished && unknown > 0 && <p className="small">{unknown} could not be checked just now (no clear answer from Instagram). They were left as they are; try again later.</p>}
        <p className="small">This can't spot reels that only play on Instagram itself. Those still need a look.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="tt-btn tt-btn-primary" onClick={onClose}>
          {finished ? "Done" : "Stop"}
        </button>
      </div>
    </Sheet>
  );
}

type BulkRow = { reel: Reel; state: "new" | "update" | "have" | "blocked" };

/**
 * The owner pastes many links at once, each optionally followed by its
 * caption, or by "title:", "tags:" and "by:" lines. Every new reel is checked
 * with Instagram and saved as a draft for review; a reel already in the
 * library that has no title yet is filled in, and one that has a title is
 * left alone. A pasted caption is read for tags and then dropped.
 */
export function BulkAdd({ known, onClose, onAdded }: { known: Reel[]; onClose: () => void; onAdded: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState<number | null>(null);

  async function read() {
    const found = parseBulk(text);
    if (found.length === 0) return setError("No Instagram reel or post links found in that text.");
    setError("");
    const out: BulkRow[] = [];
    for (const [i, f] of found.entries()) {
      setBusy(`Checking ${i + 1} of ${found.length}…`);
      const d = readPastedDetails(f.text);
      const reel: Reel = { ...blankReel(f.kind, f.code), title: d.title, creator: d.creator, skills: d.skills, grades: d.grades, status: "pending" };
      const existing = known.find((r) => r.code === f.code);
      if (existing && !existing.title && d.title) {
        // Fill in an untitled reel; keep whatever the owner already set.
        out.push({ state: "update", reel: { ...existing, title: d.title, creator: existing.creator || d.creator, skills: existing.skills.length ? existing.skills : d.skills, grades: existing.grades.length ? existing.grades : d.grades } });
      } else if (existing) out.push({ reel: existing, state: "have" });
      else {
        out.push({ reel, state: (await checkEmbed(f)) === "blocked" ? "blocked" : "new" });
        await new Promise((res) => setTimeout(res, 300));
      }
    }
    setBusy("");
    setRows(out);
  }

  const fresh = rows?.filter((r) => r.state === "new") ?? [];
  const updates = rows?.filter((r) => r.state === "update") ?? [];
  const [updated, setUpdated] = useState(0);

  async function add() {
    setBusy("Adding…");
    setError("");
    try {
      if (fresh.length) await api.addReels(fresh.map((r) => r.reel));
      for (const u of updates) await api.saveReel(u.reel);
      setUpdated(updates.length);
      setAdded(fresh.length);
      await onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add them.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Sheet title="Add in bulk" onClose={onClose}>
      <div className="sheet-body">
        {added !== null ? (
          <>
            <p>
              {updated > 0 && <strong>{updated === 1 ? "1 reel filled in. " : `${updated} reels filled in. `}</strong>}
              {added > 0 && (
                <>
                  <strong>{added === 1 ? "1 reel added" : `${added} reels added`} as drafts.</strong> They are not public yet. Open "Review drafts" to check each one and publish.
                </>
              )}
            </p>
            <button className="tt-btn tt-btn-primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : rows === null ? (
          <>
            <label>
              Paste your links <span className="hint">One or many. Under a link you can add lines starting with title:, tags: and by:, or paste the caption to have tags ticked for you</span>
              <textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={"https://www.instagram.com/reel/…\n(caption, optional)\n\nhttps://www.instagram.com/reel/…"} />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="tt-btn tt-btn-primary" disabled={busy !== "" || text.trim() === ""} onClick={() => void read()}>
              {busy || "Read links"}
            </button>
          </>
        ) : (
          <>
            <ul className="check-list">
              {rows.map(({ reel, state }) => (
                <li key={reel.code}>
                  <a href={permalink(reel)} target="_blank" rel="noreferrer">
                    {reel.title || reel.code}
                  </a>
                  <span className="small">
                    {state === "update" ? `Fill in: ${reel.skills.map(skillLabel).join(", ") || "no tags"}` : state === "have" ? "Already in the library, left as it is" : state === "blocked" ? "Instagram won't allow it on other sites" : reel.skills.length ? reel.skills.map(skillLabel).join(", ") : "No tags found"}
                  </span>
                </li>
              ))}
            </ul>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="row2">
              <button className="tt-btn tt-btn-primary" disabled={busy !== "" || fresh.length + updates.length === 0} onClick={() => void add()}>
                {busy || (fresh.length + updates.length === 0 ? "Nothing to add" : [updates.length ? `Fill in ${updates.length}` : "", fresh.length ? `Add ${fresh.length} as drafts` : ""].filter(Boolean).join(" and "))}
              </button>
              <button className="tt-btn" disabled={busy !== ""} onClick={() => setRows(null)}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
