'use strict';

/* ----------------------------------------------------------------
   INITIALIZE — Entry point
   ---------------------------------------------------------------- */

async function renderDashboard() {
  await initSettings();
  await renderStaticDashboard();
}

async function initSettings() {
  const mode = await getGroupingMode();
  const radios = document.querySelectorAll('input[name="groupingMode"]');
  radios.forEach(r => {
    if (r.value === mode) r.checked = true;
  });

  const hint = document.getElementById('groupingModeHint');
  if (hint) {
    hint.textContent = mode === 'hostname'
      ? 'Tabs are grouped by their specific address (e.g., play.google.com).'
      : 'Subdomains are merged into their base domain (e.g., all google.com tabs).';
  }
}

// Handle broken favicons without violating CSP (replaces inline onerror)
window.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG' && (e.target.src && (e.target.src.includes('favicons') || e.target.src.includes('gstatic.com/favicon')))) {
    e.target.style.display = 'none';
  }
}, true);

renderDashboard();
