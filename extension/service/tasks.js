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
 * getTasks()
 * Returns tasks separated by state: active, standby, inactive
 */
async function getTasks() {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];
  
  return {
    active: tasks.filter(t => t.state === 'active'),
    standby: tasks.filter(t => t.state === 'standby'),
    inactive: tasks.filter(t => t.state === 'inactive')
  };
}

/**
 * addTask(text)
 * Adds a new task to the active list.
 */
async function addTask(text) {
  if (!text || !text.trim()) return;
  
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY] || [];
  
  // Pick a color based on the number of non-inactive tasks
  const activeCount = tasks.filter(t => t.state !== 'inactive').length;
  const color = TASK_COLORS[activeCount % TASK_COLORS.length];
  
  tasks.push({
    id: Date.now().toString(),
    text: text.trim(),
    state: 'active',
    color: color,
    createdAt: new Date().toISOString()
  });
  
  await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
}

/**
 * setTaskState(id, newState)
 * Updates a task's state ('active', 'standby', 'inactive')
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
 * deleteTask(id)
 * Completely removes a task from storage (e.g. from the archive)
 */
async function deleteTask(id) {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  let tasks = data[TASKS_STORAGE_KEY] || [];
  
  tasks = tasks.filter(t => t.id !== id);
  await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
}
