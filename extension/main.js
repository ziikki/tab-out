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
      ? 'Group by full address (e.g. mail.google.com).'
      : 'Group by base domain (e.g. google.com).';
  }

  const tasksEnabled = await getGoogleTasksEnabled();
  const tasksRadios = document.querySelectorAll('input[name="googleTasksEnabled"]');
  tasksRadios.forEach(r => {
    if ((r.value === 'true') === tasksEnabled) r.checked = true;
  });

  const tasksSection = document.getElementById('googleTasksSection');
  if (tasksSection) {
    tasksSection.style.display = tasksEnabled ? 'block' : 'none';
  }

  const tabGroupsEnabled = await getPrioritizeTabGroups();
  const tabGroupsRadios = document.querySelectorAll('input[name="prioritizeTabGroups"]');
  tabGroupsRadios.forEach(r => {
    if ((r.value === 'true') === tabGroupsEnabled) r.checked = true;
  });
}

// Handle broken favicons without violating CSP (replaces inline onerror)
window.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG' && (e.target.src && (e.target.src.includes('favicons') || e.target.src.includes('gstatic.com/favicon')))) {
    e.target.style.display = 'none';
  }
}, true);

renderDashboard();
