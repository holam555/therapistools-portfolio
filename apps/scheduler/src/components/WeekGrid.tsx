import type { ReactNode } from 'react';
import type { ScheduleInterval } from '../domain/schedule';
import type { DayOfWeek, Minutes } from '../domain/types';
import { DAY_NAMES, DAYS, formatMinutes } from '../domain/types';

export interface WeekGridProps {
  window: { start: Minutes; end: Minutes };
  intervals: ScheduleInterval[];
  pxPerMinute?: number;
  /** Click on a gap interval; minutes is the 5-min-snapped time at the click point. */
  onGapClick?: (day: DayOfWeek, minutes: Minutes) => void;
  onSessionClick?: (sessionId: string) => void;
  /** Editors: click on a blocked interval (template/override editing). */
  onBlockClick?: (interval: ScheduleInterval) => void;
  sessionColor?: (sessionId: string) => string;
  sessionContent?: (interval: ScheduleInterval) => ReactNode;
  showTimes?: boolean;
  /** Which day columns to render (default all five). */
  days?: DayOfWeek[];
  /** Header labels overriding DAY_NAMES (e.g. ["Every day"]). */
  headerLabels?: string[];
  /** Label on clickable gaps (default "book") - e.g. "book / block". */
  gapAction?: string;
  /** Minutes between time-axis labels and gridlines (default 60). */
  tickMinutes?: number;
}

export function WeekGrid({
  window: win,
  intervals,
  pxPerMinute = 1.1,
  onGapClick,
  onSessionClick,
  onBlockClick,
  sessionColor,
  sessionContent,
  showTimes = true,
  days = DAYS,
  headerLabels,
  gapAction = 'book',
  tickMinutes = 60,
}: WeekGridProps) {
  const totalMin = win.end - win.start;
  const height = totalMin * pxPerMinute;
  const y = (m: Minutes) => (m - win.start) * pxPerMinute;

  // Concurrent sessions (e.g. one provider row holding several people's
  // schedules) render side by side instead of stacking. Greedy lane packing
  // per overlap cluster.
  const lanes = new Map<ScheduleInterval, { lane: number; lanes: number }>();
  for (const d of days) {
    const daySessions = intervals
      .filter((i) => i.day === d && i.kind === 'session')
      .sort((a, b) => a.start - b.start || b.end - a.end);
    let cluster: ScheduleInterval[] = [];
    let laneEnds: number[] = [];
    let clusterEnd = -1;
    const flush = () => {
      for (const s of cluster) lanes.set(s, { ...lanes.get(s)!, lanes: laneEnds.length });
      cluster = [];
      laneEnds = [];
    };
    for (const s of daySessions) {
      if (cluster.length > 0 && s.start >= clusterEnd) flush();
      let lane = laneEnds.findIndex((end) => end <= s.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(s.end);
      } else {
        laneEnds[lane] = s.end;
      }
      lanes.set(s, { lane, lanes: 1 });
      cluster.push(s);
      clusterEnd = Math.max(clusterEnd, s.end);
    }
    flush();
  }

  const hourTicks: Minutes[] = [];
  for (let m = Math.ceil(win.start / tickMinutes) * tickMinutes; m <= win.end; m += tickMinutes) {
    hourTicks.push(m);
  }
  // The first label sits at the very top edge; anchoring it downward keeps
  // it from being clipped by the grid's rounded overflow.
  const tickClass = (m: Minutes) =>
    `tick${m % 60 !== 0 ? ' minor' : ''}${y(m) < 8 ? ' top-anchored' : ''}`;

  function handleGapClick(e: React.MouseEvent<HTMLDivElement>, i: ScheduleInterval) {
    if (!onGapClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawMin = i.start + (e.clientY - rect.top) / pxPerMinute;
    const snapped = Math.max(i.start, Math.min(Math.round(rawMin / 5) * 5, i.end - 5));
    onGapClick(i.day, snapped);
  }

  return (
    <div className="weekgrid-outer">
      <div style={{ display: 'flex' }}>
        <div style={{ width: 52, flexShrink: 0 }} />
        <div style={{ display: 'flex', flex: 1 }}>
          {days.map((d, idx) => (
            <div key={d} className="dayhead" style={{ flex: 1 }}>
              {headerLabels?.[idx] ?? DAY_NAMES[d]}
            </div>
          ))}
        </div>
      </div>
      <div className="weekgrid" style={{ height }}>
        <div className="timeaxis" style={{ height }}>
          {hourTicks.map((m) => (
            <span key={m} className={tickClass(m)} style={{ top: y(m) }}>
              {formatMinutes(m)}
            </span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className="daycol" style={{ height }}>
            {hourTicks.map((m) => (
              <div key={m} className={`hourline${m % 60 !== 0 ? ' minor' : ''}`} style={{ top: y(m) }} />
            ))}
            {intervals
              .filter((i) => i.day === d)
              .map((i, idx) => {
                const style: React.CSSProperties = {
                  top: y(i.start),
                  height: (i.end - i.start) * pxPerMinute,
                };
                if (i.kind === 'session') {
                  if (sessionColor && i.sessionId) style.background = sessionColor(i.sessionId);
                  const laneInfo = lanes.get(i);
                  if (laneInfo && laneInfo.lanes > 1) {
                    style.left = `calc(${(laneInfo.lane / laneInfo.lanes) * 100}% + 2px)`;
                    style.width = `calc(${100 / laneInfo.lanes}% - 4px)`;
                    style.right = 'auto';
                  }
                  const dur = i.end - i.start;
                  const showSessionTime = showTimes && dur >= 10;
                  return (
                    <div
                      key={i.sessionId ?? idx}
                      className="interval session"
                      style={style}
                      title={`${formatMinutes(i.start)}-${formatMinutes(i.end)}`}
                      onClick={() => i.sessionId && onSessionClick?.(i.sessionId)}
                    >
                      {i.verified && (
                        <span className="verify-tick" title="Verified by hand">
                          ✓
                        </span>
                      )}
                      {showSessionTime && (
                        <span
                          className="interval-time"
                          style={{
                            display: dur >= 25 ? 'block' : 'inline',
                            marginRight: 4,
                            fontSize: dur < 15 ? 8 : dur < 20 ? 9 : undefined,
                          }}
                        >
                          {formatMinutes(i.start)}-{formatMinutes(i.end)}
                        </span>
                      )}
                      {sessionContent
                        ? sessionContent(i)
                        : !showSessionTime && (
                            <span className="interval-time">
                              {formatMinutes(i.start)}-{formatMinutes(i.end)}
                            </span>
                          )}
                    </div>
                  );
                }
                if (i.kind === 'gap') {
                  const dur = i.end - i.start;
                  return (
                    <div
                      key={idx}
                      className="interval gap"
                      style={style}
                      onClick={onGapClick ? (e) => handleGapClick(e, i) : undefined}
                      title={`${formatMinutes(i.start)}-${formatMinutes(i.end)} open (${dur} min)${onGapClick ? ` - click to ${gapAction}` : ''}`}
                    >
                      {showTimes && dur >= 10 && (
                        <span className="interval-time" style={{ fontSize: dur < 20 ? 8 : undefined, lineHeight: dur < 20 ? '1' : undefined }}>
                          {formatMinutes(i.start)}-{formatMinutes(i.end)}
                        </span>
                      )}
                      {onGapClick && dur >= 20 && <div className="interval-label">+ {gapAction}</div>}
                    </div>
                  );
                }
                const cls =
                  i.kind === 'unavailable'
                    ? 'interval unavailable'
                    : `interval ${i.kind}${onBlockClick ? ' editable-block' : ''}`;
                const blockName = i.label ?? (i.kind === 'unavailable' ? 'off site' : 'blocked');
                return (
                  <div
                    key={idx}
                    className={cls}
                    style={style}
                    title={`${formatMinutes(i.start)}-${formatMinutes(i.end)} ${blockName}`}
                    onClick={onBlockClick ? () => onBlockClick(i) : undefined}
                  >
                    {i.end - i.start >= 15 && blockName}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
