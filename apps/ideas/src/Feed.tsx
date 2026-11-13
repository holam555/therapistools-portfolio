import { useEffect, useRef, useState } from "react";
import { embedUrl, permalink, routeHash, type Reel, type Route } from "./reels";
import { gradeLabel, skillLabel } from "./taxonomy";

interface Props {
  reels: Reel[];
  route: Route;
  saved: ReadonlySet<string>;
  owner: boolean;
  onToggleSave: (code: string) => void;
  onEdit: (reel: Reel) => void;
  onClose: () => void;
}

/**
 * The swipe feed: one reel per screen, snapping as you scroll.
 *
 * Instagram serves a blank page when one browser asks for many embeds in a
 * short time (seen 2026-11-13), so frames are loaded sparingly: only the reel
 * on screen, only after it has stayed there a moment (swiping past loads
 * nothing), and the last few stay loaded so going back asks for nothing new.
 */
const DWELL_MS = 700;
const KEEP_LOADED = 4;

export function Feed({ reels, route, saved, owner, onToggleSave, onEdit, onClose }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => Math.max(0, reels.findIndex((r) => r.code === route.start)));
  const [toast, setToast] = useState("");
  /** Codes of the reels whose frames are loaded, oldest first. */
  const [loaded, setLoaded] = useState<string[]>([]);
  const activeReel = reels[active]?.code;
  useEffect(() => {
    if (!activeReel) return;
    const t = setTimeout(() => setLoaded((cur) => (cur.includes(activeReel) ? cur : [...cur, activeReel].slice(-KEEP_LOADED))), DWELL_MS);
    return () => clearTimeout(t);
  }, [activeReel]);

  // Start on the shared reel, once the list holds it.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || reels.length === 0) return;
    const i = reels.findIndex((r) => r.code === route.start);
    if (route.start && i < 0) return;
    started.current = true;
    if (i > 0) {
      scroller.current?.children[i]?.scrollIntoView();
      setActive(i);
    }
  }, [reels, route.start]);

  // When the list changes under the feed (the owner saved an edit), stay on the same reel.
  const activeCode = useRef<string | undefined>(undefined);
  useEffect(() => {
    const i = reels.findIndex((r) => r.code === activeCode.current);
    if (i >= 0 && i !== active) {
      scroller.current?.children[i]?.scrollIntoView();
      setActive(i);
    }
    // Only when the list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels]);
  useEffect(() => {
    activeCode.current = reels[active]?.code;
  }, [reels, active]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: 0.6 },
    );
    for (const el of root.children) io.observe(el);
    return () => io.disconnect();
  }, [reels.length]);

  const step = (d: number) => scroller.current?.children[active + d]?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, dialog")) return;
      if (e.key === "ArrowDown" || e.key === "j") step(1);
      else if (e.key === "ArrowUp" || e.key === "k") step(-1);
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function share(reel: Reel) {
    const url = `${location.origin}${location.pathname}${routeHash({ view: "feed", filter: {}, start: reel.code })}`;
    const title = reel.title || "An OT activity idea";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      }
    } catch {
      // Share sheet closed: nothing to do.
    }
  }

  const heading = route.review ? "Suggestions to review" : route.filter.saved ? "My saved ideas" : route.filter.skill ? skillLabel(route.filter.skill) : "All ideas";

  return (
    <div className="feed">
      <header className="feed-top">
        <button className="icon-btn" onClick={onClose} aria-label="Back to Activity Ideas">
          ←
        </button>
        <div className="feed-title">
          <strong>{heading}</strong>
          {route.filter.grade && <span> · {gradeLabel(route.filter.grade)}</span>}
        </div>
        <span className="feed-count" aria-live="polite">
          {reels.length ? `${active + 1} / ${reels.length}` : ""}
        </span>
      </header>

      {reels.length === 0 ? (
        <div className="feed-empty">
          <p>Nothing here yet.</p>
          <button className="tt-btn" onClick={onClose}>
            Back
          </button>
        </div>
      ) : (
        <div className="feed-scroll" ref={scroller}>
          {reels.map((r, i) => (
            <article className="slide" key={r.code} data-i={i} aria-label={r.title || `Idea ${i + 1}`}>
              <div className="slide-info">
                <h2>{r.title || "Activity idea"}</h2>
                {r.howTo && <p className="howto">{r.howTo}</p>}
                <div className="chips">
                  {r.skills.map((s) => (
                    <span key={s} className="chip static skill">
                      {skillLabel(s)}
                    </span>
                  ))}
                  {r.grades.map((g) => (
                    <span key={g} className="chip static">
                      {gradeLabel(g)}
                    </span>
                  ))}
                  {route.review && r.submitterNote && <span className="note">“{r.submitterNote}”</span>}
                </div>
              </div>
              <div className="frame">
                {loaded.includes(r.code) ? (
                  <iframe
                    src={embedUrl(r)}
                    title={`${r.title || "Activity idea"}, video from Instagram`}
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <div className="frame-wait" aria-hidden="true">
                    ▶
                  </div>
                )}
              </div>
              <p className="frame-help">
                Video blank? <a href={permalink(r)} target="_blank" rel="noreferrer">Watch it on Instagram</a>
              </p>
              <div className="slide-actions">
                <span className="credit">
                  {r.creator ? `@${r.creator}` : "On Instagram"}
                  {r.submitterName && <em> · suggested by {r.submitterName}</em>}
                </span>
                <button className={`act${saved.has(r.code) ? " on" : ""}`} aria-pressed={saved.has(r.code)} onClick={() => onToggleSave(r.code)}>
                  <span aria-hidden="true">{saved.has(r.code) ? "♥" : "♡"}</span> {saved.has(r.code) ? "Saved" : "Save"}
                </button>
                <button className="act" onClick={() => void share(r)}>
                  <span aria-hidden="true">↗</span> Share
                </button>
                <a className="act" href={permalink(r)} target="_blank" rel="noreferrer">
                  <span aria-hidden="true">▣</span> Open
                </a>
                {owner && (
                  <button className="act" onClick={() => onEdit(r)}>
                    <span aria-hidden="true">✎</span> Edit
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {reels.length > 1 && (
        <div className="feed-nav">
          <button className="icon-btn" onClick={() => step(-1)} disabled={active === 0} aria-label="Previous idea">
            ↑
          </button>
          <button className="icon-btn" onClick={() => step(1)} disabled={active >= reels.length - 1} aria-label="Next idea">
            ↓
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
