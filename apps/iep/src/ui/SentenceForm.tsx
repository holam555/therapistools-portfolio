import { useEffect, useRef, useState } from "react";
import type { PronounSet, Sentence } from "../model/types";
import { findVariable, upsertVariable } from "../model/library";
import { AUTO_TOKENS, isValidVariableName, renderSegments, slugifyVariableName, variableNames } from "../model/template";
import { TokenLegend } from "./common";
import { useApp } from "./state";

/**
 * Edit one sentence: text with {{blanks}}, section, grade bands, tags, notes.
 * Keyboard: Cmd/Ctrl+Enter saves, Escape cancels.
 */
export function SentenceForm({ initial, onSave, onCancel }: { initial: Sentence; onSave: (s: Sentence) => void; onCancel: () => void }) {
  const { lib, update } = useApp();
  const [draft, setDraft] = useState<Sentence>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [previewAs, setPreviewAs] = useState<PronounSet>("he");
  const [blankPrompt, setBlankPrompt] = useState<{ start: number; end: number; selected: string; choice: string; newName: string } | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);
  useEffect(() => {
    if (blankPrompt?.choice === "__new__") nameRef.current?.select();
  }, [blankPrompt?.choice]);

  const names = variableNames(draft.text);
  const undefinedNames = names.filter((v) => !findVariable(lib, v));

  const save = () => {
    const text = draft.text.trim();
    if (!text) {
      textRef.current?.focus();
      return;
    }
    onSave({ ...draft, text, tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean) });
  };

  const defineBlank = (name: string, firstPreset?: string) =>
    update((l) => upsertVariable(l, { name, label: name.replace(/_/g, " "), presets: firstPreset ? [firstPreset] : [], allowFreeText: true }));

  /** Replace [start, end) of the text with `insert` and put the cursor after it. */
  const splice = (start: number, end: number, insert: string) => {
    const next = draft.text.slice(0, start) + insert + draft.text.slice(end);
    setDraft({ ...draft, text: next });
    setTimeout(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + insert.length, start + insert.length);
    }, 0);
  };

  const insertAtCursor = (token: string) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? draft.text.length;
    const end = el?.selectionEnd ?? start;
    splice(start, end, token);
  };

  const onInsertMenu = (value: string) => {
    if (!value) return;
    if (value === "__new__") {
      const el = textRef.current;
      const start = el?.selectionStart ?? draft.text.length;
      const end = el?.selectionEnd ?? start;
      setBlankPrompt({ start, end, selected: draft.text.slice(start, end).trim(), choice: "__new__", newName: "" });
      return;
    }
    insertAtCursor(value);
  };

  const startMakeBlank = () => {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draft.text.slice(start, end).trim();
    if (!selected) {
      setNudge("First highlight the words that change from student to student (for example “80%” or “4 out of 5”), then click this button.");
      el.focus();
      return;
    }
    setNudge(null);
    // If an existing blank already lists these words as a preset, suggest it.
    const match = lib.variables.find((v) => v.presets.some((p) => p.toLowerCase() === selected.toLowerCase()));
    setBlankPrompt({ start, end, selected, choice: match ? match.name : "__new__", newName: slugifyVariableName(selected) });
  };

  const finishMakeBlank = () => {
    if (!blankPrompt) return;
    let name = blankPrompt.choice;
    if (name === "__new__") {
      name = blankPrompt.newName.trim().toLowerCase().replace(/\s+/g, "_");
      if (!isValidVariableName(name)) {
        setNudge("A blank's name uses lowercase letters, numbers and underscores (like accuracy or line_type), and can't be student, he, she, etc.");
        return;
      }
    }
    const existing = findVariable(lib, name);
    if (!existing) defineBlank(name, blankPrompt.selected || undefined);
    else if (blankPrompt.selected && !existing.presets.some((p) => p.toLowerCase() === blankPrompt.selected.toLowerCase()))
      update((l) => upsertVariable(l, { ...existing, presets: [...existing.presets, blankPrompt.selected] }));
    splice(blankPrompt.start, blankPrompt.end, `{{${name}}}`);
    setBlankPrompt(null);
    setNudge(null);
  };

  const toggleBand = (id: string) =>
    setDraft({
      ...draft,
      gradeBandIds: draft.gradeBandIds.includes(id) ? draft.gradeBandIds.filter((b) => b !== id) : [...draft.gradeBandIds, id],
    });

  const preview = renderSegments(draft.text, { pronounSet: previewAs, values: {} });

  return (
    <form
      className="sentence-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !blankPrompt) onCancel();
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
      }}
    >
      <label className="field">
        <span className="field-label">Sentence text</span>
        <textarea
          ref={textRef}
          rows={4}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="{{Student}} cut along a {{line_type}} with {{accuracy}} accuracy in {{trials}} trials."
        />
      </label>

      <div className="row gap wrap editor-tools">
        <label className="field-inline">
          Insert
          <select value="" onChange={(e) => onInsertMenu(e.target.value)} aria-label="Insert a token or blank at the cursor">
            <option value="">choose…</option>
            <optgroup label="Filled in automatically">
              {AUTO_TOKENS.map((t) => (
                <option key={t.token} value={t.token}>{t.label}</option>
              ))}
            </optgroup>
            <optgroup label="Blanks you fill in later">
              {lib.variables.map((v) => (
                <option key={v.name} value={`{{${v.name}}}`}>
                  {v.label}{v.presets.length ? ` (${v.presets.slice(0, 3).join(", ")}${v.presets.length > 3 ? "…" : ""})` : ""}
                </option>
              ))}
              <option value="__new__">New blank…</option>
            </optgroup>
          </select>
        </label>
        <button type="button" className="btn btn-sm" onClick={startMakeBlank}>
          Turn highlighted words into a blank
        </button>
      </div>
      {nudge && <div className="notice">{nudge}</div>}

      {blankPrompt && (
        <div className="var-prompt" role="group" aria-label="Choose a blank">
          <div className="var-prompt-title">
            {blankPrompt.selected ? <>Replace <strong>“{blankPrompt.selected}”</strong> with which blank?</> : <>Insert which blank?</>}
          </div>
          <div className="row gap wrap">
            <select value={blankPrompt.choice} onChange={(e) => setBlankPrompt({ ...blankPrompt, choice: e.target.value })} aria-label="Blank">
              {lib.variables.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}{v.presets.length ? ` (${v.presets.slice(0, 3).join(", ")}${v.presets.length > 3 ? "…" : ""})` : ""}
                </option>
              ))}
              <option value="__new__">A new blank named…</option>
            </select>
            {blankPrompt.choice === "__new__" && (
              <input
                ref={nameRef}
                value={blankPrompt.newName}
                placeholder="e.g. accuracy"
                onChange={(e) => setBlankPrompt({ ...blankPrompt, newName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    finishMakeBlank();
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setBlankPrompt(null);
                  }
                }}
                aria-label="New blank name"
              />
            )}
            <button type="button" className="btn btn-sm btn-primary" onClick={finishMakeBlank}>
              {blankPrompt.selected ? "Replace" : "Insert"}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setBlankPrompt(null)}>
              Cancel
            </button>
          </div>
          {blankPrompt.selected && blankPrompt.choice === "__new__" && (
            <span className="hint">“{blankPrompt.selected}” becomes the first preset choice of the new blank. Add more in Settings → Blanks.</span>
          )}
        </div>
      )}

      <div className="reads-as">
        <div className="row gap between">
          <span className="field-label">Reads as</span>
          <span className="seg" role="radiogroup" aria-label="Preview pronouns">
            <button type="button" className={previewAs === "he" ? "on" : ""} onClick={() => setPreviewAs("he")}>he</button>
            <button type="button" className={previewAs === "she" ? "on" : ""} onClick={() => setPreviewAs("she")}>she</button>
          </span>
        </div>
        <p className="reads-as-text">
          {draft.text.trim() === "" ? (
            <span className="hint">Type a sentence above.</span>
          ) : (
            preview.map((s, i) =>
              s.kind === "text" ? (
                <span key={i}>{s.text}</span>
              ) : s.kind === "auto" ? (
                <span key={i} className="tok tok-reserved">{s.text}</span>
              ) : (
                <span key={i} className={`tok ${findVariable(lib, s.name) ? "tok-var" : "tok-unknown"}`}>⟨{findVariable(lib, s.name)?.label ?? s.name}⟩</span>
              ),
            )
          )}
        </p>
        <TokenLegend />
        {undefinedNames.length > 0 && (
          <div className="row gap wrap">
            <span className="hint">Blanks without settings yet:</span>
            {undefinedNames.map((v) => (
              <span key={v} className="chip chip-warn">
                {v}
                <button type="button" className="chip-action" onClick={() => defineBlank(v)} title="Add this blank to Settings so you can give it preset choices">
                  Set up
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid2">
        <label className="field">
          <span className="field-label">IEP section</span>
          <select value={draft.sectionId ?? ""} onChange={(e) => setDraft({ ...draft, sectionId: e.target.value || null })}>
            <option value="">(no section)</option>
            {lib.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <fieldset className="field">
          <legend className="field-label">Grade bands (none checked = all grades)</legend>
          <div className="row gap wrap">
            {lib.gradeBands.map((g) => (
              <label key={g.id} className="check">
                <input type="checkbox" checked={draft.gradeBandIds.includes(g.id)} onChange={() => toggleBand(g.id)} /> {g.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="grid2">
        <label className="field">
          <span className="field-label">Tags (comma separated)</span>
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="strength, needs cue" />
        </label>
        <label className="field">
          <span className="field-label">Notes to self</span>
          <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="When to use this one…" />
        </label>
      </div>
      <div className="row gap end">
        <span className="hint">Cmd/Ctrl+Enter to save · Esc to cancel</span>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save sentence</button>
      </div>
    </form>
  );
}
