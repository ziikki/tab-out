'use strict';

/* ----------------------------------------------------------------
   ACTIVE TASKS — chrome.storage.local
   ---------------------------------------------------------------- */

const TASKS_STORAGE_KEY = 'activeTasks';

// Colors for the tasks based on creation order to make them distinct
const TASK_COLORS = [
  '#c8713a', // amber
  '#5a7a62', // sage
  '#5a6b7a', // slate
  '#d4b896', // warm paper
  '#b35a5a', // rose
  '#6b8aab', // blue-grey
];

/**
 * Helper to check if an ISO date string is today (local time).
 */
function isToday(dateString) {
  if (!dateString) return false;
  return new Date(dateString).toDateString() === new Date().toDateString();
}

/**
 * getTasks()
 * Returns tasks separated by computed state: active (planned today), standby, inactive (archived)
 */
async function getTasks() {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  const active = [];
  const standby = [];
  const inactive = [];

  for (const t of tasks) {
    if (t.state === 'inactive') {
      inactive.push(t);
    } else {
      const assignedToday = isToday(t.lastAssignedAt);
      const completedToday = isToday(t.lastCompletedAt);

      if (assignedToday && !completedToday) {
        active.push(t);
      } else {
        standby.push(t);
      }
    }
  }

  // Sort Active (Planned Today) by lastAssignedAt descending
  active.sort((a, b) => new Date(b.lastAssignedAt || 0).getTime() - new Date(a.lastAssignedAt || 0).getTime());

  // Sort Standby by lastCompletedAt descending (most recently worked on first), then by createdAt
  standby.sort((a, b) => {
    const dateA = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
    const dateB = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Sort Inactive by createdAt descending
  inactive.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { active, standby, inactive };
}

/**
 * addTask(text)
 * Adds a new task or brings an existing duplicate to "Planned Today".
 */
async function addTask(text) {
  if (!text || !text.trim()) return;
  const cleanText = text.trim();

  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  // Pick a color based on the number of non-inactive tasks
  const activeCount = tasks.filter(t => t.state !== 'inactive').length;
  const color = TASK_COLORS[activeCount % TASK_COLORS.length];

  tasks.push({
    id: Date.now().toString(),
    text: cleanText,
    state: 'active', // active in storage means not archived
    color: color,
    createdAt: new Date().toISOString(),
    lastAssignedAt: new Date().toISOString()
  });

  await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
}

/**
 * setTaskState(id, newState)
 * For explicit archiving. newState should be 'inactive'.
 */
async function setTaskState(id, newState) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.state = newState;
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
  }
}

/**
 * unarchiveTask(id)
 * Brings a task back from archive to standby.
 */
async function unarchiveTask(id) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.state = 'active'; // becomes standby since lastAssignedAt isn't updated
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
  }
}

/**
 * removeTaskFromToday(id)
 * Moves a planned task back to standby without completing it.
 */
async function removeTaskFromToday(id) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  const task = tasks.find(t => t.id === id);
  if (task) {
    // Move lastAssignedAt to yesterday so it falls into standby
    task.lastAssignedAt = new Date(Date.now() - 86400000).toISOString();
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
  }
}

/**
 * planTaskForToday(id)
 * Brings a task from standby to "Planned Today".
 */
async function planTaskForToday(id) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.state = 'active'; // ensure it's not archived
    task.lastAssignedAt = new Date().toISOString();
    task.lastCompletedAt = null; // Clear completed status so it moves to active
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
  }
}

/**
 * completeTaskForToday(id)
 * Checks off a task for the day, moving it to standby.
 */
async function completeTaskForToday(id) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.lastCompletedAt = new Date().toISOString();
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
  }
}

/**
 * deleteTask(id)
 * Completely removes a task from storage.
 */
async function deleteTask(id) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  let tasks = data[TASKS_STORAGE_KEY] || [];

  tasks = tasks.filter(t => t.id !== id);
  await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
}
