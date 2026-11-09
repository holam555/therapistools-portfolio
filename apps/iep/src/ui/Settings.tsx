import { useRef, useState } from "react";
import { setNeverAllow } from "../model/library";
import { DISCIPLINES, getDiscipline, type DisciplineId } from "../model/disciplines";
import { makeBackup, parseBackup, serializeBackup } from "../model/storage";
import { loadPack, normalizePack, savePack } from "../report/pack";
import { defaultSetup, saveSetup, saveValues } from "../report/setup";
import { confirmAction, downloadText, todayStamp } from "./common";
import { useApp } from "./state";
import { AccountCard } from "./Account";
import { PRIVACY_PATH, SITE_ORIGIN } from "../../../../shared/brand.js";

/** From the downloaded offline file, the privacy page lives on the website. */
const privacyHref = `${typeof location !== "undefined" && location.protocol === "file:" ? SITE_ORIGIN : ""}${PRIVACY_PATH}#iep`;

/**
 * Settings: privacy, the account, the discipline, backup of the report
 * template, the never-allow words for the privacy check, and start over. The
 * sentence-bank settings (sections, grade bands, blanks, AI prompt wording)
 * retired with the Library, Import, Builder and Output tabs on 2026-11-09.
 */
export function Settings() {
  const { lib, update, replace, recipes, setRecipes, discipline, changeDiscipline } = useApp();
  const current = getDiscipline(discipline);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null);
  const hasPack = !!loadPack(discipline);

  const exportJson = () => {
    const pack = loadPack(discipline);
    downloadText(`therapistools-iep-${discipline}-backup-${todayStamp()}.json`, serializeBackup(makeBackup(lib, recipes, discipline, pack ?? undefined)));
    setMessage(pack ? "Backup file saved to your Downloads folder." : "Backup file saved to your Downloads folder. There is no report template for this discipline yet, so the file holds only older data.");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      setPendingImport(parsed);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read that file.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const restore = () => {
    if (!pendingImport) return;
    const pack = pendingImport.pack ? normalizePack(pendingImport.pack) : null;
    if (!pack) {
      setMessage("That file is from an older version and holds no report template, so there is nothing to load.");
      setPendingImport(null);
      return;
    }
    if (hasPack && !confirmAction("Replace the report template you have here with the one in the file? The one here will be gone.")) return;
    savePack(discipline, pack);
    replace(pendingImport.library);
    if (pendingImport.recipes.length) setRecipes(pendingImport.recipes);
    setPendingImport(null);
    setMessage("Template loaded from the backup file. Open the Report tab to see it.");
  };

  const startOver = () => {
    if (!confirmAction(`Delete the ${current.label.toLowerCase()} report template, the blanks you filled and the ratings? Export a backup first if you may want it back.`)) return;
    savePack(discipline, null);
    saveValues(discipline, {});
    saveSetup(discipline, defaultSetup());
    setMessage("Deleted. The Report tab offers the start choices again.");
  };

  return (
    <div className="settings">
      {message && <div className="notice">{message}</div>}

      <section className="card">
        <h2>Privacy</h2>
        <p className="hint">
          Your template and drafts are saved only in this browser. This tool has no field for a student's name and has no visit counter. It connects
          to the internet only if you sign in, and then only to save your report template to your account. Students are always written as [STUDENT].{" "}
          <a href={privacyHref}>Read the full privacy page</a>.
        </p>
      </section>

      <AccountCard />

      <section className="card">
        <h2>Discipline</h2>
        <p className="hint">Each discipline keeps its own report template, filled blanks and setup. Switching never mixes them.</p>
        <label className="field-inline">
          Writing as
          <select value={discipline} onChange={(e) => changeDiscipline(e.target.value as DisciplineId)}>
            {DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="hint">
          Your report template lives inside this browser on this computer (and in your account if you sign in). Export a file now and then so you can
          restore it. The file never holds the report you are writing.
        </p>
        <div className="row gap wrap">
          <button type="button" className="btn btn-primary" onClick={exportJson}>Export backup file</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Restore from a file…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose a backup file" />
        </div>
        {pendingImport && (
          <div className="notice">
            <p>
              {pendingImport.pack ? "The file holds a report template" : "The file holds no report template (it is from an older version)"}
              {pendingImport.exportedAt ? `, exported ${pendingImport.exportedAt.slice(0, 10)}` : ""}
              {pendingImport.discipline && pendingImport.discipline !== discipline
                ? `, from ${getDiscipline(pendingImport.discipline).label.toLowerCase()}; it will be loaded into ${current.label.toLowerCase()}`
                : ""}
              .{hasPack && pendingImport.pack ? " Loading it replaces the template you have here." : ""}
            </p>
            <div className="row gap wrap">
              <button type="button" className={`btn ${hasPack ? "btn-danger" : "btn-primary"}`} onClick={restore} disabled={!pendingImport.pack}>
                {hasPack ? "Replace my template with the file's" : "Load the template"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Never-allow list</h2>
        <p className="hint">
          Words or phrases the privacy check should always warn about when you fill a blank or edit the template, such as school names, teacher names
          or room numbers. One per line; capitalisation does not matter.
        </p>
        <textarea rows={4} defaultValue={lib.neverAllow.join("\n")} onBlur={(e) => update((l) => setNeverAllow(l, e.target.value.split("\n")))} aria-label="Never-allow words" />
      </section>

      <section className="card card-danger">
        <h2>Start over</h2>
        <p className="hint">Deletes this discipline's report template, filled blanks and ratings from this browser, and offers the start choices again on the Report tab.</p>
        <button type="button" className="btn btn-danger" onClick={startOver} disabled={!hasPack}>
          Delete the {current.short} template…
        </button>
      </section>
    </div>
  );
}
