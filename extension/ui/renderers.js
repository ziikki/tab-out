'use strict';

/* ----------------------------------------------------------------
   MAIN DASHBOARD RENDERER
   ---------------------------------------------------------------- */
let domainGroups = [];
let tabViewMode = 'domain'; // 'domain' or 'window'

/**
 * groupTabsByWindow(displayTabs)
 *
 * Groups tabs by their Chrome windowId. Each group is shaped like
 * { domain, label, tabs, windowId } so renderDomainCard() can reuse it.
 * Label uses the first tab's title for identification.
 */
function groupTabsByWindow(displayTabs) {
  const windowMap = {};
  for (const tab of displayTabs) {
    const wId = tab.windowId;
    if (!windowMap[wId]) {
      windowMap[wId] = { domain: `__window-${wId}__`, tabs: [], windowId: wId, isWindowGroup: true };
    }
    windowMap[wId].tabs.push(tab);
  }

  // Detect the current window (the one containing Tab Out's active page)
  const tabOutTab = openTabs.find(t => t.isTabOut && t.active);
  const currentWindowId = tabOutTab ? tabOutTab.windowId : null;

  // Sort windows: current window first, then by tab count descending
  const groups = Object.values(windowMap).sort((a, b) => {
    if (a.windowId === currentWindowId) return -1;
    if (b.windowId === currentWindowId) return 1;
    return b.tabs.length - a.tabs.length;
  });

  for (const g of groups) {
    g.isCurrentWindow = g.windowId === currentWindowId;
    const firstTab = g.tabs[0];
    let firstName = 'New Tab';
    if (firstTab && firstTab.title) {
      firstName = firstTab.title.length > 30
        ? firstTab.title.substring(0, 30) + '…'
        : firstTab.title;
    }
    g.label = `Window (${firstName})`;
  }
  return groups;
}

/**
 * renderStaticDashboard()
 * 
 * The main orchestrator function that triggers all sub-renderers.
 */
async function renderStaticDashboard() {
  // --- Header ---
  const greetingEl = document.getElementById('greeting');
  const dateEl = document.getElementById('dateDisplay');
  if (greetingEl) greetingEl.textContent = getGreeting();
  if (dateEl) dateEl.textContent = getDateDisplay();

  // --- Fetch tabs ---
  await fetchOpenTabs();
  const displayTabs = openTabs.filter(t => !t.isTabOut);

  // --- Group tabs ---
  if (tabViewMode === 'window') {
    domainGroups = groupTabsByWindow(displayTabs);
  } else {
    // --- Group tabs by domain (default) ---
    const groupingMode = await getGroupingMode();

    const LANDING_PAGE_PATTERNS = [
      {
        hostname: 'mail.google.com', test: (p, h) =>
          !h.includes('#inbox/') && !h.includes('#sent/') && !h.includes('#search/')
      },
      { hostname: 'x.com', pathExact: ['/home'] },
      { hostname: 'www.linkedin.com', pathExact: ['/'] },
      { hostname: 'github.com', pathExact: ['/'] },
      { hostname: 'www.youtube.com', pathExact: ['/'] },
      { hostname: 'www.google.com', pathExact: ['/'] },
      ...(typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined' ? LOCAL_LANDING_PAGE_PATTERNS : []),
    ];

    function isLandingPage(url) {
      try {
        const parsed = new URL(url);
        return LANDING_PAGE_PATTERNS.some(p => {
          const hostnameMatch = p.hostname
            ? parsed.hostname === p.hostname
            : p.hostnameEndsWith
              ? parsed.hostname.endsWith(p.hostnameEndsWith)
              : false;
          if (!hostnameMatch) return false;
          if (p.test) return p.test(parsed.pathname, url);
          if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
          if (p.pathExact) return p.pathExact.includes(parsed.pathname);
          return parsed.pathname === '/';
        });
      } catch { return false; }
    }

    const groupMap = {};
    const landingTabs = [];
    const customGroups = typeof LOCAL_CUSTOM_GROUPS !== 'undefined' ? LOCAL_CUSTOM_GROUPS : [];

    function matchCustomGroup(url) {
      try {
        const parsed = new URL(url);
        return customGroups.find(r => {
          const hostMatch = r.hostname
            ? parsed.hostname === r.hostname
            : r.hostnameEndsWith
              ? parsed.hostname.endsWith(r.hostnameEndsWith)
              : false;
          if (!hostMatch) return false;
          if (r.pathPrefix) return parsed.pathname.startsWith(r.pathPrefix);
          return true;
        }) || null;
      } catch { return null; }
    }

    for (const tab of displayTabs) {
      try {
        const url = tab.url || '';
        if (isBrowserInternal(url)) {
          if (!groupMap['__browser-internals__']) {
            groupMap['__browser-internals__'] = { domain: '__browser-internals__', tabs: [] };
          }
          groupMap['__browser-internals__'].tabs.push(tab);
          continue;
        }
        if (isLandingPage(tab.url)) {
          landingTabs.push(tab);
          continue;
        }
        const customRule = matchCustomGroup(tab.url);
        if (customRule) {
          const key = customRule.groupKey;
          if (!groupMap[key]) groupMap[key] = { domain: key, label: customRule.groupLabel, tabs: [] };
          groupMap[key].tabs.push(tab);
          continue;
        }
        let rawHostname = tab.url && tab.url.startsWith('file://') ? 'local-files' : new URL(tab.url).hostname;
        if (!rawHostname) continue;
        
        const groupKey = getGroupingKey(rawHostname, groupingMode);
        if (!groupMap[groupKey]) groupMap[groupKey] = { domain: groupKey, tabs: [] };
        groupMap[groupKey].tabs.push(tab);
      } catch { }
    }

    if (landingTabs.length > 0) {
      groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landingTabs };
    }

    const landingHostnames = new Set(LANDING_PAGE_PATTERNS.map(p => p.hostname).filter(Boolean));
    const landingSuffixes = LANDING_PAGE_PATTERNS.map(p => p.hostnameEndsWith).filter(Boolean);
    function isLandingDomain(domain) {
      if (landingHostnames.has(domain)) return true;
      return landingSuffixes.some(s => domain.endsWith(s));
    }

    domainGroups = Object.values(groupMap).sort((a, b) => {
      const aIsLanding = a.domain === '__landing-pages__';
      const bIsLanding = b.domain === '__landing-pages__';
      if (aIsLanding !== bIsLanding) return aIsLanding ? -1 : 1;
      const aIsPriority = isLandingDomain(a.domain);
      const bIsPriority = isLandingDomain(b.domain);
      if (aIsPriority !== bIsPriority) return aIsPriority ? -1 : 1;
      const aIsInternal = a.domain === '__browser-internals__';
      const bIsInternal = b.domain === '__browser-internals__';
      if (aIsInternal !== bIsInternal) return aIsInternal ? 1 : -1;
      return b.tabs.length - a.tabs.length;
    });
  }

  // --- Render tab cards ---
  const openTabsSection = document.getElementById('openTabsSection');
  const openTabsMissionsEl = document.getElementById('openTabsMissions');
  const openTabsSectionCount = document.getElementById('openTabsSectionCount');
  const openTabsSectionTitle = document.getElementById('openTabsSectionTitle');

  if (domainGroups.length > 0 && openTabsSection) {
    if (openTabsSectionTitle) openTabsSectionTitle.textContent = 'Open tabs';

    // Build the toggle label
    const toggleLabel = tabViewMode === 'domain'
      ? `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''}`
      : `${domainGroups.length} window${domainGroups.length !== 1 ? 's' : ''}`;

    openTabsSectionCount.innerHTML = `<button class="tab-view-toggle" data-action="toggle-tab-view-mode" title="Switch between domain and window grouping">${toggleLabel}</button> &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;">${ICONS.close} Close all ${displayTabs.length} tabs</button> <button class="refresh-tabs-btn" data-action="refresh-tabs" title="Refresh tab list">${ICONS.refresh}</button>`;
    openTabsMissionsEl.innerHTML = domainGroups.map(g => renderDomainCard(g)).join('');
    openTabsSection.style.display = 'block';
  } else if (openTabsSection) {
    openTabsSection.style.display = 'none';
  }

  // --- Footer stats ---
  const statTabs = document.getElementById('statTabs');
  if (statTabs) statTabs.textContent = openTabs.length;

  checkTabOutDupes();
  await renderDeferredColumn();
}
