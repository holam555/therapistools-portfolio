import { useEffect, useState } from "react";
import { ReportBuilder } from "./ui/ReportBuilder";
import { Settings } from "./ui/Settings";
import { AppProvider, useApp } from "./ui/state";
import { DisciplinePicker } from "./ui/DisciplinePicker";
import { DISCIPLINES, type DisciplineId } from "./model/disciplines";
import { loadDiscipline, saveDiscipline } from "./model/storage";
import { loadPack } from "./report/pack";
import { TEMPLATE_CHANGED } from "./account/events";
import { AccountProvider, useAccount } from "./account/AccountProvider";
import { AccountButton, ConflictNotice, WelcomeNotice, welcomeSeen } from "./ui/Account";
import { Tour, tourDone } from "./ui/Tour";

type Tab = "report" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "report", label: "Report" },
  { id: "settings", label: "Settings" },
];

export function App() {
  const [discipline, setDiscipline] = useState<DisciplineId | null>(() => loadDiscipline());
  const choose = (d: DisciplineId) => {
    saveDiscipline(d);
    setDiscipline(d);
  };
  if (!discipline) return <DisciplinePicker onChoose={choose} />;
  // The key remounts the provider, so switching loads that discipline's own template and drafts.
  return (
    <AppProvider key={discipline} discipline={discipline} changeDiscipline={choose}>
      <AccountProvider>
        <Shell />
      </AccountProvider>
    </AppProvider>
  );
}

/** Two tabs: the report, and settings. The older sentence-bank tabs (Library, Import, Builder, Output) retired on 2026-11-09. */
function Shell() {
  const [tab, setTab] = useState<Tab>("report");
  const { discipline, changeDiscipline } = useApp();
  // When the account's template replaces this browser's, the report editor reloads it.
  const { enabled, ready, user, templateEpoch } = useAccount();

  // The tour runs once, the first time a template is on screen and no welcome dialog is in the way.
  const [hasPack, setHasPack] = useState(() => !!loadPack(discipline));
  useEffect(() => {
    const on = () => setHasPack(!!loadPack(discipline));
    window.addEventListener(TEMPLATE_CHANGED, on);
    return () => window.removeEventListener(TEMPLATE_CHANGED, on);
  }, [discipline]);
  const [welcomeDone, setWelcomeDone] = useState(welcomeSeen);
  const welcomeOpen = enabled && ready && !user && !welcomeDone;
  const [tour, setTour] = useState(false);
  useEffect(() => {
    if (tab === "report" && hasPack && ready && !welcomeOpen && !tourDone()) setTour(true);
  }, [tab, hasPack, ready, welcomeOpen]);
  const showTour = () => {
    setTab("report");
    setTour(true);
  };

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
              onClick={() => setTab(t.id)}
              data-tour={t.id === "settings" ? "settings" : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <label className="discipline-switch" title="Each discipline keeps its own template and drafts">
            <span className="sr-only">Discipline</span>
            <select value={discipline} onChange={(e) => changeDiscipline(e.target.value as DisciplineId)}>
              {DISCIPLINES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </select>
          </label>
          {hasPack && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={showTour} title="A short tour of the Report tab">
              Show me around
            </button>
          )}
          <AccountButton />
        </div>
      </header>
      <ConflictNotice />
      <WelcomeNotice onSeen={() => setWelcomeDone(true)} />
      <main className="main">
        {tab === "report" && <ReportBuilder key={templateEpoch} />}
        {tab === "settings" && <Settings />}
      </main>
      {tour && tab === "report" && hasPack && <Tour onClose={() => setTour(false)} />}
    </div>
  );
}
