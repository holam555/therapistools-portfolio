import { useState } from "react";
import { FEEDBACK_URL } from "../../../shared/brand.js";
import type { Dialog } from "./App";
import { applyFilter, blankReel, type Reel, type Route } from "./reels";
import { GRADE_BANDS, SKILL_AREAS, type GradeId } from "./taxonomy";

interface Props {
  reels: Reel[];
  saved: ReadonlySet<string>;
  owner: boolean;
  ownerReady: boolean;
  pendingCount: number;
  canSuggest: boolean;
  go: (r: Route) => void;
  openDialog: (d: Dialog) => void;
  onAddStarters: () => Promise<void>;
}

/** The front page: pick a skill area and grade, then swipe. Nothing here loads from Instagram. */
export function Home({ reels, saved, owner, ownerReady, pendingCount, canSuggest, go, openDialog, onAddStarters }: Props) {
  const [grade, setGrade] = useState<GradeId | undefined>();
  const [busy, setBusy] = useState(false);
  const count = (f: Parameters<typeof applyFilter>[1]) => applyFilter(reels, { ...f, grade }, saved).length;
  const savedCount = reels.filter((r) => saved.has(r.code)).length;

  return (
    <div className="tt-paper-bg ideas-page">
      <tt-suite-bar current="ideas"></tt-suite-bar>
      <main className="ideas-home">
        <h1>Activity Ideas</h1>
        <p className="lede">Short videos of school OT activities, picked by therapists. Choose a skill, then swipe.</p>

        <div className="grade-row" role="group" aria-label="Grade">
          <button className={`chip${!grade ? " on" : ""}`} aria-pressed={!grade} onClick={() => setGrade(undefined)}>
            All grades
          </button>
          {GRADE_BANDS.map((g) => (
            <button key={g.id} className={`chip${grade === g.id ? " on" : ""}`} aria-pressed={grade === g.id} onClick={() => setGrade(g.id)}>
              {g.label}
            </button>
          ))}
        </div>

        <button className="tt-btn tt-btn-primary start" onClick={() => go({ view: "feed", filter: { grade } })} disabled={count({}) === 0}>
          ▶ Start swiping <span className="n">{count({})}</span>
        </button>

        <h2>Browse by skill</h2>
        <div className="tiles">
          {SKILL_AREAS.map((s) => {
            const n = count({ skill: s.id });
            return (
              <button key={s.id} className="tile tt-card" disabled={n === 0} onClick={() => go({ view: "feed", filter: { skill: s.id, grade } })}>
                <span className="emoji" aria-hidden="true">
                  {s.emoji}
                </span>
                <span className="name">{s.label}</span>
                <span className="n">{n === 0 ? "None yet" : n === 1 ? "1 idea" : `${n} ideas`}</span>
              </button>
            );
          })}
        </div>

        <div className="row2">
          <button className="tt-btn" disabled={savedCount === 0} onClick={() => go({ view: "feed", filter: { saved: true } })}>
            ♥ My saved ideas <span className="n">{savedCount}</span>
          </button>
          {canSuggest && (
            <button className="tt-btn" onClick={() => openDialog({ kind: "suggest" })}>
              ＋ Suggest a reel
            </button>
          )}
        </div>

        {owner && (
          <section className="owner tt-card" aria-label="Owner tools">
            <h2>Owner tools</h2>
            <div className="row2">
              <button className="tt-btn tt-btn-primary" onClick={() => openDialog({ kind: "edit", reel: blankReel("reel", ""), isNew: true })}>
                ＋ Add a reel
              </button>
              <button className="tt-btn" disabled={pendingCount === 0} onClick={() => go({ view: "feed", filter: {}, review: true })}>
                Review drafts <span className="n">{pendingCount}</span>
              </button>
              <button className="tt-btn" disabled={!ownerReady} onClick={() => openDialog({ kind: "bulk" })}>
                ＋ Add in bulk
              </button>
              <button className="tt-btn" disabled={!ownerReady} onClick={() => openDialog({ kind: "check" })}>
                Check all reels
              </button>
              {ownerReady && reels.length === 0 && (
                <button
                  className="tt-btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onAddStarters();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Add the starter reels
                </button>
              )}
            </div>
            <p className="small">To tag or hide a reel, open it in the feed and tap Edit.</p>
          </section>
        )}

        <footer className="ideas-foot">
          <p>
            Videos play from Instagram once you start swiping, and each one belongs to its creator. Saved ideas stay in this browser. <a href="/privacy/#ideas">How we handle data</a>
          </p>
          <p>
            Is one of these your reel and you want it removed? <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">Tell us</a> and it comes down.
            {canSuggest && !owner && (
              <>
                {" · "}
                <button className="linkish" onClick={() => openDialog({ kind: "signin" })}>
                  Owner sign-in
                </button>
              </>
            )}
          </p>
        </footer>
      </main>
    </div>
  );
}
