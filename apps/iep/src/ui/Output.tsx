import { useMemo, useState } from "react";
import { assemble, assembledToText, sectionToText } from "../model/assemble";
import { buildDocx, docxFileName, docxToBlob } from "../model/docx";
import { KIND_LABEL, scanForLibrary, type PrivacyWarning } from "../model/privacy";
import { buildPrompt, unfilledBlanks } from "../model/prompt";
import { getDiscipline } from "../model/disciplines";
import { copyText, downloadBlob } from "./clipboard";
import { Modal } from "./common";
import { useApp } from "./state";

/** Phase 3: copy each section, copy everything, or download a Word file. */
export function Output({ onEdit }: { onEdit: () => void }) {
  const { lib, draft, discipline } = useApp();
  const assembled = useMemo(() => assemble(lib, draft), [lib, draft]);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const prompt = useMemo(() => buildPrompt(lib, assembled, getDiscipline(discipline).role), [lib, assembled, discipline]);
  const blanks = useMemo(() => unfilledBlanks(lib, assembled), [lib, assembled]);
  // Scan the prompt: it contains everything the other outputs contain, plus the prompt wording.
  const warnings = useMemo(() => scanForLibrary(prompt, lib), [prompt, lib]);
  const warnNote = warnings.length ? ` Note: ${warnings.length} privacy warning${warnings.length === 1 ? "" : "s"} above.` : "";

  const say = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((m) => (m === msg ? null : m)), 2500);
  };

  const copy = async (text: string, what: string) => {
    const ok = await copyText(text);
    say(ok ? `Copied ${what}.${warnNote}` : `Could not copy ${what}. Select the text and press Cmd/Ctrl+C instead.`);
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await docxToBlob(buildDocx(assembled));
      downloadBlob(docxFileName(), blob);
      say(`Word file saved to your Downloads folder.${warnNote}`);
    } catch (err) {
      say(err instanceof Error ? `Could not build the Word file: ${err.message}` : "Could not build the Word file.");
    } finally {
      setBusy(false);
    }
  };

  const empty = assembled.sections.length === 0;

  return (
    <div className="output">
      <section className="card">
        <div className="row gap wrap between">
          <div>
            <h2>Output</h2>
            <p className="hint">
              {empty
                ? "Nothing to show yet. Build an IEP first."
                : `${assembled.sentenceCount} sentence${assembled.sentenceCount === 1 ? "" : "s"} in ${assembled.sections.length} section${assembled.sections.length === 1 ? "" : "s"}.`}
              {assembled.missing > 0 && (
                <span className="warn"> {assembled.missing} blank{assembled.missing === 1 ? " is" : "s are"} still unfilled and will appear as [[name]].</span>
              )}
            </p>
          </div>
          <div className="row gap wrap">
            <button type="button" className="btn" onClick={onEdit}>← Back to Builder</button>
            <button type="button" className="btn" onClick={() => copy(assembledToText(assembled), "everything")} disabled={empty}>Copy all</button>
            <button type="button" className="btn btn-primary" onClick={download} disabled={empty || busy}>{busy ? "Building…" : "Download Word (.docx)"}</button>
            <button type="button" className="btn btn-accent" onClick={() => setShowPrompt(true)} disabled={empty} title="Build a prompt for an AI chatbot that fills the blanks from your notes without changing your wording">
              Build AI prompt
            </button>
          </div>
        </div>
        {flash && <div className="notice notice-ok" role="status">{flash}</div>}
        <PrivacyPanel warnings={warnings} empty={empty} />
      </section>

      {showPrompt && (
        <Modal title="AI hand-off prompt" onClose={() => setShowPrompt(false)} wide>
          <p className="hint">
            Copy this whole prompt into any AI chatbot. Then paste your rough session notes where it says <strong>paste them below this line</strong>, and send.
            The AI is told to keep your wording, fill only the blanks, keep [STUDENT], and list anything it could not fill.
            {blanks.length > 0 ? ` It will try to fill ${blanks.length} blank${blanks.length === 1 ? "" : "s"}: ${blanks.map((b) => b.label).join(", ")}.` : " Every blank is already filled, so it will only check grammar."}
          </p>
          <textarea className="prompt-text" readOnly value={prompt} rows={22} aria-label="AI prompt" onFocus={(e) => e.currentTarget.select()} />
          <div className="row gap end">
            <span className="hint">You can change the wording in Settings → AI prompt.</span>
            <button type="button" className="btn" onClick={() => setShowPrompt(false)}>Close</button>
            <button type="button" className="btn btn-primary" onClick={() => copy(prompt, "the AI prompt")}>Copy prompt</button>
          </div>
        </Modal>
      )}

      {assembled.sections.map((s) => (
        <section key={s.sectionId ?? "none"} className="card out-section">
          <div className="row gap between">
            <h3>{s.sectionName}</h3>
            <span className="row gap">
              {s.missing > 0 && <span className="hint warn">{s.missing} blank{s.missing === 1 ? "" : "s"} unfilled</span>}
              <button type="button" className="btn btn-sm" onClick={() => copy(sectionToText(s), `“${s.sectionName}”`)}>Copy section</button>
            </span>
          </div>
          <pre className="out-text">{sectionToText(s)}</pre>
        </section>
      ))}
    </div>
  );
}


/** Privacy check results. Warns only; every button stays enabled. */
function PrivacyPanel({ warnings, empty }: { warnings: PrivacyWarning[]; empty: boolean }) {
  if (empty) return null;
  if (warnings.length === 0)
    return (
      <div className="privacy privacy-ok" role="status">
        <strong>Privacy check:</strong> nothing that looks like a name, date, phone number, email, or a never-allow word.
      </div>
    );
  return (
    <div className="privacy privacy-warn" role="alert">
      <div>
        <strong>Privacy check:</strong> {warnings.length} thing{warnings.length === 1 ? "" : "s"} to look at before you copy or share. This only warns; nothing is blocked.
      </div>
      <ul className="privacy-list">
        {warnings.map((w, i) => (
          <li key={i}>
            <span className="badge">{KIND_LABEL[w.kind]}</span> <strong>{w.text}</strong> <span className="hint">— {w.reason}</span>
            <div className="hint privacy-snippet">{w.snippet}</div>
          </li>
        ))}
      </ul>
      <div className="hint">Fix it in the Builder (the value you typed) or in the Library (the sentence). Add school names and other words to the never-allow list in Settings.</div>
    </div>
  );
}
