'use strict';

/* ----------------------------------------------------------------
   INITIALIZE — Entry point
   ---------------------------------------------------------------- */

async function renderDashboard() {
  await renderStaticDashboard();
}

// Handle broken favicons without violating CSP (replaces inline onerror)
window.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG' && (e.target.src && (e.target.src.includes('favicons') || e.target.src.includes('gstatic.com/favicon')))) {
    e.target.style.display = 'none';
  }
}, true);

renderDashboard();
