'use strict';

/* ----------------------------------------------------------------
   TASK RENDERERS
   ---------------------------------------------------------------- */

async function renderTasksWidget() {
  const activeList = document.getElementById('activeTasksList');
  const activeEmpty = document.getElementById('activeTasksEmpty');

  const standbyList = document.getElementById('standbyTasksList');
  const standbyEmpty = document.getElementById('standbyTasksEmpty');
  const standbyCount = document.getElementById('standbyTasksCount');

  const archiveEl = document.getElementById('inactiveTasksArchive');
  const archiveList = document.getElementById('inactiveTasksList');
  const archiveCount = document.getElementById('inactiveTasksCount');

  if (!activeList || !standbyList) return;

  const { active, standby, inactive } = await getTasks();

  // Active Tasks
  if (active.length > 0) {
    activeList.innerHTML = active.map(renderActiveTaskItem).join('');
    activeList.style.display = 'flex';
    activeEmpty.style.display = 'none';
  } else {
    activeList.style.display = 'none';
    activeEmpty.style.display = 'block';
  }

  // Standby Tasks
  if (standby.length > 0) {
    standbyCount.textContent = standby.length;
    standbyList.innerHTML = standby.map(renderStandbyTaskItem).join('');
    standbyList.style.display = 'block';
    standbyEmpty.style.display = 'none';
  } else {
    standbyCount.textContent = '';
    standbyList.style.display = 'none';
    standbyEmpty.style.display = 'block';
  }

  // Inactive Tasks
  if (inactive.length > 0) {
    archiveCount.textContent = inactive.length;
    archiveList.innerHTML = inactive.map(renderInactiveTaskItem).join('');
    archiveEl.style.display = 'block';
  } else {
    archiveEl.style.display = 'none';
  }

  // Re-focus input if it was focused before re-render
  const input = document.getElementById('newTaskInput');
  if (input && window._tasksInputFocused) {
    input.focus();
  }
}

function renderActiveTaskItem(t) {
  return `
    <div class="task-item state-active" data-task-id="${t.id}" style="border-left-color: ${t.color}; width: 100%;">
      <button class="action-icon-btn" style="color:${t.color}" data-action="toggle-task-state" data-task-id="${t.id}" title="Move to standby">
        ${ICONS.fire}
      </button>
      <span class="task-text" title="${t.text.replace(/"/g, '&quot;')}">${t.text}</span>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="action-icon-btn invisible" data-action="toggle-task-state" data-task-id="${t.id}" title="Move to standby">
          ${ICONS.arrowRight}
        </button>
        <button class="action-icon-btn invisible destructive" data-action="delete-task" data-task-id="${t.id}" title="Delete">
          ${ICONS.trash}
        </button>
      </div>
      <input type="checkbox" class="deferred-checkbox" data-action="archive-task" data-task-id="${t.id}">
    </div>
  `;
}

function renderStandbyTaskItem(t) {
  return `
    <div class="deferred-item state-standby" data-task-id="${t.id}" style="width: 100%;">
      <button class="action-icon-btn" data-action="toggle-task-state" data-task-id="${t.id}" title="Make active" style="color:${t.color}; margin-top:2px;">
        ${ICONS.campground}
      </button>
      <div class="deferred-info" style="flex:1; min-width:0;">
        <span class="deferred-title" title="${t.text.replace(/"/g, '&quot;')}">${t.text}</span>
        <div class="deferred-meta">
          <span>${timeAgo(t.createdAt)}</span>
        </div>
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="action-icon-btn" data-action="toggle-task-state" data-task-id="${t.id}" title="Make active">
          ${ICONS.arrowLeft}
        </button>
        <button class="action-icon-btn destructive" data-action="delete-task" data-task-id="${t.id}" title="Delete">
          ${ICONS.trash}
        </button>
      </div>
    </div>
  `;
}

function renderInactiveTaskItem(t) {
  return `
    <div class="archive-item state-inactive" data-task-id="${t.id}">
      <span class="archive-item-title" style="display:block;" title="${t.text.replace(/"/g, '&quot;')}">${t.text}</span>
      <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        <span class="archive-item-date">${timeAgo(t.createdAt)}</span>
        <div style="display:flex; gap:4px; flex-shrink:0;">
          <button class="action-icon-btn invisible undo-btn" data-action="toggle-task-state" data-task-id="${t.id}" title="Put back to standby" style="padding:4px;">
            ${ICONS.undo}
          </button>
        </div>
      </div>
    </div>
  `;
}
