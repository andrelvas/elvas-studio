/* ─────────────────────────────────────────────
   ELVAS*STUDIO — Hub App
   ───────────────────────────────────────────── */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'elvas_studio_v1';

const CLIENT_LABELS = {
  'optimatech': 'OPTIMATECH',
  'xpon':       'XPON',
  'csm':        'CLINICA STA. MARIA',
  'mais-saude': 'MAIS SAUDE'
};

const COL_IDS = ['backlog', 'progresso', 'revisao', 'concluido'];

// ─── Default fallback data ─────────────────────────────────────────────────────

const DEFAULT_CLIENTS = [
  {
    id: 'optimatech',
    name: 'OPTIMATECH',
    status: 'ativo',
    color: '#2563EB',
    hub_url: 'https://andrelvas.github.io/hub-optimatech',
    tags: ['industrial', 'software', 'digital-twin']
  },
  {
    id: 'xpon',
    name: 'XPON',
    status: 'ativo',
    color: '#F97316',
    hub_url: 'https://andrelvas.github.io/hub-xpon',
    tags: ['startup', 'tech', 'growth']
  },
  {
    id: 'csm',
    name: 'CLINICA SANTA MARIA',
    status: 'ativo',
    color: '#8B5CF6',
    hub_url: 'https://andrelvas.github.io/hub-clinica-santa-maria',
    tags: ['saúde', 'clínica', 'branding']
  },
  {
    id: 'mais-saude',
    name: 'MAIS SAUDE',
    status: 'ativo',
    color: '#10B981',
    hub_url: 'https://andrelvas.github.io/hub-mais-saude',
    tags: ['saúde', 'bem-estar', 'digital']
  }
];

const DEFAULT_STATE = {
  columns: {
    backlog:   { tasks: [] },
    progresso: { tasks: [] },
    revisao:   { tasks: [] },
    concluido: { tasks: [] }
  }
};

// ─── App State ────────────────────────────────────────────────────────────────

let clients = [];
let state   = JSON.parse(JSON.stringify(DEFAULT_STATE)); // deep clone
let drake   = null;

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      return true;
    }
  } catch (e) {
    console.warn('Could not read localStorage:', e);
  }
  return false;
}

// ─── Date ─────────────────────────────────────────────────────────────────────

function renderDate() {
  const el = document.getElementById('current-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

function updateKPIs() {
  let total = 0, inProgress = 0, done = 0, review = 0;

  COL_IDS.forEach(id => {
    const count = (state.columns[id]?.tasks || []).length;
    total += count;
    if (id === 'progresso') inProgress = count;
    if (id === 'concluido') done = count;
    if (id === 'revisao')   review = count;
  });

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('kpi-total-tasks', total);
  set('kpi-in-progress', inProgress);
  set('kpi-done', done);
  set('kpi-review', review);
  set('kpi-clients', clients.length || DEFAULT_CLIENTS.length);
}

// ─── Client task count ────────────────────────────────────────────────────────

function countTasksByClient(clientId) {
  return COL_IDS.reduce((acc, id) => {
    return acc + (state.columns[id]?.tasks || []).filter(t => t.client === clientId).length;
  }, 0);
}

// ─── Render Clients ───────────────────────────────────────────────────────────

function renderClients() {
  const grid = document.getElementById('clients-grid');
  if (!grid) return;

  const list = clients.length ? clients : DEFAULT_CLIENTS;

  grid.innerHTML = list.map(c => {
    const tasks = countTasksByClient(c.id);
    return `
<div class="client-card" role="button" tabindex="0"
     onclick="openHub('${c.hub_url}')"
     onkeydown="if(event.key==='Enter') openHub('${c.hub_url}')">
  <div class="client-card__accent-bar" style="background:${c.color}"></div>
  <div class="client-card__body">
    <div class="client-card__top">
      <span class="client-card__name">${c.name}</span>
      <span class="client-status client-status--${c.status}">${c.status}</span>
    </div>
    <div class="client-card__tags">
      ${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}
    </div>
    <div class="client-card__stats">
      <div class="stat-item">
        <span class="stat-value" style="color:${c.color}">${tasks}</span>
        <span class="stat-label">Tarefas</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" style="color:${c.color}">●</span>
        <span class="stat-label">${c.status}</span>
      </div>
    </div>
    <a class="client-card__link" href="${c.hub_url}" target="_blank"
       onclick="event.stopPropagation()" rel="noopener noreferrer">
      Abrir Hub
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </a>
  </div>
</div>`;
  }).join('');
}

function openHub(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── Render Kanban ────────────────────────────────────────────────────────────

function renderKanban() {
  COL_IDS.forEach(colId => {
    const container = document.getElementById(`cards-${colId}`);
    const counter   = document.getElementById(`count-${colId}`);
    if (!container) return;

    const tasks = state.columns[colId]?.tasks || [];
    container.innerHTML = tasks.map(task => renderCard(task)).join('');
    if (counter) counter.textContent = tasks.length;
  });

  initDragula();
  updateKPIs();
  renderClients();
}

function renderCard(task) {
  const label = CLIENT_LABELS[task.client] || task.client?.toUpperCase() || '—';
  return `
<div class="kanban-card kanban-card--${task.client}" data-id="${task.id}" title="${escHtml(task.title)}">
  <div class="kanban-card__title">${escHtml(task.title)}</div>
  <div class="kanban-card__footer">
    <span class="kanban-card__client">${label}</span>
    <span class="priority priority--${task.priority}">${task.priority}</span>
  </div>
</div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Dragula (Drag & Drop) ────────────────────────────────────────────────────

function initDragula() {
  if (drake) { drake.destroy(); drake = null; }

  const containers = COL_IDS
    .map(id => document.getElementById(`cards-${id}`))
    .filter(Boolean);

  drake = dragula(containers, {
    revertOnSpill: true,
    moves: (el) => el.classList.contains('kanban-card')
  });

  drake.on('drop', () => {
    // Rebuild state from current DOM (source of truth after drag)
    const allTasks = {};
    COL_IDS.forEach(id => {
      (state.columns[id]?.tasks || []).forEach(t => { allTasks[t.id] = t; });
    });

    COL_IDS.forEach(colId => {
      const container = document.getElementById(`cards-${colId}`);
      if (!container) return;
      const cards = container.querySelectorAll('.kanban-card');
      state.columns[colId].tasks = Array.from(cards)
        .map(c => allTasks[c.dataset.id])
        .filter(Boolean);
    });

    saveState();
    updateKPIs();
    renderClients();
    updateCounters();
  });
}

function updateCounters() {
  COL_IDS.forEach(colId => {
    const counter = document.getElementById(`count-${colId}`);
    if (counter) counter.textContent = (state.columns[colId]?.tasks || []).length;
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal() {
  const modal = document.getElementById('modal-task');
  if (!modal) return;
  modal.classList.add('is-open');
  setTimeout(() => document.getElementById('task-title')?.focus(), 60);
}

function closeModal() {
  const modal = document.getElementById('modal-task');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.getElementById('form-task')?.reset();
}

function handleAddTask(e) {
  e.preventDefault();

  const title    = document.getElementById('task-title')?.value.trim();
  const client   = document.getElementById('task-client')?.value;
  const priority = document.getElementById('task-priority')?.value;
  const col      = document.getElementById('task-col')?.value;

  if (!title) return;

  const task = {
    id:       `t${Date.now()}`,
    title,
    client,
    priority
  };

  if (!state.columns[col]) state.columns[col] = { tasks: [] };
  state.columns[col].tasks.unshift(task);

  saveState();
  renderKanban();
  closeModal();
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadClients() {
  try {
    const res = await fetch('data/clients.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    clients = data.clients || [];
  } catch {
    clients = DEFAULT_CLIENTS;
  }
  renderClients();
}

async function loadTasksFromJSON() {
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state = data;
  } catch {
    // keep DEFAULT_STATE
  }
  renderKanban();
}

async function initData() {
  await loadClients();
  const hasSaved = loadStateFromStorage();
  if (hasSaved) {
    renderKanban();
  } else {
    await loadTasksFromJSON();
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderDate();
  initData();

  document.getElementById('btn-add-task')
    ?.addEventListener('click', openModal);

  document.getElementById('btn-modal-close')
    ?.addEventListener('click', closeModal);

  document.getElementById('btn-cancel')
    ?.addEventListener('click', closeModal);

  document.getElementById('modal-overlay')
    ?.addEventListener('click', closeModal);

  document.getElementById('form-task')
    ?.addEventListener('submit', handleAddTask);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
