import { useId, type ReactNode } from 'react';
import type { DayOfWeek, Minutes, TimeBlock, WeekScope } from '../domain/types';
import { DAY_NAMES, DAYS } from '../domain/types';
import { TimeSelect } from './TimeSelect';

export type EditableBlock = TimeBlock & {
  weeks?: WeekScope;
  label?: string;
  optional?: boolean;
  /** Row applies Monday-Friday (expanded to five blocks on save). */
  everyDay?: boolean;
};

interface BlockListEditorProps {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
  window: { start: Minutes; end: Minutes };
  showWeeks?: boolean;
  /** When set, each row gets a "why" select fed by these options (e.g. times-to-avoid categories). */
  labelOptions?: string[];
  addLabel?: string;
  /** New rows span the whole window (used for on-site availability) instead of 30 min. */
  fullWindowDefault?: boolean;
  /** Show a "+ Every day Mon-Fri" quick-add of five full-window blocks. */
  quickAddWeek?: boolean;
  /** Hide the day column - rows apply daily (school master schedules). */
  hideDay?: boolean;
  /** Show the "who it binds" select: everyone vs. only students who opt in. */
  showOptional?: boolean;
  /** Day select gains an "Every day" choice (row expands to Mon-Fri on save). */
  allowEveryDay?: boolean;
  /** Extra note rendered at the end of a row (e.g. "Mon/Tue only"). */
  rowNote?: (block: EditableBlock, index: number) => ReactNode;
}

/** Table of (day, start, end[, weeks][, label]) rows with add/remove. */
export function BlockListEditor({
  blocks,
  onChange,
  window: win,
  showWeeks = false,
  labelOptions,
  addLabel = 'Add block',
  fullWindowDefault = false,
  quickAddWeek = false,
  hideDay = false,
  showOptional = false,
  allowEveryDay = false,
  rowNote,
}: BlockListEditorProps) {
  const listId = useId();
  function update(i: number, patch: Partial<EditableBlock>) {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function add() {
    const block: EditableBlock = {
      day: 0,
      start: win.start,
      end: fullWindowDefault ? win.end : Math.min(win.start + 30, win.end),
    };
    if (showWeeks) block.weeks = 'both';
    onChange([...blocks, block]);
  }

  function addWeek() {
    const week: EditableBlock[] = DAYS.map((day) => {
      const block: EditableBlock = { day, start: win.start, end: win.end };
      if (showWeeks) block.weeks = 'both';
      return block;
    });
    onChange([...blocks, ...week]);
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {blocks.map((b, i) => (
        <div className="row" key={i}>
          {!hideDay && (
            <select
              value={b.everyDay ? 'all' : b.day}
              onChange={(e) =>
                update(
                  i,
                  e.target.value === 'all'
                    ? { everyDay: true }
                    : { everyDay: undefined, day: Number(e.target.value) as DayOfWeek },
                )
              }
            >
              {allowEveryDay && <option value="all">Every day</option>}
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          )}
          <TimeSelect
            value={b.start}
            min={win.start}
            max={win.end - 5}
            onChange={(m) => update(i, { start: m, end: Math.max(b.end, m + 5) })}
          />
          <span style={{ color: 'var(--muted)' }}>to</span>
          <TimeSelect
            value={b.end}
            min={b.start + 5}
            max={win.end}
            onChange={(m) => update(i, { end: m })}
          />
          {showWeeks && (
            <select
              value={b.weeks ?? 'both'}
              onChange={(e) => update(i, { weeks: e.target.value as WeekScope })}
              title="Every week, or only week A / week B of the rotation"
            >
              <option value="both">Every week</option>
              <option value="A">Week A only</option>
              <option value="B">Week B only</option>
            </select>
          )}
          {labelOptions && (
            <>
              <input
                value={b.label ?? ''}
                list={listId}
                placeholder="label (Lunch, ELD…)"
                style={{ width: 130 }}
                title="What is this time? Shown on student calendars and in conflict messages."
                onChange={(e) => update(i, { label: e.target.value || undefined })}
              />
              <datalist id={listId}>
                {labelOptions.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </>
          )}
          {showOptional && (
            <select
              value={b.optional ? 'optional' : 'all'}
              onChange={(e) => update(i, { optional: e.target.value === 'optional' ? true : undefined })}
              title='"Only students who need it": blocks nothing by default - turn it on per student on their page (e.g. ELD for NEP/LEP students).'
            >
              <option value="all">Blocks everyone</option>
              <option value="optional">Only students who need it</option>
            </select>
          )}
          <button
            className="btn ghost small"
            onClick={() => onChange(blocks.filter((_, idx) => idx !== i))}
            title="Remove"
          >
            ✕
          </button>
          {rowNote?.(b, i)}
        </div>
      ))}
      <div className="row">
        <button className="btn small" onClick={add}>
          + {addLabel}
        </button>
        {quickAddWeek && (
          <button className="btn small" onClick={addWeek} title="Adds Mon-Fri, full school day - trim rows after">
            + Every day Mon-Fri
          </button>
        )}
      </div>
    </div>
  );
}
