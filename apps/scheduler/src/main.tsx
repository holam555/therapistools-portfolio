import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../../../shared/brand.css';
import '../../../shared/suite-bar.js';
import './styles/app.css';

// Ask the browser to mark this origin's storage as persistent, so schedule
// data can't be silently evicted under disk pressure. Best-effort: browsers
// may deny or decide by site engagement, and it does NOT protect against the
// user (or IT policy) clearing site data - that's what Export backup is for.
if (navigator.storage?.persist) {
  void navigator.storage.persist();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
