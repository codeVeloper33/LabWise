/* ============================================================
   LabWise — dashboard.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  if (!Storage.requireAuth()) return;

  const user = Storage.getUser();
  if (!user) return;

  /* ── Greeting ── */
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  setText('greeting',     `${greet}, ${user.username} 👋`);
  setText('greeting-sub', "Here's what's happening in your lab today.");
  setText('stat-tier',    tierLabel(user.tier || 'free'));

  /* Avatar initial */
  const avatar = document.getElementById('topbar-avatar');
  if (avatar) avatar.textContent = (user.username || 'U').charAt(0).toUpperCase();

  /* ── Load experiments + sessions in parallel ── */
  const [expRes, sessRes] = await Promise.all([
    ExperimentApi.listExperiments(),
    ExperimentApi.listSessions(),
  ]);

  /* ── Stats ── */
  const sessions   = sessRes.ok ? (sessRes.data.data.sessions || []) : [];
  const completed  = sessions.filter(s => s.status === 'completed').length;
  const inProgress = sessions.filter(s => s.status === 'in_progress').length;
  setText('stat-total',       sessions.length);
  setText('stat-completed',   completed);
  setText('stat-in-progress', inProgress);

  /* ── Recent sessions (max 3) ── */
  const recentGrid  = document.getElementById('recent-grid');
  const recentEmpty = document.getElementById('recent-empty');
  const recent = sessions.slice(0, 3);

  if (recent.length === 0) {
    if (recentEmpty) recentEmpty.classList.remove('hidden');
  } else {
    if (recentEmpty) recentEmpty.classList.add('hidden');
    recent.forEach(s => {
      const card = document.createElement('div');
      card.className = 'recent-card';
      card.innerHTML = `
        <div class="recent-card-icon ${s.experiment_name}">
          ${expIcon(s.experiment_name)}
        </div>
        <div class="recent-card-title">${s.experiment_title || s.experiment_name}</div>
        <div class="recent-card-meta">${formatDate(s.created_at)}</div>
        <span class="status-pill ${s.status}">
          ${s.status === 'completed' ? '✅ Completed' : '🔄 In Progress'}
        </span>
      `;
      card.addEventListener('click', () => {
        if (s.status === 'completed') {
          Storage.setLabSession(s);
          Storage.setExperiment(s.experiment_name);
          Router.graph();
        } else {
          Storage.setLabSession(s);
          Storage.setExperiment(s.experiment_name);
          Router.lab();
        }
      });
      recentGrid?.appendChild(card);
    });
  }

  /* ── Available experiments grid ── */
  if (expRes.ok) {
    const experiments = expRes.data.data.experiments || [];
    const tierInfo    = expRes.data.data.tier_info || {};
    buildAvailableGrid(experiments, tierInfo);
  }
});

function buildAvailableGrid(experiments, tierInfo) {
  const grid = document.getElementById('available-grid');
  if (!grid) return;

  const descs = {
    pendulum: 'Determine g by timing pendulum oscillations across multiple lengths.',
    hookes:   'Find spring constant k by loading a spring with increasing masses.',
    moments:  'Verify that clockwise and anticlockwise moments balance.',
  };
  const headers = { pendulum: 'pendulum-bg', hookes: 'hookes-bg', moments: 'moments-bg' };
  const icons   = { pendulum: '🔵', hookes: '🟢', moments: '🟡' };
  const formulas= { pendulum: 'g = 4π²L/T²', hookes: 'k = F/x', moments: 'F₁d₁=F₂d₂' };

  experiments.forEach(exp => {
    const accessible = tierInfo.experiments?.includes(exp.name);
    const card = document.createElement('div');
    card.className = `available-card${accessible ? '' : ' locked'}`;
    card.innerHTML = `
      <div class="available-card-header ${headers[exp.name]}">
        ${icons[exp.name]}
        ${!accessible ? '<div class="lock-overlay">🔒</div>' : ''}
      </div>
      <div class="available-card-body">
        <h4>${exp.title}</h4>
        <p>${descs[exp.name]}</p>
        <div class="available-card-footer">
          <span class="tier-tag ${accessible ? 'tier-free' : 'tier-paid'}">
            ${accessible ? 'Available' : 'Upgrade needed'}
          </span>
          <span style="font-size:11px;font-family:var(--font-mono);
                       color:var(--cyan);">${formulas[exp.name]}</span>
        </div>
      </div>
    `;
    if (accessible) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => Router.createExperiment());
    }
    grid.appendChild(card);
  });
}

/* ── Helpers ── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}
function expIcon(name) {
  return { pendulum: '🔵', hookes: '🟢', moments: '🟡' }[name] || '⚗️';
}
function tierLabel(tier) {
  return { free: 'Free', tier1: 'Tier 1', tier2: 'Tier 2', tier3: 'Tier 3' }[tier] || 'Free';
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
