'use strict';

/* ----------------------------------------------------------------
   EVENT HANDLERS — using event delegation

   One listener on document handles ALL button clicks.
   Think of it as one security guard watching the whole building
   instead of one per door.
   ---------------------------------------------------------------- */

document.addEventListener('click', async (e) => {
  // Walk up the DOM to find the nearest element with data-action
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  // ---- Close duplicate Tab Out tabs ----
  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) {
      banner.style.transition = 'opacity 0.4s';
      banner.style.opacity = '0';
      setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400);
    }
    showToast('Closed extra Tab Out tabs');
    return;
  }

  const card = actionEl.closest('.mission-card');

  // ---- Expand overflow chips ("+N more") ----
  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement.querySelector('.page-chips-overflow');
    if (overflowContainer) {
      overflowContainer.style.display = 'contents';
      actionEl.remove();
    }
    return;
  }

  // ---- Focus a specific tab ----
  if (action === 'focus-tab') {
    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // ---- Close a single tab ----
  if (action === 'close-single-tab') {
    e.stopPropagation(); // don't trigger parent chip's focus-tab
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;

    // Close the tab in Chrome directly
    const allTabs = await chrome.tabs.query({});
    const match = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    playCloseSound();

    // Animate the chip row out
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      const rect = chip.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        // If the card now has no tabs, remove it too
        const parentCard = document.querySelector('.mission-card:has(.mission-pages:empty)');
        if (parentCard) animateCardOut(parentCard);
        document.querySelectorAll('.mission-card').forEach(c => {
          if (c.querySelectorAll('.page-chip[data-action="focus-tab"]').length === 0) {
            animateCardOut(c);
          }
        });
      }, 200);
    }

    // Update footer
    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    showToast('Tab closed');
    return;
  }

  // ---- Save a single tab for later (then close it) ----
  if (action === 'defer-single-tab') {
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    const tabTitle = actionEl.dataset.tabTitle || tabUrl;
    if (!tabUrl) return;

    // Save to chrome.storage.local
    try {
      await saveTabForLater({ url: tabUrl, title: tabTitle });
    } catch (err) {
      console.error('[tab-out] Failed to save tab:', err);
      showToast('Failed to save tab');
      return;
    }

    // Close the tab in Chrome
    const allTabs = await chrome.tabs.query({});
    const match = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    // Animate chip out
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.8)';
      setTimeout(() => chip.remove(), 200);
    }

    showToast('Saved for later');
    await renderDeferredColumn();
    return;
  }

  // ---- Check off a saved tab (moves it to archive) ----
  if (action === 'check-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await checkOffSavedTab(id);

    // Animate: strikethrough first, then slide out
    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('checked');
      setTimeout(() => {
        item.classList.add('removing');
        setTimeout(() => {
          item.remove();
          renderDeferredColumn(); // refresh counts and archive
        }, 300);
      }, 800);
    }
    return;
  }

  // ---- Uncheck a saved tab (moves it back from archive to active) ----
  if (action === 'uncheck-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await uncheckSavedTab(id);

    // Animate item out of archive
    const item = actionEl.closest('.archive-item');
    if (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-10px)';
      item.style.transition = 'all 0.2s';
      setTimeout(() => {
        item.remove();
        renderDeferredColumn();
      }, 200);
    }
    showToast('Moved back to saved list');
    return;
  }

  // ---- Dismiss a saved tab (removes it entirely) ----
  if (action === 'dismiss-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await dismissSavedTab(id);

    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('removing');
      setTimeout(() => {
        item.remove();
        renderDeferredColumn();
      }, 300);
    }
    return;
  }

  // ---- Close all tabs in a domain/window group ----
  if (action === 'close-domain-tabs') {
    const domainId = actionEl.dataset.domainId;
    const group = domainGroups.find(g => {
      return 'domain-' + g.domain.replace(/[^a-z0-9]/g, '-') === domainId;
    });
    if (!group) return;

    // In window mode, close the entire Chrome window
    if (tabViewMode === 'window' && group.windowId) {
      await chrome.windows.remove(group.windowId);
      await fetchOpenTabs();
    } else {
      const tabIds = group.tabs.map(t => t.id).filter(id => id !== undefined);
      if (tabIds.length > 0) {
        await chrome.tabs.remove(tabIds);
        await fetchOpenTabs();
      }
    }

    if (card) {
      playCloseSound();
      animateCardOut(card);
    }

    // Remove from in-memory groups
    const idx = domainGroups.indexOf(group);
    if (idx !== -1) domainGroups.splice(idx, 1);

    const groupLabel = group.domain === '__landing-pages__' ? 'Homepages' : group.domain === '__browser-internals__' ? 'Browser' : (group.label || friendlyDomain(group.domain));
    showToast(`Closed ${group.tabs.length} tab${group.tabs.length !== 1 ? 's' : ''} from ${groupLabel}`);

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;
    return;
  }

  // ---- Close duplicates, keep one copy ----
  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;

    await closeDuplicateTabs(urls, true);
    playCloseSound();

    // Hide the dedup button
    actionEl.style.transition = 'opacity 0.2s';
    actionEl.style.opacity = '0';
    setTimeout(() => actionEl.remove(), 200);

    // Remove dupe badges from the card
    if (card) {
      card.querySelectorAll('.chip-dupe-badge').forEach(b => {
        b.style.transition = 'opacity 0.2s';
        b.style.opacity = '0';
        setTimeout(() => b.remove(), 200);
      });
      card.querySelectorAll('.open-tabs-badge').forEach(badge => {
        if (badge.textContent.includes('duplicate')) {
          badge.style.transition = 'opacity 0.2s';
          badge.style.opacity = '0';
          setTimeout(() => badge.remove(), 200);
        }
      });
      card.classList.remove('has-amber-bar');
      card.classList.add('has-neutral-bar');
    }

    showToast('Closed duplicates, kept one copy each');
    return;
  }

  // ---- Toggle tab view mode (domain ↔ window) ----
  if (action === 'toggle-tab-view-mode') {
    tabViewMode = tabViewMode === 'domain' ? 'window' : 'domain';
    await renderStaticDashboard();
    return;
  }

  // ---- Refresh tabs ----
  if (action === 'refresh-tabs') {
    const btn = actionEl;
    btn.classList.add('spinning');
    await renderDashboard();
    setTimeout(() => btn.classList.remove('spinning'), 400);
    showToast('Tabs refreshed');
    return;
  }

  // ---- Close ALL open tabs ----
  if (action === 'close-all-open-tabs') {
    const allTabs = await chrome.tabs.query({});
    const extensionId = chrome.runtime.id;
    const newtabUrl = `chrome-extension://${extensionId}/index.html`;

    const toClose = allTabs
      .filter(t => {
        const url = t.url || '';
        // Don't close Tab Out itself
        if (url === newtabUrl || url === 'chrome://newtab/') return false;
        return true;
      })
      .map(t => t.id);

    if (toClose.length > 0) {
      await chrome.tabs.remove(toClose);
      playCloseSound();

      document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
        shootConfetti(
          c.getBoundingClientRect().left + c.offsetWidth / 2,
          c.getBoundingClientRect().top + c.offsetHeight / 2
        );
        animateCardOut(c);
      });

      showToast('All tabs closed. Fresh start.');
      // Refresh list
      await fetchOpenTabs();
      if (typeof renderDashboard === 'function') renderDashboard();
    }
    return;
  }
});


// ---- Archive toggle — expand/collapse the archive section ----
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#archiveToggle');
  if (!toggle) return;

  toggle.classList.toggle('open');
  const body = document.getElementById('archiveBody');
  if (body) {
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  }
});

// ---- Archive search — filter archived items as user types ----
document.addEventListener('input', async (e) => {
  if (e.target.id !== 'archiveSearch') return;

  const q = e.target.value.trim().toLowerCase();
  const archiveList = document.getElementById('archiveList');
  if (!archiveList) return;

  try {
    const { archived } = await getSavedTabs();

    if (q.length < 2) {
      // Show all archived items
      archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
      return;
    }

    // Filter by title or URL containing the query string
    const results = archived.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.url || '').toLowerCase().includes(q)
    );

    archiveList.innerHTML = results.map(item => renderArchiveItem(item)).join('')
      || '<div style="font-size:12px;color:var(--muted);padding:8px 0">No results</div>';
  } catch (err) {
    console.warn('[tab-out] Archive search failed:', err);
  }
});


// ---- Debug mode toggle ----
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#debugToggle');
  if (!toggle) return;
  document.body.classList.toggle('debug-mode');
  toggle.classList.toggle('active');
});
// ---- Settings toggle ----
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#settingsToggle');
  const panel = document.getElementById('settingsPanel');
  if (toggle) {
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    toggle.classList.toggle('active', isHidden);
    return;
  }

  // Close panel when clicking outside
  if (panel && panel.style.display !== 'none' && !panel.contains(e.target)) {
    panel.style.display = 'none';
    document.getElementById('settingsToggle').classList.remove('active');
  }
});

// ---- Settings: Grouping Mode Change ----
document.addEventListener('change', async (e) => {
  if (e.target.name === 'groupingMode') {
    const mode = e.target.value;
    await setGroupingMode(mode);
    await renderStaticDashboard();

    const hint = document.getElementById('groupingModeHint');
    if (hint) {
      hint.textContent = mode === 'hostname'
        ? 'Tabs are grouped by their specific address (e.g., play.google.com).'
        : 'Subdomains are merged into their base domain (e.g., all google.com tabs).';
    }

    showToast(`Grouping mode: ${mode === 'hostname' ? 'Full Hostname' : 'Base Domain'}`);
  } else if (e.target.name === 'googleTasksEnabled') {
    const enabled = e.target.value === 'true';
    await setGoogleTasksEnabled(enabled);
    const tasksSection = document.getElementById('googleTasksSection');
    if (tasksSection) {
      tasksSection.style.display = enabled ? 'block' : 'none';
    }
    showToast(`Google Tasks: ${enabled ? 'Enabled' : 'Hidden'}`);
  }
});
