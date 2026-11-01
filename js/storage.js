/**
 * js/storage.js
 * Manages task persistence in LocalStorage.
 * All tasks are stored under the key "smarttodo_tasks".
 */

const STORAGE_KEY = 'smarttodo_tasks';

/**
 * Load all tasks from LocalStorage.
 * @returns {Array<Object>} Array of task objects.
 */
export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist the full tasks array to LocalStorage.
 * @param {Array<Object>} tasks
 */
export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Create a new task object with default values.
 * @param {string} text     Task description.
 * @param {string} category One of "Personal" | "Work" | "Kuliah".
 * @returns {Object} New task object.
 */
export function createTask(text, category = 'Personal') {
  return {
    id:          crypto.randomUUID(),
    text:        text.trim(),
    category,
    completed:   false,
    priority:    null,   // filled by AI: "High" | "Medium" | "Low"
    timeEst:     null,   // filled by AI: number (minutes)
    subtasks:    [],     // [{ id, text, done }]
    createdAt:   Date.now(),
  };
}

/**
 * Find and return a task by ID.
 * @param {Array<Object>} tasks
 * @param {string} id
 */
export function getTaskById(tasks, id) {
  return tasks.find(t => t.id === id) ?? null;
}

/**
 * Update a task in the array. Returns a new array (immutable style).
 * @param {Array<Object>} tasks
 * @param {string} id
 * @param {Object} patch  Partial properties to merge.
 */
export function updateTask(tasks, id, patch) {
  return tasks.map(t => t.id === id ? { ...t, ...patch } : t);
}

/**
 * Remove a task from the array by ID. Returns a new array.
 * @param {Array<Object>} tasks
 * @param {string} id
 */
export function removeTask(tasks, id) {
  return tasks.filter(t => t.id !== id);
}

/**
 * Toggle the completed state of a task. Returns a new array.
 * @param {Array<Object>} tasks
 * @param {string} id
 */
export function toggleTask(tasks, id) {
  return tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
}
