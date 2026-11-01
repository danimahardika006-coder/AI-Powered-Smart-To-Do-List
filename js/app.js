/**
 * js/app.js  (ES6 Module — entry point)
 * ─────────────────────────────────────────────────────────────
 * Coordinates:
 *   • DOM event listeners (form, filters, task actions, modals)
 *   • CRUD via storage.js
 *   • AI features via ai-agent.js
 *   • UI rendering & state updates
 * ─────────────────────────────────────────────────────────────
 */

import {
  loadTasks, saveTasks, createTask,
  updateTask, removeTask, toggleTask,
} from './storage.js';

import {
  estimatePriorityAndTime,
  breakDownTask,
  generateDraft,
  getDailyCoachReport,
  ACTIVE_PROVIDER,
} from './ai-agent.js';

/* ═══════════════════════════════════════════
   State
═══════════════════════════════════════════ */
let tasks       = loadTasks();
let filterStatus = 'all';   // 'all' | 'active' | 'completed'
let filterCat    = 'all';   // 'all' | 'Work' | 'Kuliah' | 'Personal'

/* ═══════════════════════════════════════════
   DOM references
═══════════════════════════════════════════ */
const taskList      = document.getElementById('task-list');
const emptyState    = document.getElementById('empty-state');
const formAddTask   = document.getElementById('form-add-task');
const inputTask     = document.getElementById('input-task');
const selectCat     = document.getElementById('select-category');
const aiHint        = document.getElementById('ai-priority-hint');
const btnReview     = document.getElementById('btn-review');
const btnTheme      = document.getElementById('btn-theme');
const statTotal     = document.getElementById('stat-total');
const statActive    = document.getElementById('stat-active');
const statDone      = document.getElementById('stat-done');
const statScore     = document.getElementById('stat-score');

/* ═══════════════════════════════════════════
   Theme
═══════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem('smarttodo_theme') ?? 'light';
  document.documentElement.setAttribute('data-theme', saved);
  btnTheme.textContent = saved === 'dark' ? '☀️' : '🌙';
})();

btnTheme.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('smarttodo_theme', next);
  btnTheme.textContent = next === 'dark' ? '☀️' : '🌙';
});

/* ═══════════════════════════════════════════
   Toast helper
═══════════════════════════════════════════ */
let _toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent   = msg;
  toast.className     = `toast ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toast.className = 'toast hidden'; }, 3200);
}

/* ═══════════════════════════════════════════
   Modal helpers
═══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close buttons (all elements with .modal-close carry data-modal="<id>")
document.addEventListener('click', e => {
  const closer = e.target.closest('.modal-close');
  if (closer) closeModal(closer.dataset.modal);
  // Click backdrop to close
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

/* ═══════════════════════════════════════════
   Render helpers
═══════════════════════════════════════════ */
function getFilteredTasks() {
  return tasks.filter(t => {
    const statusOk = filterStatus === 'all'
      || (filterStatus === 'active'    && !t.completed)
      || (filterStatus === 'completed' &&  t.completed);
    const catOk = filterCat === 'all' || t.category === filterCat;
    return statusOk && catOk;
  });
}

function priorityBadge(p) {
  if (!p) return '';
  return `<span class="badge badge-priority-${p}">${p}</span>`;
}

function timeBadge(m) {
  if (!m) return '';
  return `<span class="badge badge-time">⏱ ${m} mnt</span>`;
}

function catBadge(c) {
  return `<span class="badge badge-cat-${c}">${c}</span>`;
}

function renderSubtasks(subtasks, taskId) {
  if (!subtasks?.length) return '';
  const items = subtasks.map(s => `
    <li class="subtask-item ${s.done ? 'done' : ''}" data-subtask-id="${s.id}" data-task-id="${taskId}">
      <input type="checkbox" ${s.done ? 'checked' : ''} class="subtask-check" aria-label="${s.text}" />
      <span>${escapeHtml(s.text)}</span>
    </li>
  `).join('');
  return `<ul class="subtask-list" role="list">${items}</ul>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTask(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'completed' : ''}`;
  li.dataset.id = task.id;

  li.innerHTML = `
    <div class="task-top">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Tandai selesai" />
      <div class="task-body">
        <p class="task-text">${escapeHtml(task.text)}</p>
        <div class="task-meta">
          ${catBadge(task.category)}
          ${priorityBadge(task.priority)}
          ${timeBadge(task.timeEst)}
        </div>
      </div>
    </div>
    ${renderSubtasks(task.subtasks, task.id)}
    <div class="task-actions">
      <button class="btn btn-ai btn-assist"     data-id="${task.id}">💡 AI Assist</button>
      <button class="btn btn-breakdown btn-bd"  data-id="${task.id}">✨ Break Down</button>
      <button class="btn btn-ghost btn-edit"    data-id="${task.id}" style="font-size:.78rem;padding:.3rem .7rem;">✏️ Edit</button>
      <button class="btn btn-danger btn-delete" data-id="${task.id}">🗑 Hapus</button>
    </div>
  `;
  return li;
}

function renderAll() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';
  filtered.forEach(t => taskList.appendChild(renderTask(t)));

  // Empty state
  emptyState.classList.toggle('hidden', filtered.length > 0);

  // Stats
  const done   = tasks.filter(t => t.completed).length;
  const active = tasks.length - done;
  statTotal.textContent = tasks.length;
  statActive.textContent = active;
  statDone.textContent   = done;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : '—';
  statScore.textContent = tasks.length ? `${pct}%` : '—';
}

/* ═══════════════════════════════════════════
   Form — Add Task
═══════════════════════════════════════════ */
formAddTask.addEventListener('submit', async e => {
  e.preventDefault();
  const text = inputTask.value.trim();
  if (!text) return;

  const task = createTask(text, selectCat.value);
  tasks = [task, ...tasks];
  saveTasks(tasks);
  renderAll();

  inputTask.value = '';
  aiHint.classList.remove('hidden');
  aiHint.textContent = '🤖 AI sedang menganalisis prioritas…';

  // Non-blocking AI priority estimation
  try {
    const result = await estimatePriorityAndTime(text);
    tasks = updateTask(tasks, task.id, { priority: result.priority, timeEst: result.timeEst });
    saveTasks(tasks);
    renderAll();
    aiHint.textContent = `✅ AI: Prioritas ${result.priority} · ${result.timeEst} mnt — ${result.reason}`;
    setTimeout(() => aiHint.classList.add('hidden'), 5000);
  } catch {
    aiHint.classList.add('hidden');
  }
});

/* ═══════════════════════════════════════════
   Task List — Event Delegation
═══════════════════════════════════════════ */
taskList.addEventListener('change', e => {
  // Toggle task complete
  if (e.target.classList.contains('task-checkbox')) {
    const id = e.target.closest('.task-item').dataset.id;
    tasks = toggleTask(tasks, id);
    saveTasks(tasks);
    renderAll();
    return;
  }
  // Toggle subtask
  if (e.target.classList.contains('subtask-check')) {
    const { subtaskId, taskId } = e.target.closest('.subtask-item').dataset;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = task.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    tasks = updateTask(tasks, taskId, { subtasks: newSubs });
    saveTasks(tasks);
    renderAll();
  }
});

taskList.addEventListener('click', async e => {
  // ── Delete ──────────────────────────────
  if (e.target.closest('.btn-delete')) {
    const id = e.target.closest('.btn-delete').dataset.id;
    tasks = removeTask(tasks, id);
    saveTasks(tasks);
    renderAll();
    showToast('Tugas dihapus.', 'error');
    return;
  }

  // ── Edit (open modal) ────────────────────
  if (e.target.closest('.btn-edit')) {
    const id   = e.target.closest('.btn-edit').dataset.id;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('edit-task-id').value       = task.id;
    document.getElementById('edit-task-text').value     = task.text;
    document.getElementById('edit-task-category').value = task.category;
    openModal('modal-edit');
    return;
  }

  // ── AI Assist (Draft) ─────────────────────
  if (e.target.closest('.btn-assist')) {
    const id   = e.target.closest('.btn-assist').dataset.id;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('draft-task-name').textContent = `📌 ${task.text}`;
    const draftContent = document.getElementById('draft-content');
    draftContent.innerHTML = `
      <div class="skeleton-block"></div>
      <div class="skeleton-block" style="width:85%"></div>
      <div class="skeleton-block" style="width:65%"></div>
    `;
    openModal('modal-draft');

    const draft = await generateDraft(task.text, task.category);
    draftContent.innerHTML = `
      <h3>${escapeHtml(draft.title)}</h3>
      <ul>${draft.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
      <p style="margin-top:.75rem"><strong>💡 Tips:</strong> ${escapeHtml(draft.tips)}</p>
    `;
    return;
  }

  // ── Break Down ────────────────────────────
  if (e.target.closest('.btn-bd')) {
    const btn  = e.target.closest('.btn-bd');
    const id   = btn.dataset.id;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    btn.disabled    = true;
    btn.textContent = '⏳ Memproses…';

    const subtasks = await breakDownTask(task.text);
    tasks = updateTask(tasks, id, { subtasks });
    saveTasks(tasks);
    renderAll();
    showToast('Sub-tugas berhasil dibuat!', 'success');
  }
});

/* ═══════════════════════════════════════════
   Edit Modal — Save
═══════════════════════════════════════════ */
document.getElementById('btn-save-edit').addEventListener('click', () => {
  const id       = document.getElementById('edit-task-id').value;
  const newText  = document.getElementById('edit-task-text').value.trim();
  const newCat   = document.getElementById('edit-task-category').value;
  if (!newText) return;

  tasks = updateTask(tasks, id, { text: newText, category: newCat });
  saveTasks(tasks);
  renderAll();
  closeModal('modal-edit');
  showToast('Tugas diperbarui.', 'success');
});

/* ═══════════════════════════════════════════
   Filters
═══════════════════════════════════════════ */
document.querySelectorAll('.filter-btn:not(.cat-btn)').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn:not(.cat-btn)').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterStatus = btn.dataset.filter;
    renderAll();
  });
});

document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterCat = btn.dataset.cat;
    renderAll();
  });
});

/* ═══════════════════════════════════════════
   Review Harian (Productivity Coach)
═══════════════════════════════════════════ */
btnReview.addEventListener('click', async () => {
  const coachContent = document.getElementById('coach-content');
  coachContent.innerHTML = `
    <div class="skeleton-block"></div>
    <div class="skeleton-block" style="width:80%"></div>
    <div class="skeleton-block" style="width:60%"></div>
    <div class="skeleton-block" style="width:75%"></div>
  `;
  openModal('modal-coach');

  const report = await getDailyCoachReport(tasks);
  statScore.textContent = `${report.score}%`;

  coachContent.innerHTML = `
    <div class="coach-score">${report.score}<small style="font-size:1.2rem">%</small></div>
    <p class="coach-score-label">Skor Produktivitas Hari Ini</p>
    <p>${escapeHtml(report.summary)}</p>

    <div class="coach-section">
      <h3>💪 Hal Positif</h3>
      <ul>${report.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>

    <div class="coach-section">
      <h3>🔧 Saran Perbaikan</h3>
      <ul>${report.improvements.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>

    <div class="coach-section" style="margin-top:1rem;padding:.8rem;background:var(--accent-light);border-radius:var(--radius-sm);border:1px solid var(--border);">
      <strong>✨ Motivasi:</strong> ${escapeHtml(report.motivation)}
    </div>

    ${ACTIVE_PROVIDER && tasks.length === 0
      ? '<p style="margin-top:.75rem;color:var(--text-muted);font-size:.8rem;">Tambahkan beberapa tugas untuk laporan yang lebih akurat.</p>'
      : ''}
  `;
});

/* ═══════════════════════════════════════════
   Initial render
═══════════════════════════════════════════ */
renderAll();
