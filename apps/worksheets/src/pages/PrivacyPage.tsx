import { useEffect } from 'react';
import { PRIVACY_PATH } from '../../../../shared/brand.js';

/**
 * Privacy now lives on one page for the whole Therapistools site. This route
 * only forwards there (the server also redirects /worksheets/privacy).
 */
const TARGET = `${PRIVACY_PATH}#worksheets`;

export default function PrivacyPage() {
  useEffect(() => {
    window.location.replace(TARGET);
  }, []);
  return (
    <main className="max-w-xl mx-auto px-6 py-16 text-center">
      <p className="text-muted-foreground">
        Privacy for every Therapistools tool is on one page. <a className="text-primary underline" href={TARGET}>Open the privacy page</a>.
      </p>
    </main>
  );
}
