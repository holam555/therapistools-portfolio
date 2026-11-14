/**
 * A short guided tour: one spotlight at a time on the parts of a page marked
 * data-tour="…", with a card that says what each is for. Framework-free so
 * all three apps share one implementation and one look (shared/tour.css);
 * each app decides when to start it and remembers "done" under its own key.
 * Never touches the network.
 *
 *   const tour = startTour([{ target: "setup", title: "…", text: "…" }], { onDone });
 *   tour.stop();   // from the host, e.g. when the page unmounts
 *
 * A step whose target is not on the page is skipped. Escape, Skip and Done
 * all call onDone.
 */

const PAD = 8;
const CARD_HEIGHT = 230;

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function startTour(steps, options = {}) {
  if (typeof document === "undefined") return { stop() {} };
  const onDone = options.onDone || (() => {});
  const present = steps.filter((s) => document.querySelector(`[data-tour="${s.target}"]`));
  if (!present.length) {
    onDone();
    return { stop() {} };
  }

  const root = document.createElement("div");
  root.className = "tt-tour";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = '<div class="tt-tour-spot" hidden></div><div class="tt-tour-dim" hidden></div><div class="tt-tour-card"></div>';
  const spot = root.querySelector(".tt-tour-spot");
  const dim = root.querySelector(".tt-tour-dim");
  const card = root.querySelector(".tt-tour-card");
  document.body.appendChild(root);

  let i = 0;
  let target = null;
  let stopped = false;

  function place() {
    if (!target) {
      spot.hidden = true;
      dim.hidden = false;
      Object.assign(card.style, { top: "20vh", bottom: "", left: "50%", transform: "translateX(-50%)" });
      return;
    }
    const r = target.getBoundingClientRect();
    spot.hidden = false;
    dim.hidden = true;
    Object.assign(spot.style, { top: `${r.top - PAD}px`, left: `${r.left - PAD}px`, width: `${r.width + PAD * 2}px`, height: `${r.height + PAD * 2}px` });
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left, window.innerWidth - width - 16));
    const below = window.innerHeight - r.bottom - PAD - 12;
    card.style.width = `${width}px`;
    card.style.transform = "";
    if (below >= CARD_HEIGHT || r.top < CARD_HEIGHT) {
      Object.assign(card.style, { top: `${Math.min(r.bottom + PAD + 12, window.innerHeight - CARD_HEIGHT)}px`, bottom: "", left: `${left}px` });
    } else {
      Object.assign(card.style, { top: "", bottom: `${window.innerHeight - r.top + PAD + 12}px`, left: `${left}px` });
    }
  }

  function render() {
    const step = present[i];
    target = document.querySelector(`[data-tour="${step.target}"]`);
    if (target) target.scrollIntoView({ block: "center" });
    const last = i === present.length - 1;
    card.innerHTML = `<div class="tt-tour-step">Step ${i + 1} of ${present.length}</div>
<h3>${escape(step.title)}</h3>
<p>${escape(step.text)}</p>
<div class="tt-tour-actions">
  <button type="button" class="tt-tour-skip">Skip tour</button>
  <span class="tt-tour-nav">${i > 0 ? '<button type="button" class="tt-tour-back">Back</button>' : ""}<button type="button" class="tt-tour-next">${last ? "Done" : "Next"}</button></span>
</div>`;
    card.querySelector(".tt-tour-skip").addEventListener("click", finish);
    card.querySelector(".tt-tour-next").addEventListener("click", () => (last ? finish() : go(i + 1)));
    const back = card.querySelector(".tt-tour-back");
    if (back) back.addEventListener("click", () => go(i - 1));
    place();
    card.querySelector(".tt-tour-next").focus();
  }

  function go(n) {
    i = Math.max(0, Math.min(present.length - 1, n));
    render();
  }

  function onKey(e) {
    if (e.key === "Escape") finish();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    window.removeEventListener("keydown", onKey);
    root.remove();
  }

  function finish() {
    if (stopped) return;
    stop();
    onDone();
  }

  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  window.addEventListener("keydown", onKey);
  render();
  return { stop };
}

/** Whether a tour was finished or skipped before, under this storage key. Unavailable storage counts as done, so the tour never nags. */
export function tourSeen(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

export function markTourSeen(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable */
  }
}
