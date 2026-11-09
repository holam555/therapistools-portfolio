import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";

/**
 * A short guided tour of the Report tab for a first visit: one spotlight at a
 * time on the parts of the page marked data-tour="…", with a card that says
 * what each is for. Shown once (the flag holds nothing but "done") and again
 * from "Show me around".
 */

const TOUR_KEY = "easyiep.tour.done";

export function tourDone(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourDone(): void {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

interface Step {
  target: string;
  title: string;
  text: string;
}

export const TOUR_STEPS: Step[] = [
  { target: "setup", title: "Set up the report", text: "Evaluation or annual review, the result, the grade, he or she. The draft on the right changes as you choose." },
  { target: "assessments", title: "Tick what you did", text: "Each assessment adds its section to the draft. Checklists and rating grids open under it, and their sentences are written from your ratings." },
  { target: "preview", title: "Fill the yellow blanks", text: "Click a blank to pick from your sample sentences or type your own. [STUDENT] marks where the name goes, to be typed in Word." },
  { target: "edit", title: "Make the template yours", text: "Edit template changes any wording, blank or sample sentence, and when a paragraph appears. Greyed paragraphs are ones this report leaves out." },
  { target: "download", title: "Download the Word draft", text: "Every fixed sentence is written in. Blanks you did not fill stay yellow for you to finish." },
  { target: "prompts", title: "Finish with AI, one section at a time", text: "Copy a prompt, paste it into Gemini with your notes, and paste the answer into Word. This tool itself never calls an AI." },
  { target: "settings", title: "Settings", text: "Sign in to keep your template on any computer, export a backup, or start over with a different template." },
];

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[i];
  const last = i === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center" });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]);

  const finish = () => {
    markTourDone();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pad = 8;
  const spot: CSSProperties | null = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const width = Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 800) - 32);
  const card: CSSProperties = (() => {
    if (!rect) return { top: "20vh", left: "50%", transform: "translateX(-50%)", width };
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
    const below = window.innerHeight - rect.bottom - pad - 12;
    if (below >= 230 || rect.top < 230) return { top: Math.min(rect.bottom + pad + 12, window.innerHeight - 230), left, width };
    return { bottom: window.innerHeight - rect.top + pad + 12, left, width };
  })();

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tour, step ${i + 1} of ${TOUR_STEPS.length}`}>
      {spot ? <div className="tour-spot" style={spot} /> : <div className="tour-dim" />}
      <div className="tour-card" style={card}>
        <div className="tour-step">
          Step {i + 1} of {TOUR_STEPS.length}
        </div>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="row gap between wrap">
          <button type="button" className="link" onClick={finish}>
            Skip tour
          </button>
          <span className="row gap">
            {i > 0 && (
              <button type="button" className="btn btn-sm" onClick={() => setI(i - 1)}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-sm btn-primary" onClick={() => (last ? finish() : setI(i + 1))} autoFocus>
              {last ? "Done" : "Next"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
