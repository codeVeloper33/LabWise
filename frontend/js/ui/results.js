/* ============================================================
   LabWise — results.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  if (!Storage.requireAuth()) return;

  const res = await ExperimentApi.listSessions();
  if (!res.ok) return;

  let sessions = res.data.data.sessions || [];

  /* ── Filter chips ── */
  let activeFilter = 'all';
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderTable(sessions, activeFilter);
    });
  });

  renderTable(sessions, activeFilter);
});

function renderTable(sessions, filter) {
  const tbody   = document.getElementById('results-tbody');
  const emptyEl = document.getElementById('results-empty');
  if (!tbody) return;

  /* Apply filter */
  const filtered = sessions.filter(s => {
    if (filter === 'all')         return true;
    if (filter === 'completed')   return s.status === 'completed';
    if (filter === 'in_progress') return s.status === 'in_progress';
    return s.experiment_name === filter;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';

    const result = s.final_result
      ? `${s.final_result.result_value} ${s.final_result.unit}`
      : '—';

    const trials = s.readings?.length ?? 0;

    tr.innerHTML = `
      <td>
        <div class="results-exp-cell">
          <div class="results-icon ${s.experiment_name}">
            ${expIcon(s.experiment_name)}
          </div>
          <span class="results-exp-name">
            ${s.experiment_title || s.experiment_name}
          </span>
        </div>
      </td>
      <td>${formatDate(s.created_at)}</td>
      <td style="font-family:var(--font-mono);text-align:center;">${trials}</td>
      <td><span class="status-pill ${s.status}">
        ${s.status === 'completed' ? '✅ Completed' : '🔄 In Progress'}
      </span></td>
      <td style="font-family:var(--font-mono);color:var(--cyan);">${result}</td>
      <td>
        ${s.status === 'completed'
          ? `<button class="btn-secondary"
                style="padding:5px 12px;font-size:12px;"
                data-id="${s.id}" data-exp="${s.experiment_name}"
                onclick="openSession(this)">
               View →
             </button>`
          : `<button class="btn-secondary"
                style="padding:5px 12px;font-size:12px;"
                data-id="${s.id}" data-exp="${s.experiment_name}"
                onclick="resumeSession(this)">
               Resume →
             </button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openSession(btn) {
  const id  = btn.dataset.id;
  const exp = btn.dataset.exp;
  /* Load full session then go to graph */
  ExperimentApi.getSession(id).then(res => {
    if (res.ok) {
      Storage.setLabSession(res.data.data.session);
      Storage.setExperiment(exp);
      Router.graph();
    }
  });
}

function resumeSession(btn) {
  const id  = btn.dataset.id;
  const exp = btn.dataset.exp;
  ExperimentApi.getSession(id).then(res => {
    if (res.ok) {
      Storage.setLabSession(res.data.data.session);
      Storage.setExperiment(exp);
      Router.lab();
    }
  });
}

function expIcon(name) {
  return { pendulum:'🔵', hookes:'🟢', moments:'🟡' }[name] || '⚗️';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB',
    { day:'2-digit', month:'short', year:'numeric' });
}
