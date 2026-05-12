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
    
    // Dynamic empty state
    const todayStr = new Date().toDateString();
    const completedToday = standby.some(t => t.lastCompletedAt && new Date(t.lastCompletedAt).toDateString() === todayStr);
    
    const emptyMsgEl = activeEmpty.querySelector('.tasks-empty-msg');
    if (emptyMsgEl) {
      if (completedToday) {
        emptyMsgEl.textContent = "Hooray! You have completed all your planned tasks 🎉!";
      } else {
        emptyMsgEl.textContent = "Ready for action? 🚀 Pick a task from your standby list or create a new one to kick off your session!";
      }
    }
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
      <button class="action-icon-btn" style="color:${t.color}; cursor: default;" data-action="void" data-task-id="${t.id}">
        ${ICONS.fire}
      </button>
      <span class="task-text" title="${t.text.replace(/"/g, '&quot;')}">${t.text}</span>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="action-icon-btn invisible" data-action="toggle-task-state" data-task-id="${t.id}" title="unplan">
          ${ICONS.arrowRight}
        </button>
        <button class="action-icon-btn invisible destructive" data-action="delete-task" data-task-id="${t.id}" title="Delete">
          ${ICONS.trash}
        </button>
      </div>
      <input type="checkbox" class="deferred-checkbox" data-action="complete-task" data-task-id="${t.id}" title="Complete for today">
      <div class="task-debug-label">id:${t.id} | state:${t.state} | assigned:${t.lastAssignedAt} | completed:${t.lastCompletedAt}</div>
    </div>
  `;
}

function renderStandbyTaskItem(t) {
  const subtitle = t.lastCompletedAt 
    ? `Last worked on: ${timeAgo(t.lastCompletedAt)}` 
    : `Added ${timeAgo(t.createdAt)}`;

  const isCompletedToday = t.lastCompletedAt && new Date(t.lastCompletedAt).toDateString() === new Date().toDateString();
  const leftIcon = isCompletedToday ? ICONS.checkCircle : ICONS.campground;
  const leftIconColor = isCompletedToday ? 'var(--accent-sage)' : t.color;

  return `
    <div class="deferred-item state-standby ${isCompletedToday ? 'checked' : ''}" data-task-id="${t.id}" style="width: 100%;">
      <button class="action-icon-btn" data-action="toggle-task-state" data-task-id="${t.id}" title="Plan for today" style="color:${leftIconColor}; margin-top:2px;">
        ${leftIcon}
      </button>
      <div class="deferred-info" style="flex:1; min-width:0;">
        <span class="deferred-title" title="${t.text.replace(/"/g, '&quot;')}">${t.text}</span>
        <div class="deferred-meta">
          <span>${subtitle}</span>
        </div>
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="action-icon-btn" data-action="toggle-task-state" data-task-id="${t.id}" title="Add to today">
          ${ICONS.plus}
        </button>
        <button class="action-icon-btn destructive" data-action="delete-task" data-task-id="${t.id}" title="Delete">
          ${ICONS.trash}
        </button>
      </div>
      <div class="task-debug-label">id:${t.id} | state:${t.state} | assigned:${t.lastAssignedAt} | completed:${t.lastCompletedAt}</div>
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
          <button class="action-icon-btn invisible undo-btn" data-action="unarchive-task" data-task-id="${t.id}" title="Put back to standby" style="padding:4px;">
            ${ICONS.undo}
          </button>
        </div>
      </div>
      <div class="task-debug-label">id:${t.id} | state:${t.state} | assigned:${t.lastAssignedAt} | completed:${t.lastCompletedAt}</div>
    </div>
  `;
}
