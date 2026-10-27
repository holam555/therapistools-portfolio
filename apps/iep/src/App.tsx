import { useState } from "react";
import { Builder } from "./ui/Builder";
import { ReportBuilder } from "./ui/ReportBuilder";
import { ImportHelper } from "./ui/ImportHelper";
import { LibraryEditor } from "./ui/LibraryEditor";
import { Output } from "./ui/Output";
import { Settings } from "./ui/Settings";
import { AppProvider, useApp } from "./ui/state";
import { DisciplinePicker } from "./ui/DisciplinePicker";
import { DISCIPLINES, getDiscipline, type DisciplineId } from "./model/disciplines";
import { loadDiscipline, saveDiscipline } from "./model/storage";

type Tab = "report" | "library" | "import" | "builder" | "output" | "settings";

const TABS: { id: Tab; label: string; soon?: string }[] = [
  { id: "report", label: "Report" },
  { id: "library", label: "Library" },
  { id: "import", label: "Import" },
  { id: "builder", label: "Builder" },
  { id: "output", label: "Output" },
  { id: "settings", label: "Settings" },
];

export function App() {
  const [discipline, setDiscipline] = useState<DisciplineId | null>(() => loadDiscipline());
  const choose = (d: DisciplineId) => {
    saveDiscipline(d);
    setDiscipline(d);
  };
  if (!discipline) return <DisciplinePicker onChoose={choose} />;
  // The key remounts the provider, so switching loads that discipline's own bank.
  return (
    <AppProvider key={discipline} discipline={discipline} changeDiscipline={choose}>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>("report");
  const { undo, canUndo, fresh, savedAt, discipline, changeDiscipline } = useApp();
  const current = getDiscipline(discipline);
  const [dismissed, setDismissed] = useState(false);
  return (
    <div className="app">
      <tt-suite-bar current="iep" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-row">
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-name">IEP Writer</span>
          </span>
          <span className="brand-sub">works offline · no student names</span>
        </div>
        <nav className="tabs" role="tablist" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              disabled={!!t.soon}
              title={t.soon ? `Coming in ${t.soon}` : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.soon && <small> {t.soon}</small>}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <label className="discipline-switch" title="Each discipline keeps its own sentence bank, recipes and draft">
            <span className="sr-only">Discipline</span>
            <select value={discipline} onChange={(e) => changeDiscipline(e.target.value as DisciplineId)}>
              {DISCIPLINES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-sm" onClick={undo} disabled={!canUndo} title="Undo last change (Cmd/Ctrl+Z)">
            Undo
          </button>
          <span className="hint saved" aria-live="polite">
            {savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
          </span>
        </div>
      </header>
      {fresh && !dismissed && (
        <div className="notice notice-info">
          {current.hasStarter ? (
            <>
              A starter {current.label.toLowerCase()} library, with fictional sample sentences, was loaded so you have something to look
              at. Replace it with your own sentences through <strong>Import</strong>, or wipe it in <strong>Settings → Start over</strong>.
            </>
          ) : (
            <>
              Build a report template for {current.label.toLowerCase()} in <strong>Report</strong>: start blank, copy the OT template, or (soon) build
              one from your own document. The older <strong>Library</strong> and <strong>Builder</strong> tabs still work for sentence banks.
            </>
          )}{" "}
          <button type="button" className="link" onClick={() => setDismissed(true)}>
            Got it
          </button>
        </div>
      )}
      <main className="main">
        {tab === "report" && <ReportBuilder />}
        {tab === "library" && <LibraryEditor />}
        {tab === "import" && <ImportHelper onDone={() => setTab("library")} />}
        {tab === "builder" && <Builder />}
        {tab === "output" && <Output onEdit={() => setTab("builder")} />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
}
