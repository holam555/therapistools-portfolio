import { DISCIPLINES, type DisciplineId } from "../model/disciplines";

/** First visit: choose whose report template to open. It can be changed any time from the header. */
export function DisciplinePicker({ onChoose }: { onChoose: (d: DisciplineId) => void }) {
  return (
    <div className="app">
      <tt-suite-bar current="iep" />
      <main className="main picker">
        <div className="picker-head">
          <h1>
            <span className="brand-dot" aria-hidden="true" /> IEP Writer
          </h1>
          <p className="picker-lead">
            Draft IEP reports from a template with the fixed wording written in and blanks for each student. Which discipline do you write for?
            Each one keeps its own template and drafts, and you can switch any time.
          </p>
        </div>
        <div className="picker-grid">
          {DISCIPLINES.map((d) => (
            <button key={d.id} type="button" className="picker-card" onClick={() => onChoose(d.id)}>
              <span className="picker-name">{d.label}</span>
              <span className={`picker-tag ${d.hasStarter ? "has-starter" : ""}`}>
                {d.hasStarter ? "Pre-made template included" : "Start blank or from your own document"}
              </span>
            </button>
          ))}
        </div>
        <p className="hint picker-foot">
          Only occupational therapy has a pre-made report template so far. Other disciplines start blank or build a template from their own Word
          document. Nothing leaves this browser.
        </p>
      </main>
    </div>
  );
}
