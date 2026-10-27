import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

const COLLAPSE_KEY = 'gapboard-guide-collapsed';

/**
 * Narrow left stepper that walks a new user through setup, page by page.
 * Purely a guide: nothing is enforced, every step is just a link, and the
 * whole rail collapses out of the way once it has done its job. Step
 * checkmarks come from cheap live heuristics on the workspace.
 */
export function GuideRail() {
  const ws = useWorkspaceStore((s) => s.ws);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
  }

  const steps: Array<{ to: string; title: string; done: boolean }> = [
    { to: '/providers', title: 'Add providers', done: ws.providers.length > 0 },
    {
      to: '/my-schedule',
      title: 'Your on-site time',
      done: ws.providers.some((p) => p.availability.length > 0),
    },
    {
      to: '/setup',
      title: 'School schedule',
      done: ws.grades.some((g) => g.templateBlocks.length > 0),
    },
    {
      to: '/students',
      title: 'Students and goals',
      done: ws.students.some((s) => s.serviceGoals.length > 0),
    },
    {
      to: '/providers',
      title: "Colleagues' sessions",
      // Done once a second provider exists - one provider is just you.
      done: ws.providers.length >= 2,
    },
    {
      to: '/plan',
      title: 'Auto-Plan',
      // Ticks only after a plan has actually been booked from the Plan page.
      done: localStorage.getItem('gapboard-autoplan-used') === '1',
    },
    {
      to: '/tracker',
      title: 'Tracker',
      done: ws.sessionLogs.length > 0 || ws.iepCases.length > 0,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (collapsed) {
    return (
      <aside className="guide-rail collapsed">
        <button
          className="guide-toggle"
          title="Show the setup guide"
          onClick={toggle}
        >
          Guide {doneCount}/{steps.length}
        </button>
      </aside>
    );
  }

  return (
    <aside className="guide-rail">
      <div className="guide-head">
        <Link to="/home" className="guide-title" title="How the Scheduler works, privacy, and the full flow">
          Setup guide
        </Link>
        <button className="btn ghost small" title="Collapse the guide" onClick={toggle}>
          «
        </button>
      </div>
      <ol className="guide-steps">
        {steps.map((s, i) => (
          <li key={i} className={s.done ? 'done' : ''}>
            <NavLink to={s.to} end>
              <span className="guide-num">{s.done ? '✓' : i + 1}</span>
              <span className="guide-step-title">{s.title}</span>
            </NavLink>
          </li>
        ))}
      </ol>
      <p className="guide-foot">
        Steps are a suggestion, not a rule. Data lives only in this browser:{' '}
        <strong>Export backup</strong> (top right) keeps it safe.{' '}
        <Link to="/home">How it works</Link>
      </p>
    </aside>
  );
}
