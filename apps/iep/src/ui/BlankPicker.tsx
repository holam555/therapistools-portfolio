import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PronounSet } from "../model/types";
import { KIND_LABEL } from "../model/privacy";
import { scanReportText } from "../report/privacy-words";
import { joinList, type OptionList } from "../report/options";
import type { BlankInfo } from "../report/render";
import { fitToBlank, sampleSentences } from "../report/samples";
import { useApp } from "./state";

export interface PickerTarget {
  info: BlankInfo;
  current: string;
  examples: string[] | undefined;
  rect: DOMRect;
}

/**
 * The little panel that opens on a yellow blank: ready-made choices when the
 * blank has a list, sample sentences from the writer's own examples otherwise,
 * and always a box to type your own.
 */
export function BlankPicker({
  target,
  pronoun,
  lists,
  onChoose,
  onClose,
  onEditList,
  onEditSamples,
}: {
  target: PickerTarget;
  pronoun: PronounSet;
  /** Choices for a dropdown blank, by list name. */
  lists: (name: string) => OptionList | undefined;
  onChoose: (value: string) => void;
  onClose: () => void;
  onEditList?: (name: string) => void;
  onEditSamples?: () => void;
}) {
  const { lib } = useApp();
  const { info, current, examples, rect } = target;
  const list = info.list ? lists(info.list) : undefined;
  const samples = list ? [] : sampleSentences(examples, pronoun);
  const [text, setText] = useState(current);
  const [picked, setPicked] = useState<string[]>(() => (list?.multi ? list.options.filter((o) => current.includes(o)) : []));
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({ left: 8, width: 380, maxHeight: 360 });

  useLayoutEffect(() => {
    const width = Math.min(420, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const below = window.innerHeight - rect.bottom - 16;
    if (below >= 240) setPos({ top: rect.bottom + 6, left, width, maxHeight: below });
    else setPos({ bottom: window.innerHeight - rect.top + 6, left, width, maxHeight: Math.max(200, rect.top - 16) });
  }, [rect]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button, textarea")?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  const warnings = text.trim() ? scanReportText(text, lib) : [];
  const choose = (v: string) => {
    onChoose(v);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="blank-picker"
      role="dialog"
      aria-label={`Fill: ${info.label}`}
      style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
    >
      <div className="bp-head">{info.label}</div>

      {list && !list.multi && (
        <div className="bp-options" role="listbox" aria-label="Choices">
          {list.options.map((o) => (
            <button key={o} type="button" role="option" aria-selected={current === o} className={`bp-option ${current === o ? "on" : ""}`} onClick={() => choose(o)}>
              {o}
            </button>
          ))}
        </div>
      )}

      {list?.multi && (
        <div className="bp-multi">
          {list.options.map((o) => (
            <label key={o} className="check">
              <input type="checkbox" checked={picked.includes(o)} onChange={() => setPicked(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o])} /> {o}
            </label>
          ))}
          <button type="button" className="btn btn-sm btn-primary" disabled={!picked.length} onClick={() => choose(joinList(list.options.filter((o) => picked.includes(o))))}>
            Use {picked.length || ""} selected
          </button>
        </div>
      )}

      {samples.length > 0 && (
        <div className="bp-samples">
          <div className="bp-sub">From your examples</div>
          {samples.map((s) => (
            <button key={s} type="button" className="bp-sample" onClick={() => choose(fitToBlank(s, info.periodAfter))}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="bp-free">
        <div className="bp-sub">{list || samples.length ? "Or type your own" : "Type it in"}</div>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) choose(fitToBlank(text, info.periodAfter));
          }}
          aria-label="Your own text"
        />
        {warnings.length > 0 && (
          <div className="bp-warn">
            Looks like it may include {warnings.map((w) => `${KIND_LABEL[w.kind].toLowerCase()} “${w.text}”`).join(", ")}. Keep names and other identifying details out.
          </div>
        )}
        <div className="row gap end">
          {current && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => choose("")}>
              Clear
            </button>
          )}
          <button type="button" className="btn btn-sm" disabled={!text.trim()} onClick={() => choose(fitToBlank(text, info.periodAfter))}>
            Use this text
          </button>
        </div>
      </div>
      {(list ? onEditList : onEditSamples) && (
        <div className="bp-edit">
          {list && info.list && onEditList ? (
            <button type="button" className="link" onClick={() => onEditList(info.list!)}>Edit these choices</button>
          ) : (
            onEditSamples && (
              <button type="button" className="link" onClick={onEditSamples}>{samples.length ? "Edit sample sentences" : "Add sample sentences"}</button>
            )
          )}
        </div>
      )}
    </div>
  );
}
