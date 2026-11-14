import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PRIVACY_PATH } from '../../../../shared/brand.js';

/** Last substantive edit to either document, shown to the reader. */
const UPDATED = 'August 17, 2026';

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stack legal" style={{ maxWidth: 760, margin: '0 auto', gap: 16 }}>
      <div className="page-head">
        <h1>{title}</h1>
        <span className="sub">Last updated {UPDATED}</span>
      </div>
      {children}
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
        <Link to="/home">Guide</Link>
      </p>
    </div>
  );
}

export function TermsScreen() {
  return (
    <LegalPage title="Terms of Service">
      <div className="card">
        <h2>The short version</h2>
        <p>
          Therapistools Scheduler is a planning tool that runs entirely in your browser.
          It helps you find open gaps in student schedules and fit service minutes into
          them. It is a planning aid, not an official record. Use it at your own
          discretion, and keep your district's system as the source of truth.
        </p>
      </div>

      <div className="card">
        <h2>Using the app</h2>
        <ul>
          <li>
            <strong>No account needed.</strong> There is nothing to sign up for, and you
            may stop using the app at any time by closing the page.
          </li>
          <li>
            <strong>Never enter personal information.</strong> Do not type student names,
            real student ID numbers, birthdates, addresses, diagnoses, or any other
            identifying detail into any field, note, or label. Students are represented
            by plain numbers you assign. Keep the list matching those numbers to real
            students somewhere your school already trusts.
          </li>
          <li>
            <strong>You are responsible for what you schedule.</strong> Always check
            proposed schedules against your real obligations before relying on them.
            Imported spreadsheets and generated plans can be wrong, especially when the
            source file is unusual.
          </li>
          <li>
            <strong>Follow your own rules.</strong> You are responsible for using this
            tool in a way that fits your employer's policies and the laws that apply to
            you, including student privacy obligations such as FERPA.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>No warranty</h2>
        <p>
          The app is provided "as is", without warranty of any kind, express or implied,
          including fitness for a particular purpose. It may contain errors, may become
          unavailable, and may change or be discontinued at any time without notice.
        </p>
        <p>
          To the fullest extent allowed by law, the author is not liable for any loss or
          damage arising from your use of the app, including lost schedules, missed
          service minutes, or decisions made from its output.
        </p>
      </div>

      <div className="card">
        <h2>Your data is your responsibility</h2>
        <p>
          Everything you enter is stored in your own browser, not on a server. That means
          nobody else can recover it for you. If browser data is cleared, the device
          fails, or the browser evicts the storage, the schedules are gone. Use{' '}
          <strong>Backup &rarr; Export backup</strong> regularly and keep the file
          somewhere safe.
        </p>
      </div>

      <div className="card">
        <h2>Changes</h2>
        <p>
          These terms may change as the app changes. The date at the top shows the last
          update. Continuing to use the app after a change means you accept the revised
          terms.
        </p>
      </div>
    </LegalPage>
  );
}

/**
 * Privacy now lives on one page for the whole Therapistools site; this route
 * only forwards there, so in-app links to #/privacy keep working.
 */
export function PrivacyScreen() {
  const target = `${PRIVACY_PATH}#scheduler`;
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <LegalPage title="Privacy">
      <p>
        Privacy for every Therapistools tool is on one page. <a href={target}>Open the privacy page</a>.
      </p>
    </LegalPage>
  );
}
