import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { seedWorkspace } from '../storage/seed';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

const FLOW: Array<{ to: string; step: string }> = [
  { to: '/providers', step: 'Add providers' },
  { to: '/my-schedule', step: 'Set your on-site time' },
  { to: '/setup', step: 'Enter the school schedule' },
  { to: '/students', step: 'Add students and service goals' },
  { to: '/providers', step: "Import colleagues' schedules" },
  { to: '/plan', step: 'Auto-Plan your week' },
  { to: '/tracker', step: 'Log sessions and IEP deadlines' },
];

/** The guide page: what the app is for, the privacy rules, and the flow. */
export function HomeScreen() {
  const navigate = useNavigate();
  const ws = useWorkspaceStore((s) => s.ws);
  const replaceWorkspace = useWorkspaceStore((s) => s.replaceWorkspace);
  const renameSchool = useWorkspaceStore((s) => s.renameSchool);
  const activeSchoolId = useWorkspaceStore((s) => s.activeSchoolId);
  const [confirmSample, setConfirmSample] = useState(false);
  const hasData =
    ws.providers.length > 0 || ws.students.length > 0 || ws.sessions.length > 0 || ws.grades.length > 0;

  function loadSample() {
    replaceWorkspace(seedWorkspace());
    renameSchool(activeSchoolId, 'Sample');
    navigate('/board');
  }

  return (
    <div className="stack" style={{ maxWidth: 860, margin: '0 auto', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '12px 0 0' }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>
          Welcome to the{' '}
          <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>Scheduler</em>
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
          A scheduling tool for school therapists. Find every student's open gaps, fit
          your service minutes into them without double-booking, and track sessions and
          IEP deadlines in one place.
        </p>
        <div className="stack" style={{ gap: 8, alignItems: 'center', marginTop: 16 }}>
          <Link to="/providers" className="btn primary" style={{ display: 'inline-block' }}>
            Start with blank data
          </Link>
          <button
            className="btn"
            title="Load a small example school to click around in"
            onClick={() => (hasData ? setConfirmSample(true) : loadSample())}
          >
            Start with sample data
          </button>
        </div>
      </div>

      {confirmSample && (
        <ConfirmModal
          title="Replace this school with sample data?"
          message="This school already has data - providers, students, or schedules. Loading the sample REPLACES all of it. Export backup first if you might want it back."
          confirmLabel="Replace with sample"
          onConfirm={loadSample}
          onClose={() => setConfirmSample(false)}
        />
      )}

      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>Private by design - read this first</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
          <li>
            <strong>Everything stays in this browser.</strong> There is no account and
            no database: your schedules never leave this computer.
          </li>
          <li>
            <strong>Never enter personal information.</strong> No student names, no real
            ID numbers, no birthdays - not in any field, note, or label. Students are
            plain numbers here (1, 2, 3...).
          </li>
          <li>
            <strong>Keep your own name-to-number list</strong> somewhere you already
            trust (your locked case files). This app never stores it and never asks
            for it.
          </li>
          <li>
            <strong>Clearing browser data wipes everything.</strong> If cookies and site
            data are cleared, your schedules are gone. Use{' '}
            <strong>Export backup</strong> (top right) regularly: it downloads a file you
            can re-import any time.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 17, marginBottom: 4 }}>The flow</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
          Follow it loosely - everything stays editable later.
        </p>
        <div className="flow-chart">
          {FLOW.map((f, i) => (
            <div className="flow-cell" key={i}>
              <Link to={f.to} className="flow-step">
                <span className="flow-num">{i + 1}</span>
                <span className="flow-title">{f.step}</span>
              </Link>
              {i % 3 !== 2 && i < FLOW.length - 1 && <span className="flow-arrow">→</span>}
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--gap-ink)', fontSize: 13, fontWeight: 600, marginBottom: 0 }}>
          Excel shortcuts can fill most steps for you. They are in beta, so always check
          the result after uploading.
        </p>
        <div className="flow-loop">
          <span className="flow-loop-arrow">↻</span> Schedules change all year. When a
          teacher moves math or a colleague shifts a session, update it here, and the
          Gap Board and Auto-Plan instantly show the new gaps, including where makeup
          minutes can fit.
        </div>
      </div>
    </div>
  );
}
